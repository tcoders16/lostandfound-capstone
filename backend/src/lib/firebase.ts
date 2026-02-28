// // backend/src/lib/firebase.ts
// import admin from "firebase-admin";
// import { env } from "../api/env";


// /**
//  * Normalize multiline private key from .env
//  * (most CI/CD systems store \n as literal characters)
//  */
// const privateKey = env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");

// /**
//  * Initialize Firebase Admin (idempotent)
//  */
// if (admin.apps.length === 0) {
//   admin.initializeApp({
//     credential: admin.credential.cert({
//       projectId: env.FIREBASE_PROJECT_ID,
//       clientEmail: env.FIREBASE_CLIENT_EMAIL,
//       privateKey,
//     }),
//     storageBucket: env.GCS_BUCKET, // e.g., "<project-id>.appspot.com"
//   });
// }

// /** Firestore + Storage singletons */
// export const db = admin.firestore();
// export const bucket = admin.storage().bucket();

// /** Handy re-exports */
// export const FieldValue = admin.firestore.FieldValue;
// export const Timestamp = admin.firestore.Timestamp;

// export type Firestore = FirebaseFirestore.Firestore;

// /**
//  * Optional helpers (use if you need them later)
//  */
// export const collections = {
//   items: () => db.collection("items"),
//   claims: () => db.collection("claims"),
//   activity: () => db.collection("activity"),
// };

// export function gsUri(storagePath: string) {
//   // Build a gs:// URI from a bucket-relative path
//   return `gs://${env.GCS_BUCKET}/${storagePath}`;
// }



// src/lib/firebase.ts
// Temporary Firebase stub (for local dev without Firebase)

export const db = {
  collection: (_name: string) => ({
    doc: (_id?: string) => ({
      set: async () => {
        throw new Error("Firestore not available (Firebase disabled).");
      },
      update: async () => {
        throw new Error("Firestore not available (Firebase disabled).");
      },
      get: async () => {
        throw new Error("Firestore not available (Firebase disabled).");
      },
    }),
    get: async () => {
      throw new Error("Firestore not available (Firebase disabled).");
    },
  }),
};

export const bucket = {
  file: () => ({
    save: async () => {
      throw new Error("Storage not available (Firebase disabled).");
    },
    getSignedUrl: async () => {
      throw new Error("Storage not available (Firebase disabled).");
    },
  }),
};

// Firestore helper stubs
export const FieldValue = {};
export const Timestamp = {};

// Collection helpers
export const collections = {
  items: () => db.collection("items"),
  claims: () => db.collection("claims"),
  activity: () => db.collection("activity"),
};

export function gsUri(_path: string) {
  throw new Error("GCS not available (Firebase disabled).");
}
