import { NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";
import { adminDb } from "@/lib/firebaseAdmin";

const now = () => admin.firestore.FieldValue.serverTimestamp();

/**
 * POST /api/transaction
 * Body:
 * {
 *   slug: string,
 *   type: "sale" | "restock",
 *   qty: number
 * }
 */
export async function POST(req) {
  try {
    const body = await req.json();

    const slug = (body.slug || "").trim();
    const type = body.type;
    const qty = Number(body.qty);

    if (!slug || !["sale", "restock"].includes(type) || !Number.isFinite(qty) || qty <= 0) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Save transaction in Firestore
    await adminDb.collection("transactions").add({
      slug,
      type,
      qty,
      createdAt: now(),
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
