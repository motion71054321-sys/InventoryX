import { NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";
import { adminDb } from "@/lib/firebaseAdmin";

const SESSION_COOKIE = "session";
const EXPIRES_IN = 1000 * 60 * 60 * 24 * 7; // 7 days

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: EXPIRES_IN / 1000,
};

/**
 * POST /api/auth/signup
 * Body: { idToken: string, name?: string }
 *
 * Client first creates user with Firebase Auth, then sends idToken here.
 * This route:
 *  - verifies idToken
 *  - sets session cookie
 *  - (optional) stores/updates user profile in Firestore "users/{uid}"
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const idToken = body?.idToken;
    const name = (body?.name || "").trim();

    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json({ error: "idToken required" }, { status: 400 });
    }

    // Verify token -> get uid/email
    const decoded = await admin.auth().verifyIdToken(idToken);

    // Optionally set display name in Firebase Auth user record
    // (This is safe: it updates the user's profile server-side)
    if (name) {
      await admin.auth().updateUser(decoded.uid, { displayName: name });
    }

    // Optionally store user profile in Firestore for your app
    await adminDb.collection("users").doc(decoded.uid).set(
      {
        uid: decoded.uid,
        email: decoded.email || null,
        name: name || decoded.name || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // Create session cookie
    const sessionCookie = await admin.auth().createSessionCookie(idToken, {
      expiresIn: EXPIRES_IN,
    });

    const res = NextResponse.json(
      { success: true, uid: decoded.uid, email: decoded.email || null, name: name || decoded.name || null },
      { status: 201 }
    );

    res.cookies.set(SESSION_COOKIE, sessionCookie, cookieOptions);
    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message || "Signup failed" }, { status: 500 });
  }
}
