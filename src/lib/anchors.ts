import * as Calendar from "expo-calendar";
import * as Location from "expo-location";

import type { CaptureAnchors } from "@/types/models";

// Spec section 4 step 2 / section 9: every capture gets a timestamp regardless of
// permissions; location and calendar are best-effort and degrade silently.
export async function captureAnchors(): Promise<CaptureAnchors> {
  const timestamp = new Date().toISOString();
  const anchors: CaptureAnchors = { timestamp };

  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === "granted") {
      const position = await Location.getCurrentPositionAsync({});
      anchors.location = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
    }
  } catch {
    // best-effort
  }

  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    if (status === "granted") {
      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const now = new Date();
      const windowStart = new Date(now.getTime() - 30 * 60 * 1000);
      const windowEnd = new Date(now.getTime() + 30 * 60 * 1000);
      const events = await Calendar.getEventsAsync(
        calendars.map((c) => c.id),
        windowStart,
        windowEnd,
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
