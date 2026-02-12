import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import admin from "@/lib/firebaseAdmin";

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const days = Math.min(Number(searchParams.get("days") || 30), 365);

    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const snap = await adminDb
      .collection("transactions")
      .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(since))
      .get();

    const txs = snap.docs.map((d) => d.data());

    const dailyMap = new Map(); // dayStr -> agg
    const prodMap = new Map();  // slug -> agg

    let revenue = 0;
    let salesCount = 0;
    let unitsSold = 0;

    for (const t of txs) {
      const created = t.createdAt?.toDate ? t.createdAt.toDate() : new Date();
      const dayStr = startOfDay(created).toISOString().slice(0, 10);

      const type = String(t.type || "");
      const qty = Number(t.qty || 0);
      const price = Number(t.priceSnapshot || 0);
      const slug = String(t.slug || "");

      const d0 =
        dailyMap.get(dayStr) || { day: dayStr, revenue: 0, salesQty: 0, restockQty: 0, salesCount: 0 };

      if (type === "sale") {
        const lineRevenue = qty * price;
        d0.revenue += lineRevenue;
        d0.salesQty += qty;
        d0.salesCount += 1;

        revenue += lineRevenue;
        salesCount += 1;
        unitsSold += qty;

        const p0 = prodMap.get(slug) || { slug, qty: 0, revenue: 0 };
        p0.qty += qty;
        p0.revenue += lineRevenue;
        prodMap.set(slug, p0);
      } else if (type === "restock") {
        d0.restockQty += qty;
      }

      dailyMap.set(dayStr, d0);
    }

    const daily = [...dailyMap.values()].sort((a, b) => a.day.localeCompare(b.day));
    const topProducts = [...prodMap.values()].sort((a, b) => b.qty - a.qty).slice(0, 10);

    const kpis = {
      revenue: +revenue.toFixed(2),
      salesCount,
      unitsSold,
      aov: salesCount ? +(revenue / salesCount).toFixed(2) : 0,
    };

    return NextResponse.json({ success: true, days, daily, topProducts, kpis });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
