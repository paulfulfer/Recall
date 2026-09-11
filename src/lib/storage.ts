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
