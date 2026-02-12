import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import admin from "@/lib/firebaseAdmin";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const lookbackDays = Math.min(Number(searchParams.get("lookbackDays") || 30), 365);
    const targetDays = Math.max(1, Number(searchParams.get("targetDays") || 21)); // desired coverage

    const since = new Date();
    since.setDate(since.getDate() - lookbackDays);
    since.setHours(0, 0, 0, 0);

    // load products
    const prodSnap = await adminDb.collection("products").get();
    const products = prodSnap.docs.map((d) => d.data());

    // load sales tx
    const txSnap = await adminDb
      .collection("transactions")
      .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(since))
      .where("type", "==", "sale")
      .get();

    const soldMap = new Map(); // slug -> soldQty
    for (const doc of txSnap.docs) {
      const t = doc.data();
      const slug = String(t.slug || "");
      const qty = Number(t.qty || 0);
      soldMap.set(slug, (soldMap.get(slug) || 0) + qty);
    }

    const suggestions = products
      .map((p) => {
        const slug = String(p.slug || "");
        const currentQty = Number(p.quantity || 0);

        const leadTimeDays = Number(p.leadTimeDays || 7);
        const safetyStock = Number(p.safetyStock || 5);

        const soldQty = Number(soldMap.get(slug) || 0);
        const avgDailySales = soldQty / lookbackDays;

        // classic reorder point = demand during lead time + safety stock
        const reorderPoint = avgDailySales * leadTimeDays + safetyStock;

        // target stock = demand during targetDays + safety stock
        const targetStock = avgDailySales * targetDays + safetyStock;

        const recommendedQty = Math.max(0, Math.ceil(targetStock - currentQty));

        const urgency =
          currentQty <= 0 ? "critical" :
          currentQty < reorderPoint ? "high" :
          currentQty < targetStock ? "medium" : "ok";

        return {
          slug,
          currentQty,
          avgDailySales: +avgDailySales.toFixed(3),
          leadTimeDays,
          safetyStock,
          reorderPoint: +reorderPoint.toFixed(2),
          targetStock: +targetStock.toFixed(2),
          recommendedQty,
          urgency,
        };
      })
      .sort((a, b) => {
        const rank = { critical: 0, high: 1, medium: 2, ok: 3 };
        return rank[a.urgency] - rank[b.urgency] || b.recommendedQty - a.recommendedQty;
      });

    return NextResponse.json({ success: true, suggestions });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
