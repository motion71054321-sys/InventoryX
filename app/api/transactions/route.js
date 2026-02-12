import clientPromise from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();
    const slug = (body.slug || "").trim();
    const type = body.type; // "sale" | "restock"
    const qty = Number(body.qty);

    if (!slug || !["sale", "restock"].includes(type) || !Number.isFinite(qty) || qty <= 0) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "warehouse");

    await db.collection("transactions").insertOne({
      slug,
      type,
      qty,
      createdAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
