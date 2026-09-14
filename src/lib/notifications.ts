import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Person } from '@/types/models';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const NOTIFICATION_HOUR = 9;

// Spec section 10: request notification permission with a clear explanation. There's no
// custom pre-permission screen here — same pattern as location/calendar elsewhere in this
// app, where the OS-level prompt (and, on Android, the channel name below) carries the
// explanation rather than a bespoke in-app dialog.
export async function ensureNotificationPermission(): Promise<boolean> {
  // expo-notifications has no web implementation for permissions/scheduling — local
  // notifications are a native-only concept here, so treat web as always ungranted.
  if (Platform.OS === 'web') return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Birthday reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  const { status } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return status === 'granted';
}

// Computed against a fixed leap year (2024) so a Feb 29 birthday's lead date still lands
// on a real day — only the resulting month/day feed the yearly trigger, the year is unused.
function monthDayOffset(mmdd: string, offsetDays: number): { month: number; day: number } {
  const [month, day] = mmdd.split('-').map(Number);
  const ref = new Date(2024, month - 1, day);
  ref.setDate(ref.getDate() - offsetDays);
  return { month: ref.getMonth(), day: ref.getDate() };
}

// Spec section 10: two notifications per person per year (a configurable lead time before
// the birthday, and one on the day itself), rescheduled on app launch and whenever a
// birthday or the lead-time preference changes. Uses YEARLY triggers so the OS handles the
// annual recurrence natively — a full cancel-and-reschedule pass keeps this correct on every
// call without needing to diff against what was previously scheduled.
export async function syncBirthdayNotifications(people: Person[], leadDays: number): Promise<void> {
  // See ensureNotificationPermission — every Notifications scheduling call below is
  // native-only, so there's nothing to do on web at all.
  if (Platform.OS === 'web') return;

  const granted = await ensureNotificationPermission();
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!granted) return;

  for (const person of people) {
    if (!person.birthday) continue;

    const onDay = monthDayOffset(person.birthday, 0);
    await Notifications.scheduleNotificationAsync({
      identifier: `birthday-day-${person.id}`,
      content: {
        title: `${person.name}'s birthday is today`,
        body: 'Reach out and say happy birthday.',
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.YEARLY,
        month: onDay.month,
        day: onDay.day,
        hour: NOTIFICATION_HOUR,
        minute: 0,
      },
    });

    if (leadDays > 0) {
      const lead = monthDayOffset(person.birthday, leadDays);
      await Notifications.scheduleNotificationAsync({
        identifier: `birthday-lead-${person.id}`,
        content: {
          title: `${person.name}'s birthday is in ${leadDays} day${leadDays === 1 ? '' : 's'}`,
          body: 'Plenty of time to plan something.',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.YEARLY,
          month: lead.month,
          day: lead.day,
          hour: NOTIFICATION_HOUR,
          minute: 0,
        },
      });
    }
  }
}
