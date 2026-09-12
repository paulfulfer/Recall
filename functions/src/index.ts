import { GoogleGenAI, Type } from "@google/genai";
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

// General-purpose model for the text-in/JSON-out extraction job in spec section 4 step 5 —
// no audio involved here, so the dedicated transcribe model doesn't apply.
const EXTRACT_MODEL = "gemini-3.6-flash";

// Closed set from spec section 3 — keep in sync with src/constants/categories.ts. Given to
// the extraction prompt so Gemini picks from this list rather than inventing categories.
const CATEGORIES = ["Work", "School", "Family", "Friends", "Acquaintances"] as const;

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

interface ExtractCaptureRequest {
  captureId: string;
  transcript: string;
}

interface ExtractedCapture {
  name?: string;
  category?: (typeof CATEGORIES)[number];
  facts: string[];
  dates: { label: string; date: string }[];
}

const EXTRACTION_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "The person's name, if mentioned. Omit if not mentioned." },
    category: { type: Type.STRING, enum: [...CATEGORIES] },
    facts: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Discrete, standalone facts worth remembering about this person.",
    },
    dates: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          label: { type: Type.STRING, description: 'e.g. "Birthday", "Anniversary", "Wedding"' },
          date: { type: Type.STRING, description: "MM-DD, or YYYY-MM-DD if a year was mentioned" },
        },
        required: ["label", "date"],
      },
    },
  },
  required: ["facts", "dates"],
};

const EXTRACTION_PROMPT = `You are extracting structured information from a verbatim transcript of someone talking about a person they just met or want to remember. Extract:
- name: the person's name, if mentioned.
- category: pick the single best fit from this closed list based on context — ${CATEGORIES.join(", ")}. Omit if genuinely unclear.
- facts: a list of short, discrete, standalone facts worth remembering (e.g. "Works at Acme as a designer", "Has two kids", "Loves hiking"). Split compound statements into separate facts.
- dates: any specific dates mentioned (birthdays, anniversaries, etc.) with a short label.

If the transcript is empty, silent, or contains nothing usable, return empty facts and dates and omit name/category.

Transcript:
"""
{{TRANSCRIPT}}
"""`;

// Build phase 8 (spec section 4, step 5): text-in/JSON-out extraction, called after
// transcription for voice captures or directly for typed captures (spec section 4 step 8),
// which skip transcription entirely. Never writes to a Person document itself — the client's
// confirm/edit screen (step 6) is the only thing allowed to do that.
export const extractCapture = onCall<ExtractCaptureRequest>(
  { secrets: [GEMINI_API_KEY] },
  async (request): Promise<ExtractedCapture> => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }
    const uid = request.auth.uid;
    const { captureId, transcript } = request.data;

    if (!captureId || typeof transcript !== "string") {
      throw new HttpsError("invalid-argument", "captureId and transcript are required.");
    }

    let extracted: ExtractedCapture = { facts: [], dates: [] };
    if (transcript.trim().length > 0) {
      try {
        const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY.value() });
        const response = await ai.models.generateContent({
          model: EXTRACT_MODEL,
          contents: EXTRACTION_PROMPT.replace("{{TRANSCRIPT}}", transcript),
          config: {
            responseMimeType: "application/json",
            responseSchema: EXTRACTION_RESPONSE_SCHEMA,
          },
        });
        const parsed = JSON.parse(response.text ?? "{}");
        const name = typeof parsed.name === "string" ? parsed.name.trim() : "";
        const category = CATEGORIES.includes(parsed.category) ? parsed.category : undefined;
        extracted = {
          // Firestore rejects `undefined` field values outright — omit these keys
          // entirely rather than setting them to undefined when nothing was extracted.
          ...(name ? { name } : {}),
          ...(category ? { category } : {}),
          facts: Array.isArray(parsed.facts) ? parsed.facts.filter((f: unknown) => typeof f === "string") : [],
          dates: Array.isArray(parsed.dates)
            ? parsed.dates.filter(
                (d: unknown): d is { label: string; date: string } =>
                  !!d && typeof d === "object" && typeof (d as any).label === "string" && typeof (d as any).date === "string",
              )
            : [],
        };
      } catch (err) {
        logger.error("extractCapture: Gemini call failed", {
          captureId,
          errMessage: err instanceof Error ? err.message : String(err),
          errStatus: err && typeof err === "object" && "status" in err ? (err as { status: unknown }).status : undefined,
        });
        throw new HttpsError("internal", "Extraction failed.");
      }
    }

    await getFirestore().doc(`users/${uid}/captures/${captureId}`).update({ extracted });

    logger.info("extractCapture ok", { uid, captureId, factCount: extracted.facts.length });
    return extracted;
  },
);
