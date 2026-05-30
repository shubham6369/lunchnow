import * as admin from "firebase-admin";

const privateKey = process.env.FIREBASE_PRIVATE_KEY;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

if (!admin.apps.length) {
  try {
    if (privateKey && clientEmail && projectId) {
      // Handle newline escaping for private keys coming from environment variables
      const formattedPrivateKey = privateKey.replace(/\\n/g, "\n");
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId,
          clientEmail,
          privateKey: formattedPrivateKey,
        }),
      });
    } else {
      // Fallback for development where variables are not fully configured yet
      admin.initializeApp({
        projectId: projectId || "lunchnow-9a19f",
      });
      console.warn("Firebase Admin initialized with default projectId/fallback. Custom operations may fail if credentials aren't set in environment variables.");
    }
  } catch (error) {
    console.error("Firebase admin initialization error:", error);
  }
}

const adminAuth = admin.auth();
const adminDb = admin.firestore();

export { adminAuth, adminDb, admin };
