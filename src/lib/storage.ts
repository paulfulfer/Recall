import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

import { storage } from "@/lib/firebase";

// Works for both a native file:// URI and a web blob: URI — fetch() understands both,
// and Firebase's uploadBytes accepts the resulting Blob directly.
export async function uploadCaptureAudio(
  uid: string,
  captureId: string,
  localUri: string,
  extension: string,
  contentType: string,
): Promise<{ audioUrl: string; audioPath: string }> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const audioPath = `users/${uid}/audio/${captureId}.${extension}`;
  const storageRef = ref(storage, audioPath);
  await uploadBytes(storageRef, blob, { contentType });
  const audioUrl = await getDownloadURL(storageRef);
  return { audioUrl, audioPath };
}

// Spec section 2: photos live at users/{uid}/photos/{personId}.jpg.
export async function uploadPersonPhoto(uid: string, personId: string, localUri: string): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const storageRef = ref(storage, `users/${uid}/photos/${personId}.jpg`);
  await uploadBytes(storageRef, blob, { contentType: "image/jpeg" });
  return getDownloadURL(storageRef);
}
