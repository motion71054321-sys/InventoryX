import { NextResponse } from "next/server";
import { getAdminDb, admin } from "@/lib/firebaseAdmin";

/**
 * /api/sales
 * GET:
 *  - ?days=7
 *  - OR ?from=YYYY-MM-DD&to=YYYY-MM-DD (inclusive)
 *
 * Reads from: transactions
 * Each txn: { slug, type: "sale"|"restock", qty: number, createdAt: Timestamp }
 */
function startOfDayUTC(date) {
  const d = new Date(date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

function addDaysUTC(date, days) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function parseYMDToUTC(ymd) {
  // ymd: "YYYY-MM-DD"
  const [y, m, d] = (ymd || "").split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

export async function GET(req) {
  try {
    const db = getAdminDb();
    const { searchParams } = new URL(req.url);

    const daysRaw = searchParams.get("days");
    const fromRaw = searchParams.get("from");
    const toRaw = searchParams.get("to");

    let fromDateUTC;
    let toDateUTC;

    if (fromRaw && toRaw) {
      const f = parseYMDToUTC(fromRaw);
      const t = parseYMDToUTC(toRaw);
      if (!f || !t) {
        return NextResponse.json(
          { error: "Invalid from/to. Use YYYY-MM-DD." },
          { status: 400 }
        );
      }
      fromDateUTC = startOfDayUTC(f);
      // make 'to' inclusive by going to next day start
      toDateUTC = addDaysUTC(startOfDayUTC(t), 1);
    } else {
      const days = Math.max(1, Math.min(365, Number(daysRaw || 7)));
      // default: last N days including today (UTC)
      const todayUTC = startOfDayUTC(new Date());
      fromDateUTC = addDaysUTC(todayUTC, -(days - 1));
      toDateUTC = addDaysUTC(todayUTC, 1);
    }

    const fromTs = admin.firestore.Timestamp.fromDate(fromDateUTC);
    const toTs = admin.firestore.Timestamp.fromDate(toDateUTC);

    // Query transactions within range
    const snap = await db
      .collection("transactions")
      .where("createdAt", ">=", fromTs)
      .where("createdAt", "<", toTs)
      .get();

    let totalSalesQty = 0;
    let totalRestockQty = 0;
    let salesCount = 0;
    let restockCount = 0;

    // Optional: breakdown per day
    const daily = {}; // { "YYYY-MM-DD": { salesQty, restockQty, salesCount, restockCount } }

    for (const doc of snap.docs) {
      const data = doc.data() || {};
      const type = data.type;
      const qty = Number(data.qty || 0);

      // Normalize createdAt to YYYY-MM-DD (UTC)
      const createdAt = data.createdAt?.toDate ? data.createdAt.toDate() : null;
      const key = createdAt
        ? new Date(Date.UTC(createdAt.getUTCFullYear(), createdAt.getUTCMonth(), createdAt.getUTCDate()))
            .toISOString()
            .slice(0, 10)
        : "unknown";

      if (!daily[key]) {
        daily[key] = { salesQty: 0, restockQty: 0, salesCount: 0, restockCount: 0 };
      }

      if (type === "sale") {
        totalSalesQty += qty;
        salesCount += 1;
        daily[key].salesQty += qty;
        daily[key].salesCount += 1;
      } else if (type === "restock") {
        totalRestockQty += qty;
        restockCount += 1;
        daily[key].restockQty += qty;
        daily[key].restockCount += 1;
      }
    }

    // sort daily keys
    const dailySorted = Object.keys(daily)
      .sort()
      .map((date) => ({ date, ...daily[date] }));

    return NextResponse.json(
      {
        success: true,
        range: {
          from: fromDateUTC.toISOString(),
          toExclusive: toDateUTC.toISOString(),
        },
        totals: {
          salesQty: totalSalesQty,
          restockQty: totalRestockQty,
          salesCount,
          restockCount,
          netQty: totalRestockQty - totalSalesQty,
        },
        daily: dailySorted,
      },
      { status: 200 }
    );
  } catch (e) {
    return NextResponse.json(
      { error: e?.message || "Failed to load sales." },
      { status: 500 }
    );
  }
}
