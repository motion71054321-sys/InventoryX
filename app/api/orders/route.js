import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import admin from "@/lib/firebaseAdmin";

const now = () => admin.firestore.FieldValue.serverTimestamp();

export async function POST(req) {
  try {
    const body = await req.json();
    const items = Array.isArray(body.items) ? body.items : [];

    if (!items.length) {
      return NextResponse.json({ error: "items required" }, { status: 400 });
    }

    const normalized = items.map((it) => ({
      slug: String(it.slug || "").trim(),
      qty: Number(it.qty || 0),
      price: Number(it.price || 0),
    }));

    if (normalized.some((x) => !x.slug || !Number.isFinite(x.qty) || x.qty <= 0)) {
      return NextResponse.json({ error: "Invalid items" }, { status: 400 });
    }

    const orderRef = adminDb.collection("orders").doc();
    const orderId = orderRef.id;

    await adminDb.runTransaction(async (tx) => {
      // write order
      tx.set(orderRef, { items: normalized, createdAt: now() });

      // update products + write transactions
      for (const it of normalized) {
        const pref = adminDb.collection("products").doc(it.slug);
        const psnap = await tx.get(pref);
        if (!psnap.exists) throw new Error(`Product not found: ${it.slug}`);

        const cur = psnap.data() || {};
        const prevQty = Number(cur.quantity || 0);
        const nextQty = prevQty - it.qty;
        if (nextQty < 0) throw new Error(`Insufficient stock: ${it.slug}`);

        tx.set(pref, { quantity: nextQty, updatedAt: now() }, { merge: true });

        tx.set(adminDb.collection("transactions").doc(), {
          slug: it.slug,
          type: "sale",
          qty: it.qty,
          priceSnapshot: Number(it.price ?? cur.price ?? 0),
          orderId,
          createdAt: now(),
        });
      }
    });

    return NextResponse.json({ success: true, orderId });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
