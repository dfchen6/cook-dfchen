import 'server-only';

import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// Credentials come from Application Default Credentials: automatic on App Hosting,
// `gcloud auth application-default login` locally. When FIRESTORE_EMULATOR_HOST /
// FIREBASE_AUTH_EMULATOR_HOST / FIREBASE_STORAGE_EMULATOR_HOST are set, the SDK
// talks to the local emulators instead.
function adminApp() {
  if (getApps().length) return getApp();
  return initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

// Cached on globalThis: Next.js can bundle this module into several server chunks that
// share one firebase-admin app, and Firestore#settings() may only be called once per instance.
const globalForDb = globalThis as unknown as { __cookFirestore?: Firestore };

export const adminAuth = () => getAuth(adminApp());
export const adminDb = () => {
  if (!globalForDb.__cookFirestore) {
    const db = getFirestore(adminApp());
    // Optional form fields arrive as undefined; drop them instead of throwing.
    db.settings({ ignoreUndefinedProperties: true });
    globalForDb.__cookFirestore = db;
  }
  return globalForDb.__cookFirestore;
};
export const adminBucket = () => getStorage(adminApp()).bucket();
