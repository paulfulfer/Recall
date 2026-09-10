import AsyncStorage from "@react-native-async-storage/async-storage";
import { type FirebaseApp, getApps, initializeApp } from "firebase/app";
import { type Auth, getAuth, initializeAuth } from "firebase/auth";
// @ts-expect-error -- getReactNativePersistence resolves fine at runtime on native (Metro
// follows the "react-native" field in @firebase/auth's package.json) but isn't exposed in the
// umbrella "firebase" package's type exports, which don't vary by platform. Only ever called
// below on native, never on web, where that build doesn't export it at all.
import { getReactNativePersistence } from "firebase/auth";
import {
  type Firestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { type FirebaseStorage, getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

for (const [key, value] of Object.entries(firebaseConfig)) {
  if (!value) {
    throw new Error(
      `Missing Firebase config value for "${key}". Check your .env file against .env.example.`,
    );
  }
}

export const firebaseApp: FirebaseApp = getApps().length
  ? getApps()[0]
  : initializeApp(firebaseConfig);

// Web (browser and Node SSR) bundles resolve "firebase/auth" via export conditions that
// don't include a getReactNativePersistence build, so it comes back undefined there — check
// for that directly instead of branching on Platform.OS, which reports "web" in the Node SSR
// bundle too.
export const auth: Auth =
  typeof getReactNativePersistence === "function"
    ? initializeAuth(firebaseApp, {
        persistence: getReactNativePersistence(AsyncStorage),
      })
    : getAuth(firebaseApp);

export const db: Firestore = initializeFirestore(firebaseApp, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

export const storage: FirebaseStorage = getStorage(firebaseApp);
