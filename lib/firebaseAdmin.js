// lib/firebaseAdmin.js
import admin from "firebase-admin";

function loadServiceAccount() {
  // Recommended: store full JSON in FIREBASE_SERVICE_ACCOUNT
  // Example value (as a single line JSON string):
  // {"type":"service_account","project_id":"...","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"..."}
  const json = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (json) {
    try {
      return JSON.parse(json);
    } catch (e) {
      throw new Error(
        "FIREBASE_SERVICE_ACCOUNT is not valid JSON. Paste the full service account JSON."
      );
    }
  }

  // Fallback (if you prefer separate env vars)
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (privateKey) {
    // Fix escaped newlines in Vercel env vars
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  if (projectId && clientEmail && privateKey) {
    return {
      projectId,
      clientEmail,
      privateKey,
    };
  }

  return null;
}

if (!admin.apps.length) {
  const serviceAccount = loadServiceAccount();

  if (!serviceAccount) {
    throw new Error(
      "Missing Firebase Admin credentials. Set FIREBASE_SERVICE_ACCOUNT (recommended) or FIREBASE_PROJECT_ID + FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY."
    );
  }

  // If parsed JSON has the standard keys, use cert()
  // If fallback object is used, also works with cert()
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

// Firestore DB instance (eager)
export const adminDb = admin.firestore();

// Getter style (some files may prefer calling a function)
export const getAdminDb = () => admin.firestore();

// Named export for admin (some routes want: import { admin } ...)
export { admin };

// Default export for older imports: import admin from "@/lib/firebaseAdmin"
export default admin;
