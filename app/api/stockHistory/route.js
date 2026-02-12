import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

function toMillis(ts) {
  if (!ts) return 0;
  if (typeof ts.toMillis === "function") return ts.toMillis();
  if (typeof ts.seconds === "number") return ts.seconds * 1000;
  return 0;
}

// GET /api/stockHistory?ownerId=USER_ID
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const ownerId = (searchParams.get("ownerId") || "").trim();

    let query = adminDb.collection("stockHistory");
    if (ownerId) query = query.where("ownerId", "==", ownerId);

    const snap = await query.get();
    const history = snap.docs.map((d) => d.data());

    // sort by timestamp desc (or createdAt if that’s your field)
    history.sort((a, b) => {
      const am = toMillis(a.timestamp) || toMillis(a.createdAt);
      const bm = toMillis(b.timestamp) || toMillis(b.createdAt);
      return bm - am;
    });

    return NextResponse.json({ success: true, history, sortedInJs: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
