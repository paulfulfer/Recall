import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import type { Capture } from '@/types/models';

function capturesCollection(uid: string) {
  return collection(db, 'users', uid, 'captures');
}

function captureDoc(uid: string, captureId: string) {
  return doc(db, 'users', uid, 'captures', captureId);
}

export type NewCapture = Omit<Capture, 'id' | 'createdAt'>;

export async function createCapture(uid: string, input: NewCapture): Promise<Capture> {
  const ref = doc(capturesCollection(uid));
  const capture: Capture = { ...input, id: ref.id, createdAt: new Date().toISOString() };
  await setDoc(ref, capture);
  return capture;
}

export async function getCapture(uid: string, captureId: string): Promise<Capture | null> {
  const snap = await getDoc(captureDoc(uid, captureId));
  return snap.exists() ? (snap.data() as Capture) : null;
}

export async function updateCapture(
  uid: string,
  captureId: string,
  patch: Partial<Omit<Capture, 'id' | 'createdAt'>>,
): Promise<void> {
  await updateDoc(captureDoc(uid, captureId), patch);
}

export async function deleteCapture(uid: string, captureId: string): Promise<void> {
  await deleteDoc(captureDoc(uid, captureId));
}

export async function listCapturesForPerson(uid: string, personId: string): Promise<Capture[]> {
  const snap = await getDocs(
    query(capturesCollection(uid), where('personId', '==', personId), orderBy('createdAt', 'desc')),
  );
  return snap.docs.map((d) => d.data() as Capture);
}

export function subscribeToCapturesForPerson(
  uid: string,
  personId: string,
  onChange: (captures: Capture[]) => void,
): Unsubscribe {
  return onSnapshot(
    query(capturesCollection(uid), where('personId', '==', personId), orderBy('createdAt', 'desc')),
    (snap) => onChange(snap.docs.map((d) => d.data() as Capture)),
  );
}

// Spec section 8: search runs client-side over the full capture set — personal-scale
// data makes a plain cached subscription sufficient, no search service needed.
export function subscribeToCaptures(uid: string, onChange: (captures: Capture[]) => void): Unsubscribe {
  return onSnapshot(query(capturesCollection(uid), orderBy('createdAt', 'desc')), (snap) =>
    onChange(snap.docs.map((d) => d.data() as Capture)),
  );
}

export async function listOrphanCaptures(uid: string): Promise<Capture[]> {
  const snap = await getDocs(
    query(capturesCollection(uid), where('personId', '==', null), orderBy('createdAt', 'desc')),
  );
  return snap.docs.map((d) => d.data() as Capture);
}

export function subscribeToOrphanCaptures(uid: string, onChange: (captures: Capture[]) => void): Unsubscribe {
  return onSnapshot(
    query(capturesCollection(uid), where('personId', '==', null), orderBy('createdAt', 'desc')),
    (snap) => onChange(snap.docs.map((d) => d.data() as Capture)),
  );
}

// Section 9: merging an orphan moves personId from null to the real person's ID;
// transcript, facts, and anchors carry over unchanged.
export async function attachCaptureToPerson(uid: string, captureId: string, personId: string): Promise<void> {
  await updateDoc(captureDoc(uid, captureId), { personId });
}
