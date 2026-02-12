import { NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";
import { adminDb } from "@/lib/firebaseAdmin";

const now = () => admin.firestore.FieldValue.serverTimestamp();

/**
 * Collection: products (docId = slug)
 * Fields: slug, quantity, price, leadTimeDays, safetyStock, createdAt, updatedAt
 *
 * Collection: transactions (auto docId)
 * Fields: slug, type ("sale"|"restock"), qty, priceSnapshot, createdAt
 */

// CREATE / UPSERT (does not overwrite createdAt)
export async function POST(req) {
  try {
    const body = await req.json();
    const slug = (body.slug || "").trim();
    const quantity = Number(body.quantity);
    const price = Number(body.price);

    if (!slug || !Number.isFinite(quantity) || !Number.isFinite(price)) {
      return NextResponse.json(
        { error: "Missing/invalid fields" },
        { status: 400 }
      );
    }

    const ref = adminDb.collection("products").doc(slug);

    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(ref);

      if (!snap.exists) {
        tx.set(ref, {
          slug,
          quantity,
          price,
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

// READ (safe orderBy with fallback)
export async function GET() {
  try {
    const snap = await adminDb
      .collection("products")
      .orderBy("updatedAt", "desc")
      .get();
    const products = snap.docs.map((d) => d.data());
    return NextResponse.json({ success: true, Product: products });
  } catch (e) {
    try {
      const snap = await adminDb.collection("products").get();
      const products = snap.docs.map((d) => d.data());
      return NextResponse.json({ success: true, Product: products, fallback: true });
    } catch (e2) {
      return NextResponse.json({ error: e2.message }, { status: 500 });
    }
  }
}

/**
 * UPDATE (supports quantity OR delta; logs sale/restock automatically)
 * Body examples:
 *   { slug: "abc", quantity: 25 }
 *   { slug: "abc", delta: -3 }  // sale of 3
 *   { slug: "abc", delta: 10 }  // restock of 10
 *   { slug: "abc", price: 99 }
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

      // ✅ UPDATED: log price snapshot for analytics
      if (diff !== 0) {
        tx.set(adminDb.collection("transactions").doc(), {
          slug,
          type: diff < 0 ? "sale" : "restock",
          qty: Math.abs(diff),

          // snapshot price for analytics (use nextPrice if provided, else current product price)
          priceSnapshot: Number(nextPrice ?? cur.price ?? 0),

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
