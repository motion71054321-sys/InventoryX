import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import admin from "@/lib/firebaseAdmin";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = (searchParams.get("slug") || "").trim();
    const days = Math.min(Number(searchParams.get("days") || 90), 365);
    const limit = Math.min(Number(searchParams.get("limit") || 6), 20);

    const since = new Date();
    since.setDate(since.getDate() - days);
    since.setHours(0, 0, 0, 0);

    const snap = await adminDb
      .collection("orders")
      .where("createdAt", ">=", admin.firestore.Timestamp.fromDate(since))
      .limit(3000)
      .get();

    const orders = snap.docs.map((d) => d.data());

    // trending fallback from orders
    const trendingMap = new Map();
    for (const o of orders) {
      for (const it of o.items || []) {
        const s = String(it.slug || "");
        const q = Number(it.qty || 0);
        trendingMap.set(s, (trendingMap.get(s) || 0) + q);
      }
    }
    const trending = [...trendingMap.entries()]
      .map(([slug, score]) => ({ slug, score }))
      .sort((a, b) => b.score - a.score);

    if (!slug) {
      return NextResponse.json({ success: true, type: "trending", recommendations: trending.slice(0, limit) });
    }

    const co = new Map(); // otherSlug -> count
    for (const o of orders) {
      const slugs = (o.items || []).map((x) => String(x.slug || ""));
      if (!slugs.includes(slug)) continue;

      const uniq = [...new Set(slugs)];
      for (const other of uniq) {
        if (other === slug) continue;
        co.set(other, (co.get(other) || 0) + 1);
      }
    }

    let recs = [...co.entries()]
      .map(([s, score]) => ({ slug: s, score }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    if (recs.length < limit) {
      const seen = new Set([slug, ...recs.map((r) => r.slug)]);
      for (const t of trending) {
        if (!seen.has(t.slug)) recs.push(t);
        if (recs.length >= limit) break;
      }
    }

    return NextResponse.json({ success: true, type: "frequently_bought_together", for: slug, recommendations: recs });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
