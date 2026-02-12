import { NextResponse } from "next/server";
import { getAdminDb, admin } from "@/lib/firebaseAdmin";

function startOfDayDate(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { items, customer = null, note = "" } = body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "items is required" }, { status: 400 });
    }

    const normalized = items.map((it) => ({
      slug: String(it.slug || "").trim(),
      qty: Number(it.qty || 0),
      price: Number(it.price || 0),
    }));

    if (normalized.some((it) => !it.slug || it.qty <= 0)) {
      return NextResponse.json({ error: "each item needs valid slug and qty" }, { status: 400 });
    }

    const total = normalized.reduce((s, it) => s + it.qty * it.price, 0);

    const db = getAdminDb();
    const now = new Date();
    const day = startOfDayDate(now);

    // Create order
    const orderRef = await db.collection("salesOrders").add({
      items: normalized,
      total,
      customer,
      note,
      createdAt: admin.firestore.Timestamp.fromDate(now),
      day: admin.firestore.Timestamp.fromDate(day),
    });

    // Decrement inventory (transaction for safety)
    await db.runTransaction(async (tx) => {
      for (const it of normalized) {
        const q = await tx.get(
          db.collection("inventory").where("slug", "==", it.slug).limit(1)
        );
        if (q.empty) continue;

        const doc = q.docs[0];
        const currentQty = Number(doc.data().quantity || 0);
        tx.update(doc.ref, { quantity: currentQty - Math.abs(it.qty) });
      }
    });

    return NextResponse.json({ success: true, id: orderRef.id });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const days = Math.min(Number(searchParams.get("days") || 30), 365);

    const db = getAdminDb();

    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    // Query recent orders
    const snap = await db
      .collection("salesOrders")
      .where("day", ">=", admin.firestore.Timestamp.fromDate(since))
      .get();

    const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // Aggregate in memory (Firestore doesn't do easy group-by without extra infra)
    const dailyMap = new Map(); // dayStr -> {revenue, orders}
    const productMap = new Map(); // slug -> {qty, revenue}

    let revenue = 0;
    let count = 0;

    for (const o of orders) {
      count += 1;
      revenue += Number(o.total || 0);

      const dayDate = o.day?.toDate ? o.day.toDate() : new Date(o.day);
      const dayStr = dayDate.toISOString().slice(0, 10);

      const d0 = dailyMap.get(dayStr) || { day: dayStr, revenue: 0, orders: 0 };
      d0.revenue += Number(o.total || 0);
      d0.orders += 1;
      dailyMap.set(dayStr, d0);

      for (const it of o.items || []) {
        const slug = String(it.slug || "");
        const qty = Number(it.qty || 0);
        const price = Number(it.price || 0);

        const p0 = productMap.get(slug) || { slug, qty: 0, revenue: 0 };
        p0.qty += qty;
        p0.revenue += qty * price;
        productMap.set(slug, p0);
      }
    }

    const daily = [...dailyMap.values()].sort((a, b) => a.day.localeCompare(b.day));
    const topProducts = [...productMap.values()]
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    const kpis = {
      revenue,
      orders: count,
      aov: count ? +(revenue / count).toFixed(2) : 0,
    };

    return NextResponse.json({ success: true, days, daily, topProducts, kpis });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
