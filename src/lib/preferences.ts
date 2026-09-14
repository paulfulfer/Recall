import { doc, getDoc, onSnapshot, setDoc, type Unsubscribe } from 'firebase/firestore';

import { db } from '@/lib/firebase';

// Spec section 10: configurable notification lead time, default 7 days. Lives in its own
// doc (not the bare users/{uid} doc, which nothing else writes to) so Settings (phase 14)
// has a natural place to read/edit it.
export interface UserPreferences {
  notificationLeadDays: number;
}

const DEFAULT_PREFERENCES: UserPreferences = { notificationLeadDays: 7 };

function preferencesDoc(uid: string) {
  return doc(db, 'users', uid, 'settings', 'preferences');
}

export async function getPreferences(uid: string): Promise<UserPreferences> {
  const snap = await getDoc(preferencesDoc(uid));
  return snap.exists() ? { ...DEFAULT_PREFERENCES, ...snap.data() } : DEFAULT_PREFERENCES;
}

export function subscribeToPreferences(
  uid: string,
  onChange: (prefs: UserPreferences) => void,
): Unsubscribe {
  return onSnapshot(preferencesDoc(uid), (snap) => {
    onChange(snap.exists() ? { ...DEFAULT_PREFERENCES, ...snap.data() } : DEFAULT_PREFERENCES);
  });
}

export async function updatePreferences(uid: string, patch: Partial<UserPreferences>): Promise<void> {
  await setDoc(preferencesDoc(uid), patch, { merge: true });
}
