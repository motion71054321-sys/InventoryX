"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, Tooltip,
  BarChart, Bar,
} from "recharts";

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [reco, setReco] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState("");

  const load = async () => {
    setLoading(true);
    setActionMsg("");
    try {
      const aRes = await fetch("/api/admin/analytics", { cache: "no-store" });
      const aData = await aRes.json();
      if (!aRes.ok) throw new Error(aData.error || "Analytics failed");

      const rRes = await fetch("/api/recommendations", { cache: "no-store" });
      const rData = await rRes.json();
      if (!rRes.ok) throw new Error(rData.error || "Recommendations failed");

      setAnalytics(aData);
      setReco(rData);
    } catch (e) {
      setAnalytics({ error: e.message });
      setReco(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const restock = async (slug, amount) => {
    setActionMsg("");
    try {
      const res = await fetch("/api/product", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, delta: amount }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Restock failed");
      setActionMsg(`✅ Restocked ${slug} by +${amount}. New qty: ${data.quantity}`);
      load();
    } catch (e) {
      setActionMsg(`❌ ${e.message}`);
    }
  };

  if (loading) {
    return <div className="min-h-screen p-6">Loading admin dashboard…</div>;
  }

  if (analytics?.error) {
    return <div className="min-h-screen p-6">Error: {analytics.error}</div>;
  }

  return (
    <div className="min-h-screen p-6 bg-zinc-50">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">InventoryX Admin Dashboard</h1>
            <p className="text-sm opacity-70 mt-1">Sales charts + smart reorder suggestions</p>
          </div>
          <button
            onClick={load}
            className="rounded-xl border bg-white px-4 py-2 shadow-sm"
          >
            Refresh
          </button>
        </div>

        {actionMsg && (
          <div className="mt-4 rounded-xl border bg-white p-3 text-sm">
            {actionMsg}
          </div>
        )}

        {/* KPIs */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Kpi title="Total Products" value={analytics.totals.totalProducts} />
          <Kpi title="Top Sellers Count" value={analytics.topSellers.length} />
          <Kpi title="Low Stock Items" value={analytics.lowStock.length} />
        </div>

        {/* Charts */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="Sales Trend (last 30 days)">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.trend}>
                  <XAxis dataKey="date" hide />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="sold" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Top Sellers (units sold)">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.topSellers}>
                  <XAxis dataKey="slug" hide />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="soldQty" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Tables */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card title="Low Stock (≤ 5)">
            <Table2
              headers={["Slug", "Qty"]}
              rows={analytics.lowStock.map((x) => [x.slug, x.quantity])}
            />
          </Card>

          <Card title="Smart Reorder Suggestions (v2)">
            {reco?.recommendations?.length ? (
              <div className="overflow-auto rounded-xl border bg-white">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-50">
                    <tr>
                      <th className="text-left p-2">Slug</th>
                      <th className="text-right p-2">Qty</th>
                      <th className="text-right p-2">Sold(30d)</th>
                      <th className="text-right p-2">Reorder Pt</th>
                      <th className="text-right p-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reco.recommendations.slice(0, 10).map((x) => (
                      <tr key={x.slug} className="border-t">
                        <td className="p-2">{x.slug}</td>
                        <td className="p-2 text-right">{x.quantity}</td>
                        <td className="p-2 text-right">{x.sold30}</td>
                        <td className="p-2 text-right">{x.reorderPoint}</td>
                        <td className="p-2 text-right">
                          <button
                            onClick={() => restock(x.slug, 10)}
                            className="rounded-lg border bg-white px-2 py-1 text-xs shadow-sm"
                          >
                            Restock +10
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm opacity-70">No items need reorder right now.</p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

function Kpi({ title, value }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="text-xs opacity-60">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
    </div>
  );
}

function Card({ title, children }) {
  return (
    <div className="rounded-2xl border bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Table2({ headers, rows }) {
  return (
    <div className="overflow-auto rounded-xl border bg-white">
      <table className="w-full text-sm">
        <thead className="bg-zinc-50">
          <tr>
            {headers.map((h) => (
              <th key={h} className="text-left p-2">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t">
              <td className="p-2">{r[0]}</td>
              <td className="p-2 text-right">{r[1]}</td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr className="border-t">
              <td className="p-2 opacity-60" colSpan={headers.length}>No data</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
