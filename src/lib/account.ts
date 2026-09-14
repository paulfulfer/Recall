import { collection, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { deleteObject, listAll, ref } from 'firebase/storage';

import { db, storage } from '@/lib/firebase';

async function deleteAllDocsIn(path: string): Promise<void> {
  const snap = await getDocs(collection(db, path));
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}

async function deleteAllFilesIn(path: string): Promise<void> {
  const listing = await listAll(ref(storage, path));
  await Promise.all(listing.items.map((item) => deleteObject(item)));
}

// Spec section 5 screen 9: deleting the account must not leave orphaned data behind under
// a uid nobody can ever sign back in as (security rules require auth.uid === uid, so this
// has to run while still authenticated, before the Auth user itself is deleted).
export async function deleteAllUserData(uid: string): Promise<void> {
  await Promise.all([
    deleteAllDocsIn(`users/${uid}/captures`),
    deleteAllDocsIn(`users/${uid}/people`),
    deleteDoc(doc(db, 'users', uid, 'settings', 'preferences')),
    deleteAllFilesIn(`users/${uid}/audio`),
    deleteAllFilesIn(`users/${uid}/photos`),
  ]);
}
