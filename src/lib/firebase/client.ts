'use client';

import { getApp, getApps, initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, type Auth } from 'firebase/auth';
import { connectStorageEmulator, getStorage, type FirebaseStorage } from 'firebase/storage';
import { firebaseConfig, useEmulators } from './config';

// The browser only uses Firebase for sign-in and image uploads.
// All Firestore access happens on the server through the Admin SDK.
let auth: Auth | undefined;
let storage: FirebaseStorage | undefined;

function resolvedConfig() {
  // On deployed domains (cook.dfchen.com / *.hosted.app), serve /__/auth/* via
  // the same-origin Next.js rewrite so browsers don't partition sessionStorage.
  if (
    typeof window !== 'undefined' &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    return { ...firebaseConfig, authDomain: window.location.host };
  }
  return firebaseConfig;
}

function app() {
  return getApps().length ? getApp() : initializeApp(resolvedConfig());
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
