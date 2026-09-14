import { httpsCallable } from "firebase/functions";
import {
  requestRecordingPermissionsAsync,
  RecordingPresets,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import { useCallback, useRef, useState } from "react";
import { Platform } from "react-native";

import { captureAnchors } from "@/lib/anchors";
import { createCapture, updateCapture } from "@/lib/captures";
import { functions } from "@/lib/firebase";
import { uploadCaptureAudio } from "@/lib/storage";
import type { CaptureExtracted } from "@/types/models";

const MAX_RECORDING_MS = 60_000;

// expo-audio's web layer records via MediaRecorder/getUserMedia — real browser mic access,
// not a stub — so this only needs to catch genuinely unsupported browsers (no
// navigator.mediaDevices at all, e.g. very old browsers or a non-secure/HTTP origin).
// Permission denial on a supported browser is handled separately by the existing
// error-stage flow below, same as a mobile permission denial.
const canRecordOnThisPlatform =
  Platform.OS !== "web" ||
  (typeof navigator !== "undefined" && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia));

export type CaptureStage =
  | "idle"
  | "recording"
  | "uploading"
  | "transcribing"
  | "extracting"
  | "ready"
  | "error";

interface TranscribeCaptureResponse {
  transcript: string;
}

const transcribeCaptureCallable = httpsCallable<
  { captureId: string; audioPath: string; mimeType: string },
  TranscribeCaptureResponse
>(functions, "transcribeCapture");

const extractCaptureCallable = httpsCallable<
  { captureId: string; transcript: string },
  CaptureExtracted
>(functions, "extractCapture");

// Spec section 4 steps 4-6 / step 8: this hook owns the pipeline up through extraction —
// record or type, transcribe (voice only), extract — and hands the result to the
// confirm/edit screen (step 6), which is the only thing allowed to commit a Person.
export function useCaptureRecorder(uid: string) {
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const recorderState = useAudioRecorderState(recorder, 100);
  const [stage, setStage] = useState<CaptureStage>("idle");
  const [captureId, setCaptureId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string>("");
  const [extracted, setExtracted] = useState<CaptureExtracted | null>(null);
  const [error, setError] = useState<string | null>(null);
  const autoStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAutoStop = useCallback(() => {
    if (autoStopTimer.current) {
      clearTimeout(autoStopTimer.current);
      autoStopTimer.current = null;
    }
  }, []);

  // Set once the audio upload succeeds, so a transcription failure can be retried without
  // re-recording — the audio and its anchors are already safe in Storage/Firestore at that
  // point (spec section 4 step 4 / phase 15's "shouldn't lose audio or anchors").
  const audioPathRef = useRef<string | null>(null);
  const mimeTypeRef = useRef<string | null>(null);

  const runExtraction = useCallback(async (id: string, text: string) => {
    setStage("extracting");
    const result = await extractCaptureCallable({ captureId: id, transcript: text });
    setExtracted(result.data);
    setStage("ready");
  }, []);

  const transcribeAndExtract = useCallback(
    async (id: string, audioPath: string, mimeType: string) => {
      setStage("transcribing");
      const transcribed = await transcribeCaptureCallable({ captureId: id, audioPath, mimeType });
      setTranscript(transcribed.data.transcript);
      await runExtraction(id, transcribed.data.transcript);
    },
    [runExtraction],
  );

  const finishRecording = useCallback(async () => {
    clearAutoStop();
    if (!recorder.isRecording) return;
    await recorder.stop();
    const uri = recorder.uri;
    if (!uri) {
      setError("Recording failed — no audio captured.");
      setStage("error");
      return;
    }

    setStage("uploading");
    try {
      const anchors = await captureAnchors();
      const capture = await createCapture(uid, {
        personId: null,
        transcript: "",
        extracted: { facts: [], dates: [] },
        anchors,
      });
      setCaptureId(capture.id);

      const extension = Platform.OS === "web" ? "webm" : "m4a";
      const mimeType = Platform.OS === "web" ? "audio/webm" : "audio/mp4";
      const { audioUrl, audioPath } = await uploadCaptureAudio(uid, capture.id, uri, extension, mimeType);
      await updateCapture(uid, capture.id, { audioUrl });
      audioPathRef.current = audioPath;
      mimeTypeRef.current = mimeType;

      await transcribeAndExtract(capture.id, audioPath, mimeType);
    } catch (err) {
      console.error("[capture-pipeline] failed", err);
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStage("error");
    }
  }, [clearAutoStop, recorder, transcribeAndExtract, uid]);

  // Resumes from wherever the pipeline stopped rather than starting over: retries
  // transcription if the audio never got transcribed, or just extraction if a transcript
  // already exists (voice or typed) but extraction failed.
  const retry = useCallback(async () => {
    if (!captureId) return;
    setError(null);
    try {
      if (!transcript && audioPathRef.current && mimeTypeRef.current) {
        await transcribeAndExtract(captureId, audioPathRef.current, mimeTypeRef.current);
      } else {
        await runExtraction(captureId, transcript);
      }
    } catch (err) {
      console.error("[capture-pipeline] retry failed", err);
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStage("error");
    }
  }, [captureId, transcript, transcribeAndExtract, runExtraction]);

  const startRecording = useCallback(async () => {
    setError(null);
    setExtracted(null);
    setTranscript("");
    setCaptureId(null);
    audioPathRef.current = null;
    mimeTypeRef.current = null;

    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) {
      setError("Microphone permission is required to record.");
      setStage("error");
      return;
    }

    await recorder.prepareToRecordAsync();
    recorder.record();
    setStage("recording");
    autoStopTimer.current = setTimeout(finishRecording, MAX_RECORDING_MS);
  }, [finishRecording, recorder]);

  const stopRecording = useCallback(() => {
    void finishRecording();
  }, [finishRecording]);

  // Spec section 4 step 8: typed fallback skips recording/upload/transcription entirely
  // and goes straight to extraction.
  const submitTypedCapture = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      setError(null);
      setExtracted(null);
      setCaptureId(null);
      setTranscript(trimmed);
      audioPathRef.current = null;
      mimeTypeRef.current = null;
      setStage("uploading");
      try {
        const anchors = await captureAnchors();
        const capture = await createCapture(uid, {
          personId: null,
          transcript: trimmed,
          extracted: { facts: [], dates: [] },
          anchors,
        });
        setCaptureId(capture.id);
        await runExtraction(capture.id, trimmed);
      } catch (err) {
        console.error("[capture-pipeline] typed capture failed", err);
        setError(err instanceof Error ? err.message : "Something went wrong.");
        setStage("error");
      }
    },
    [runExtraction, uid],
  );

  const reset = useCallback(() => {
    setStage("idle");
    setCaptureId(null);
    setTranscript("");
    setExtracted(null);
    setError(null);
    audioPathRef.current = null;
    mimeTypeRef.current = null;
  }, []);

  return {
    stage,
    captureId,
    transcript,
    extracted,
    error,
    canRetry: stage === "error" && captureId !== null,
    retry,
    isRecording: recorderState.isRecording,
    durationMillis: recorderState.durationMillis,
    metering: recorderState.metering,
    canRecord: canRecordOnThisPlatform,
    startRecording,
    stopRecording,
    submitTypedCapture,
    reset,
  };
}
