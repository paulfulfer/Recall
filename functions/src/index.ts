import { GoogleGenAI } from "@google/genai";
import { initializeApp } from "firebase-admin/app";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions/v2";

initializeApp();

// The Gemini API key lives only here, as a Secret Manager-backed Functions secret —
// never in client code or committed to the repo. Set with:
//   npx firebase functions:secrets:set GEMINI_API_KEY
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

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
