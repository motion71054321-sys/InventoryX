import { NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";
import { adminDb } from "@/lib/firebaseAdmin";

const now = () => admin.firestore.FieldValue.serverTimestamp();

/**
 * GET /api/admin/users?email=a@b.com
 * Lookup user record in Firestore
 */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const email = (searchParams.get("email") || "").trim().toLowerCase();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const doc = await adminDb.collection("users").doc(email).get();
    const data = doc.exists ? doc.data() : null;

    return NextResponse.json({
      found: !!data,
      user: data ? { email: data.email || email, role: data.role || "user" } : null,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/users { email }
 * Promote (Firestore only)
 */
export async function POST(req) {
  try {
    const body = await req.json();
    const email = (body.email || "").trim().toLowerCase();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    const ref = adminDb.collection("users").doc(email);
    const snap = await ref.get();

    if (!snap.exists) {
      await ref.set({ email, role: "admin", createdAt: now(), updatedAt: now() });
    } else {
      await ref.set({ role: "admin", updatedAt: now() }, { merge: true });
    }

    return NextResponse.json({ success: true, promoted: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/users?email=a@b.com
 * Demote (Firestore only)
 */
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const email = (searchParams.get("email") || "").trim().toLowerCase();
    if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

    await adminDb.collection("users").doc(email).set(
      { role: "user", updatedAt: now() },
      { merge: true }
    );

    return NextResponse.json({ success: true, demoted: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
