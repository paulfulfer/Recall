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

const MAX_RECORDING_MS = 60_000;

export type CaptureStage = "idle" | "recording" | "uploading" | "transcribing" | "done" | "error";

interface TranscribeCaptureResponse {
  transcript: string;
}

const transcribeCaptureCallable = httpsCallable<
  { captureId: string; audioPath: string; mimeType: string },
  TranscribeCaptureResponse
>(functions, "transcribeCapture");

export function useCaptureRecorder(uid: string) {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 200);
  const [stage, setStage] = useState<CaptureStage>("idle");
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const autoStopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAutoStop = useCallback(() => {
    if (autoStopTimer.current) {
      clearTimeout(autoStopTimer.current);
      autoStopTimer.current = null;
    }
  }, []);

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

      const extension = Platform.OS === "web" ? "webm" : "m4a";
      const mimeType = Platform.OS === "web" ? "audio/webm" : "audio/mp4";
      const { audioUrl, audioPath } = await uploadCaptureAudio(uid, capture.id, uri, extension, mimeType);
      await updateCapture(uid, capture.id, { audioUrl });

      setStage("transcribing");
      const result = await transcribeCaptureCallable({ captureId: capture.id, audioPath, mimeType });
      setTranscript(result.data.transcript);
      setStage("done");
    } catch (err) {
      console.error("[capture-pipeline] failed", err);
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStage("error");
    }
  }, [clearAutoStop, recorder, uid]);

  const startRecording = useCallback(async () => {
    setError(null);
    setTranscript(null);

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

  return {
    stage,
    transcript,
    error,
    isRecording: recorderState.isRecording,
    durationMillis: recorderState.durationMillis,
    startRecording,
    stopRecording,
  };
}
