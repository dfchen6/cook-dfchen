'use client';

import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectStorageEmulator, getStorage, type FirebaseStorage } from 'firebase/storage';
import { firebaseConfig, useEmulators } from './config';

// The browser only uses Firebase for sign-in and image uploads.
// All Firestore access happens on the server through the Admin SDK.
let auth: Auth | undefined;
let storage: FirebaseStorage | undefined;

function app() {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

export function clientAuth(): Auth {
  if (!auth) {
    auth = getAuth(app());
    if (useEmulators) connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  }
  return auth;
}

export function clientStorage(): FirebaseStorage {
  if (!storage) {
    storage = getStorage(app());
    if (useEmulators) connectStorageEmulator(storage, '127.0.0.1', 9199);
  }
  return storage;
}
