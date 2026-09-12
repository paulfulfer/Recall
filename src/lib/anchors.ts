import * as Calendar from "expo-calendar";
import * as Location from "expo-location";

import type { CaptureAnchors } from "@/types/models";

const PERMISSION_TIMEOUT_MS = 8_000;

// A permission prompt the user never answers (dismissed without a choice, or — on web —
// a browser permission popup that never resolves) leaves its promise pending forever.
// Anchors must stay best-effort per spec section 9, so race every permission-gated call
// against a timeout rather than let one hang the whole capture pipeline.
function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timed out")), PERMISSION_TIMEOUT_MS);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

// Spec section 4 step 2 / section 9: every capture gets a timestamp regardless of
// permissions; location and calendar are best-effort and degrade silently.
export async function captureAnchors(): Promise<CaptureAnchors> {
  const timestamp = new Date().toISOString();
  const anchors: CaptureAnchors = { timestamp };

  try {
    const { status } = await withTimeout(Location.requestForegroundPermissionsAsync());
    if (status === "granted") {
      const position = await withTimeout(Location.getCurrentPositionAsync({}));
      anchors.location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
    }
  } catch {
    // best-effort
  }

  try {
    const { status } = await withTimeout(Calendar.requestCalendarPermissionsAsync());
    if (status === "granted") {
      const calendars = await withTimeout(Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT));
      const now = new Date();
      const windowStart = new Date(now.getTime() - 30 * 60 * 1000);
      const windowEnd = new Date(now.getTime() + 30 * 60 * 1000);
      const events = await withTimeout(
        Calendar.getEventsAsync(
          calendars.map((c) => c.id),
          windowStart,
          windowEnd,
        ),
      );
      if (events.length > 0) {
        anchors.calendarEvent = events[0].title;
      }
    }
  } catch {
    // best-effort
  }

  return anchors;
}
