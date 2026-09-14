import { useEffect } from 'react';

import { syncBirthdayNotifications } from '@/lib/notifications';
import { subscribeToPeople } from '@/lib/people';
import { subscribeToPreferences } from '@/lib/preferences';
import type { Person } from '@/types/models';

// Spec section 10: reschedule on app launch and whenever a birthday or the lead-time
// preference changes. Subscribing to both collections and re-syncing on every emission
// covers all three triggers (app launch = first snapshot; edits = later snapshots) without
// separate wiring at each place a birthday can be added or edited.
export function useBirthdayNotifications(uid: string) {
  useEffect(() => {
    let people: Person[] | null = null;
    let leadDays: number | null = null;

    function trySync() {
      if (people === null || leadDays === null) return;
      syncBirthdayNotifications(people, leadDays).catch((err) => {
        console.error('[notifications] sync failed', err);
      });
    }

    const unsubPeople = subscribeToPeople(uid, (p) => {
      people = p;
      trySync();
    });
    const unsubPrefs = subscribeToPreferences(uid, (prefs) => {
      leadDays = prefs.notificationLeadDays;
      trySync();
    });

    return () => {
      unsubPeople();
      unsubPrefs();
    };
  }, [uid]);
}
