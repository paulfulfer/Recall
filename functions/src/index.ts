import { GoogleGenAI } from "@google/genai";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions/v2";

initializeApp();

// The Gemini API key lives only here, as a Secret Manager-backed Functions secret —
// never in client code or committed to the repo. Set with:
//   npx firebase functions:secrets:set GEMINI_API_KEY
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

// Purpose-built speech-to-text model (Google, Aug 2026) — better fit than a general
// multimodal "flash" model for the verbatim-transcript job in spec section 4 step 4.
const TRANSCRIBE_MODEL = "gemini-3.5-transcribe";

// Build-phase-6 smoke test: confirms billing (Blaze), the secret is wired up, and the
// deployed function can actually reach Gemini — before any real transcribe/extract logic
// gets built on top of this in phases 7-8. Deliberately does the cheapest possible call
// (list models) rather than generating content.
export const testGeminiConnection = onCall(
  { secrets: [GEMINI_API_KEY] },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }

    try {
      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY.value() });
      const pager = await ai.models.list();
      let modelCount = 0;
      for await (const _model of pager) {
        modelCount += 1;
      }
      logger.info("testGeminiConnection ok", { uid: request.auth.uid, modelCount });
      return { ok: true, modelCount };
    } catch (err) {
      logger.error("testGeminiConnection failed", err);
      throw new HttpsError("internal", "Could not reach Gemini.");
    }
  },
);

interface TranscribeCaptureRequest {
  captureId: string;
  audioPath: string;
  mimeType: string;
}

interface TranscribeCaptureResponse {
  transcript: string;
}

// Build phase 7 (spec section 4, step 4): downloads the just-uploaded audio straight from
// Storage (never the public download URL — this runs with admin access), sends it to Gemini
// for a verbatim transcript, and saves that transcript to the capture doc right away so it's
// never lost even if extraction (phase 8) fails later.
export const transcribeCapture = onCall<TranscribeCaptureRequest>(
  { secrets: [GEMINI_API_KEY] },
  async (request): Promise<TranscribeCaptureResponse> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }
    const uid = request.auth.uid;
    const { captureId, audioPath, mimeType } = request.data;

    if (!captureId || !audioPath || !mimeType) {
      throw new HttpsError(
        "invalid-argument",
        "captureId, audioPath, and mimeType are required.",
      );
    }
    // Defense in depth: the security rules already scope Storage/Firestore to the caller's
    // own uid, but double-check here since the path is client-supplied.
    if (!audioPath.startsWith(`users/${uid}/audio/`)) {
      throw new HttpsError("permission-denied", "Not allowed.");
    }

    let audioBytes: Buffer;
    try {
      [audioBytes] = await getStorage().bucket().file(audioPath).download();
    } catch (err) {
      logger.error("transcribeCapture: audio download failed", { captureId, err });
      throw new HttpsError("not-found", "Could not read the uploaded audio.");
    }

    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY.value() });
    let transcript: string;
    let uploadedFileName: string | undefined;
    try {
      // gemini-3.5-transcribe takes a Files API reference rather than inline base64 data.
      const blob = new Blob([audioBytes], { type: mimeType });
      const file = await ai.files.upload({ file: blob, config: { mimeType } });
      uploadedFileName = file.name;

      // Short clips (<=60s) process almost immediately, but the Files API is async —
      // wait for ACTIVE before referencing the file in a generation request.
      let activeFile = file;
      for (let attempt = 0; activeFile.state === "PROCESSING" && attempt < 10; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        activeFile = await ai.files.get({ name: file.name! });
      }
      if (activeFile.state !== "ACTIVE") {
        throw new Error(`Uploaded file did not become active (state: ${activeFile.state}).`);
      }

      const interaction = await ai.interactions.create({
        model: TRANSCRIBE_MODEL,
        input: [{ type: "audio", uri: activeFile.uri!, mime_type: mimeType }],
      });
      transcript = interaction.output_text?.trim() ?? "";
    } catch (err) {
      logger.error("transcribeCapture: Gemini call failed", { captureId, err });
      throw new HttpsError("internal", "Transcription failed.");
    } finally {
      if (uploadedFileName) {
        await ai.files.delete({ name: uploadedFileName }).catch((err) => {
          logger.warn("transcribeCapture: failed to clean up uploaded file", { captureId, err });
        });
      }
    }

    await getFirestore().doc(`users/${uid}/captures/${captureId}`).update({ transcript });

    logger.info("transcribeCapture ok", { uid, captureId, transcriptLength: transcript.length });
    return { transcript };
  },
);
