import { NextResponse } from "next/server";
import admin from "@/lib/firebaseAdmin";
import { adminDb } from "@/lib/firebaseAdmin";

export async function GET() {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceTs = admin.firestore.Timestamp.fromDate(since);

    // products count + low stock
    const productsSnap = await adminDb.collection("products").get();
    const products = productsSnap.docs.map((d) => d.data());
    const totalProducts = products.length;

    const lowStock = products
      .filter((p) => Number(p.quantity || 0) <= 5)
      .sort((a, b) => Number(a.quantity || 0) - Number(b.quantity || 0))
      .slice(0, 10)
      .map((p) => ({ slug: p.slug, quantity: Number(p.quantity || 0), price: Number(p.price || 0) }));

    // transactions last 30 days (sales only)
    const txSnap = await adminDb
      .collection("transactions")
      .where("type", "==", "sale")
      .where("createdAt", ">=", sinceTs)
      .get();

    // top sellers
    const soldMap = new Map();
    // daily trend: YYYY-MM-DD -> qty
    const dailyMap = new Map();

    txSnap.forEach((doc) => {
      const t = doc.data();
      const slug = t.slug;
      const qty = Number(t.qty || 0);

      soldMap.set(slug, (soldMap.get(slug) || 0) + qty);

      const dt = t.createdAt?.toDate ? t.createdAt.toDate() : new Date();
      const key = dt.toISOString().slice(0, 10);
      dailyMap.set(key, (dailyMap.get(key) || 0) + qty);
    });

    const topSellers = [...soldMap.entries()]
      .map(([slug, soldQty]) => {
        const p = products.find((x) => x.slug === slug);
        const price = Number(p?.price || 0);
        return { slug, soldQty, price, estRevenue: soldQty * price };
      })
      .sort((a, b) => b.soldQty - a.soldQty)
      .slice(0, 10);

    // build last 30 days timeline (fill missing with 0)
    const trend = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      trend.push({ date: key, sold: dailyMap.get(key) || 0 });
    }

    return NextResponse.json({
      success: true,
      windowDays: 30,
      totals: { totalProducts },
      topSellers,
      lowStock,
      trend,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
