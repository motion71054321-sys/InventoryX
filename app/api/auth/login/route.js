import { NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";

const SESSION_COOKIE = "session";
const EXPIRES_IN = 1000 * 60 * 60 * 24 * 7; // 7 days

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge: EXPIRES_IN / 1000,
};

export async function POST(req) {
  try {
    const { idToken } = await req.json();

    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json({ error: "idToken required" }, { status: 400 });
    }

    const decoded = await admin.auth().verifyIdToken(idToken);

    const sessionCookie = await admin.auth().createSessionCookie(idToken, {
      expiresIn: EXPIRES_IN,
    });

    const res = NextResponse.json(
      {
        success: true,
        uid: decoded.uid,
        email: decoded.email || null,
        name: decoded.name || null,
      },
      { status: 200 }
    );

    res.cookies.set(SESSION_COOKIE, sessionCookie, cookieOptions);
    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message || "Login failed" }, { status: 401 });
  }
}
