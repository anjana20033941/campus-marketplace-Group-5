import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, initializeAuth, inMemoryPersistence } from "firebase/auth";
// @ts-ignore
import { getReactNativePersistence } from "firebase/auth";
import { collection, doc, getFirestore, initializeFirestore } from "firebase/firestore";
import { Platform } from "react-native";
import safeStorage from "./utils/safeStorage";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const firebaseConfigured = Object.values(firebaseConfig).every(Boolean);
export const firebaseApp = firebaseConfigured
  ? getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  : null;

function createFirebaseAuth() {
  if (!firebaseApp) return null;
  if (Platform.OS === "web") {
    return getAuth(firebaseApp);
  }
  try {
    return initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(safeStorage),
    });
  } catch {
    try {
      return initializeAuth(firebaseApp, {
        persistence: inMemoryPersistence,
      });
    } catch {
      return getAuth(firebaseApp);
    }
  }
}

function createFirebaseFirestore() {
  if (!firebaseApp) return null;
  if (Platform.OS === "web") {
    return getFirestore(firebaseApp);
  }
  try {
    return initializeFirestore(firebaseApp, {
      experimentalAutoDetectLongPolling: true,
    });
  } catch {
    return getFirestore(firebaseApp);
  }
}

export const auth = createFirebaseAuth();
export const db = createFirebaseFirestore();
export const listingsCollection = db ? collection(db, "listings") : null;
export const usersCollection = db ? collection(db, "users") : null;
export const listingDocument = (id: string) =>
  db ? doc(db, "listings", id) : null;

