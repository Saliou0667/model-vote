import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

Object.entries(firebaseConfig).forEach(([key, value]) => {
  if (!value) {
    throw new Error(`Missing Firebase config value: ${key}`);
  }
});

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);

const shouldUseEmulators = import.meta.env.VITE_USE_EMULATORS === "true";

if (typeof window !== "undefined" && shouldUseEmulators) {
  const marker = "__MODEL_EMULATORS_CONNECTED__";
  const windowWithMarker = window as unknown as Record<string, unknown>;

  if (!windowWithMarker[marker]) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    connectFunctionsEmulator(functions, "127.0.0.1", 5001);
    windowWithMarker[marker] = true;
  }
}

export { app };
