import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteField,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  type FieldValue,
  type Unsubscribe,
} from 'firebase/firestore';

import { db } from '@/lib/firebase';
import type { Person } from '@/types/models';

// uid is always passed explicitly rather than read from the current auth session,
// so these functions stay easy to call from anywhere (and to test) without hidden
// dependencies on auth state.

function peopleCollection(uid: string) {
  return collection(db, 'users', uid, 'people');
}

function personDoc(uid: string, personId: string) {
  return doc(db, 'users', uid, 'people', personId);
}

export type NewPerson = Omit<Person, 'id' | 'createdAt' | 'updatedAt'>;

export async function createPerson(uid: string, input: NewPerson): Promise<Person> {
  const ref = doc(peopleCollection(uid));
  const now = new Date().toISOString();
  const person: Person = { ...input, id: ref.id, createdAt: now, updatedAt: now };
  await setDoc(ref, person);
  return person;
}

export async function getPerson(uid: string, personId: string): Promise<Person | null> {
  const snap = await getDoc(personDoc(uid, personId));
  return snap.exists() ? (snap.data() as Person) : null;
}

export async function listPeople(uid: string): Promise<Person[]> {
  const snap = await getDocs(query(peopleCollection(uid), orderBy('name')));
  return snap.docs.map((d) => d.data() as Person);
}

export function subscribeToPeople(uid: string, onChange: (people: Person[]) => void): Unsubscribe {
  return onSnapshot(query(peopleCollection(uid), orderBy('name')), (snap) => {
    onChange(snap.docs.map((d) => d.data() as Person));
  });
}

export function subscribeToPerson(
  uid: string,
  personId: string,
  onChange: (person: Person | null) => void,
): Unsubscribe {
  return onSnapshot(personDoc(uid, personId), (snap) => {
    onChange(snap.exists() ? (snap.data() as Person) : null);
  });
}

export async function updatePerson(
  uid: string,
  personId: string,
  patch: Partial<Omit<Person, 'id' | 'createdAt'>>,
): Promise<void> {
  await updateDoc(personDoc(uid, personId), { ...patch, updatedAt: new Date().toISOString() });
}

export async function deletePerson(uid: string, personId: string): Promise<void> {
  await deleteDoc(personDoc(uid, personId));
}

type OptionalTextField = 'phone' | 'email' | 'instagram' | 'linkedin' | 'birthday' | 'giftIdeas';

// The add/edit screen must be able to clear a previously-set optional field back to
// empty, which a plain updateDoc patch can't express (Firestore rejects `undefined`
// values) — an empty input here removes the field with deleteField() instead.
export async function savePersonOptionalFields(
  uid: string,
  personId: string,
  fields: Partial<Record<OptionalTextField, string>>,
): Promise<void> {
  const patch: Record<string, string | FieldValue> = { updatedAt: new Date().toISOString() };
  for (const [key, value] of Object.entries(fields)) {
    patch[key] = value && value.trim() ? value.trim() : deleteField();
  }
  await updateDoc(personDoc(uid, personId), patch);
}

// Array fields need arrayUnion rather than a plain patch through updatePerson,
// which would replace the whole array instead of appending to it.

export async function addPersonNote(
  uid: string,
  personId: string,
  note: { date: string; text: string },
): Promise<void> {
  await updateDoc(personDoc(uid, personId), {
    notes: arrayUnion(note),
    lastContacted: note.date,
    updatedAt: new Date().toISOString(),
  });
}

export async function addPersonFacts(uid: string, personId: string, facts: string[]): Promise<void> {
  if (facts.length === 0) return;
  await updateDoc(personDoc(uid, personId), {
    facts: arrayUnion(...facts),
    updatedAt: new Date().toISOString(),
  });
}

export async function removePersonFact(uid: string, personId: string, fact: string): Promise<void> {
  await updateDoc(personDoc(uid, personId), {
    facts: arrayRemove(fact),
    updatedAt: new Date().toISOString(),
  });
}

export async function removePersonNote(
  uid: string,
  personId: string,
  note: { date: string; text: string },
): Promise<void> {
  await updateDoc(personDoc(uid, personId), {
    notes: arrayRemove(note),
    updatedAt: new Date().toISOString(),
  });
}

// Spec section 4 step 7: keyword-only matching (no fuzzy/vector search) is enough at
// personal scale — surfaces candidates for the confirm screen's "attach to existing" suggestion.
export function matchPeopleByName(people: Person[], name: string): Person[] {
  const needle = name.trim().toLowerCase();
  if (!needle) return [];
  return people.filter((p) => p.name.trim().toLowerCase().includes(needle));
}

export async function addPersonImportantDate(
  uid: string,
  personId: string,
  importantDate: { label: string; date: string },
): Promise<void> {
  await updateDoc(personDoc(uid, personId), {
    importantDates: arrayUnion(importantDate),
    updatedAt: new Date().toISOString(),
  });
}
