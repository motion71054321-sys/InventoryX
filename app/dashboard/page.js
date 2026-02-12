"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, ShoppingCart, IndianRupee, Sparkles } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";

function StatCard({ title, value, icon: Icon }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border bg-white/70 backdrop-blur p-4 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">{title}</p>
        <div className="rounded-xl border bg-white p-2">
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-semibold">{value}</p>
    </motion.div>
  );
}

export default function DashboardPage() {
  const [days, setDays] = useState(30);
  const [analytics, setAnalytics] = useState(null);
  const [reorder, setReorder] = useState(null);

  const [recoSlug, setRecoSlug] = useState("");
  const [reco, setReco] = useState(null);

  useEffect(() => {
    (async () => {
      const a = await fetch(`/api/analytics?days=${days}`, { cache: "no-store" }).then((r) => r.json());
      setAnalytics(a);

      const ro = await fetch(`/api/reorder?lookbackDays=${days}&targetDays=21`, { cache: "no-store" }).then((r) => r.json());
      setReorder(ro);
    })();
  }, [days]);

  useEffect(() => {
    (async () => {
      const url = recoSlug
        ? `/api/recommendations?slug=${encodeURIComponent(recoSlug)}&days=90&limit=6`
        : `/api/recommendations?days=90&limit=6`;
      const r = await fetch(url, { cache: "no-store" }).then((x) => x.json());
      setReco(r);
    })();
  }, [recoSlug]);

  const daily = useMemo(() => analytics?.daily || [], [analytics]);
  const topProducts = useMemo(() => analytics?.topProducts || [], [analytics]);
  const suggestions = useMemo(() => reorder?.suggestions || [], [reorder]);

  return (
    <div className="min-h-screen bg-linear-to-b from-indigo-50 via-white to-white">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold tracking-tight">InventoryX Dashboard</h1>
          <p className="text-gray-600">Sales charts, smart reorder, and recommendations.</p>
        </motion.div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="rounded-2xl border bg-white p-2 shadow-sm">
            <label className="mr-2 text-sm text-gray-600">Range</label>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="rounded-xl border px-3 py-2 text-sm outline-none"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>
          </div>

          <div className="rounded-2xl border bg-white p-2 shadow-sm">
            <label className="mr-2 text-sm text-gray-600">Recommend for</label>
            <input
              value={recoSlug}
              onChange={(e) => setRecoSlug(e.target.value)}
              placeholder="type product slug (optional)"
              className="w-64 rounded-xl border px-3 py-2 text-sm outline-none"
            />
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <StatCard title="Revenue" value={`₹ ${analytics?.kpis?.revenue ?? 0}`} icon={IndianRupee} />
          <StatCard title="Sales Txns" value={`${analytics?.kpis?.salesCount ?? 0}`} icon={ShoppingCart} />
          <StatCard title="Avg Sale Value" value={`₹ ${analytics?.kpis?.aov ?? 0}`} icon={TrendingUp} />
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border bg-white p-4 shadow-sm"
          >
            <h2 className="font-semibold">Revenue Trend</h2>
            <p className="text-sm text-gray-600">From transactions (sale) using priceSnapshot</p>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={daily}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="revenue" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border bg-white p-4 shadow-sm"
          >
            <h2 className="font-semibold">Top Products</h2>
            <p className="text-sm text-gray-600">By units sold</p>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="slug" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="qty" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border bg-white p-4 shadow-sm"
          >
            <h2 className="font-semibold">Smart Auto-Reorder Suggestions</h2>
            <p className="text-sm text-gray-600">Uses leadTimeDays + safetyStock + sales velocity</p>

            <div className="mt-4 max-h-85 overflow-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-left text-gray-600">
                    <th className="p-3">Slug</th>
                    <th className="p-3">Qty</th>
                    <th className="p-3">ROP</th>
                    <th className="p-3">Suggested</th>
                    <th className="p-3">Urgency</th>
                  </tr>
                </thead>
                <tbody>
                  {suggestions.slice(0, 25).map((s) => (
                    <tr key={s.slug} className="border-t">
                      <td className="p-3 font-medium">{s.slug}</td>
                      <td className="p-3">{s.currentQty}</td>
                      <td className="p-3">{s.reorderPoint}</td>
                      <td className="p-3">{s.recommendedQty}</td>
                      <td className="p-3">
                        <span className="rounded-full border px-2 py-1 text-xs">{s.urgency}</span>
                      </td>
                    </tr>
                  ))}
                  {!suggestions.length && (
                    <tr>
                      <td className="p-4 text-gray-600" colSpan={5}>
                        No suggestions yet. Add some sales or create orders.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Recommendations</h2>
                <p className="text-sm text-gray-600">
                  {recoSlug ? `Frequently bought with "${recoSlug}"` : "Trending products"}
                </p>
              </div>
              <div className="rounded-xl border bg-white p-2">
                <Sparkles className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(reco?.recommendations || []).map((r) => (
                <motion.div
                  key={r.slug}
                  whileHover={{ scale: 1.02 }}
                  className="rounded-2xl border bg-linear-to-b from-white to-indigo-50 p-4 shadow-sm"
                >
                  <p className="font-semibold">{r.slug}</p>
                  <p className="text-sm text-gray-600">score: {r.score}</p>
                  <button
                    onClick={() => setRecoSlug(r.slug)}
                    className="mt-3 w-full rounded-xl border bg-white px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    Recommend with this
                  </button>
                </motion.div>
              ))}
              {!reco?.recommendations?.length && (
                <p className="text-sm text-gray-600">No recommendations yet. Create some orders.</p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
