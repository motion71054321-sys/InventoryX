import { NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";
import { adminDb } from "@/lib/firebaseAdmin";

const now = () => admin.firestore.FieldValue.serverTimestamp();

function toMillis(ts) {
  // Firestore Timestamp -> ms
  if (!ts) return 0;
  if (typeof ts.toMillis === "function") return ts.toMillis();
  if (typeof ts.seconds === "number") return ts.seconds * 1000;
  return 0;
}

/**
 * Collection: products (docId = slug)
 * Suggested fields: slug, quantity, price, leadTimeDays, safetyStock, ownerId, createdAt, updatedAt
 *
 * Collection: transactions (auto docId)
 * Fields: slug, type ("sale"|"restock"), qty, priceSnapshot, ownerId, createdAt
 */

// CREATE / UPSERT
export async function POST(req) {
  try {
    const body = await req.json();
    const slug = (body.slug || "").trim();
    const quantity = Number(body.quantity);
    const price = Number(body.price);
    const ownerId = (body.ownerId || "").trim(); // optional but recommended if you use auth

    if (!slug || !Number.isFinite(quantity) || !Number.isFinite(price)) {
      return NextResponse.json({ error: "Missing/invalid fields" }, { status: 400 });
    }

    const ref = adminDb.collection("products").doc(slug);

    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);

      if (!snap.exists) {
        tx.set(ref, {
          slug,
          quantity,
          price,
          ownerId: ownerId || null,
          leadTimeDays: Number(body.leadTimeDays || 7),
          safetyStock: Number(body.safetyStock || 5),
          createdAt: now(),
          updatedAt: now(),
        });
      } else {
        const cur = snap.data() || {};
        tx.set(
          ref,
          {
            slug,
            quantity,
            price,
            ownerId: ownerId || cur.ownerId || null,
            leadTimeDays: Number(body.leadTimeDays || cur.leadTimeDays || 7),
            safetyStock: Number(body.safetyStock || cur.safetyStock || 5),
            updatedAt: now(),
          },
          { merge: true }
        );
      }
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ✅ UPDATED READ: supports ownerId and avoids composite index by sorting in JS
// GET /api/product?ownerId=USER_ID
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const ownerId = (searchParams.get("ownerId") || "").trim();

    let query = adminDb.collection("products");
    if (ownerId) query = query.where("ownerId", "==", ownerId);

    const snap = await query.get();
    const products = snap.docs.map((d) => d.data());

    // Sort by updatedAt desc (fallback to createdAt)
    products.sort((a, b) => {
      const am = toMillis(a.updatedAt) || toMillis(a.createdAt);
      const bm = toMillis(b.updatedAt) || toMillis(b.createdAt);
      return bm - am;
    });

    return NextResponse.json({ success: true, Product: products, sortedInJs: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/**
 * UPDATE (supports quantity OR delta; logs sale/restock automatically)
 */
export async function PATCH(req) {
  try {
    const body = await req.json();
    const slug = (body.slug || "").trim();
    if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

    const hasQty = body.quantity !== undefined;
    const hasDelta = body.delta !== undefined;

    if (!hasQty && !hasDelta && body.price === undefined) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    const nextQty = hasQty ? Number(body.quantity) : undefined;
    const delta = hasDelta ? Number(body.delta) : undefined;
    const nextPrice = body.price !== undefined ? Number(body.price) : undefined;

    if (hasQty && !Number.isFinite(nextQty)) {
      return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
    }
    if (hasDelta && (!Number.isFinite(delta) || delta === 0)) {
      return NextResponse.json({ error: "Invalid delta" }, { status: 400 });
    }
    if (nextPrice !== undefined && !Number.isFinite(nextPrice)) {
      return NextResponse.json({ error: "Invalid price" }, { status: 400 });
    }

    const ref = adminDb.collection("products").doc(slug);

    let finalQty = null;
    let diff = 0;

    await adminDb.runTransaction(async (tx) => {
      const curSnap = await tx.get(ref);
      if (!curSnap.exists) throw new Error("Product not found");
      const cur = curSnap.data() || {};
      const prevQty = Number(cur.quantity || 0);

      if (hasDelta) finalQty = prevQty + delta;
      else if (hasQty) finalQty = nextQty;
      else finalQty = prevQty;

      if (finalQty < 0) throw new Error("Quantity cannot be negative");

      const update = { updatedAt: now() };
      if (hasDelta || hasQty) update.quantity = finalQty;
      if (nextPrice !== undefined) update.price = nextPrice;

      tx.set(ref, update, { merge: true });

      diff = finalQty - prevQty;

      // ✅ UPDATED: add priceSnapshot so analytics works even if price changes later
      if (diff !== 0) {
        tx.set(adminDb.collection("transactions").doc(), {
          slug,
          type: diff < 0 ? "sale" : "restock",
          qty: Math.abs(diff),
          priceSnapshot: Number(nextPrice ?? cur.price ?? 0),
          ownerId: cur.ownerId ?? null,
          createdAt: now(),
        });
      }
    });

    return NextResponse.json({ success: true, slug, quantity: finalQty, diff });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/product?slug=abc
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = (searchParams.get("slug") || "").trim();
    if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

    await adminDb.collection("products").doc(slug).delete();
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
