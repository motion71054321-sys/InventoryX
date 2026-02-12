"use client";

import Header from "@/component/Header";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  RefreshCw,
  TrendingUp,
  Sparkles,
  AlertTriangle,
  IndianRupee,
  ShoppingCart,
} from "lucide-react";
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

// ✅ If you're using Firebase Auth, pass the user uid into this component or replace mockOwnerId with auth uid.
// Example: const ownerId = user?.uid;
const mockOwnerId = ""; // <-- set to "" if you DON'T use ownerId filtering

function toNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function Badge({ text }) {
  return (
    <span className="rounded-full border bg-white px-2 py-1 text-xs text-gray-700">
      {text}
    </span>
  );
}

function StatCard({ title, value, icon: Icon, sub }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
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
      {sub ? <p className="mt-1 text-xs text-gray-600">{sub}</p> : null}
    </motion.div>
  );
}

export default function Home() {
  // ------------------ FORM ------------------
  const [productForm, setProductForm] = useState({
    slug: "",
    quantity: "",
    price: "",
    leadTimeDays: 7,
    safetyStock: 5,
  });

  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // ------------------ DATA ------------------
  const [products, setProducts] = useState([]);
  const [query, setQuery] = useState("");

  // Dashboard bits (optional on home page, but you asked “frontend updated too”)
  const [days, setDays] = useState(30);
  const [analytics, setAnalytics] = useState(null);
  const [reorder, setReorder] = useState(null);
  const [recoSlug, setRecoSlug] = useState("");
  const [reco, setReco] = useState(null);

  // ✅ ownerId: set this from auth if you use per-user data
  const ownerId = mockOwnerId;

  const toastIt = (msg, type = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2200);
  };

  const ownerParam = ownerId ? `ownerId=${encodeURIComponent(ownerId)}` : "";

  // ------------------ FETCH PRODUCTS ------------------
  const fetchProducts = async () => {
    try {
      const url = ownerParam ? `/api/product?${ownerParam}` : "/api/product";
      const r = await fetch(url, { cache: "no-store" });
      const j = await r.json();
      setProducts(Array.isArray(j.Product) ? j.Product : []);
    } catch (e) {
      console.error(e);
      setProducts([]);
      toastIt("Failed to fetch products", "err");
    }
  };

  // ------------------ FETCH DASHBOARD DATA ------------------
  const fetchDashboard = async () => {
    try {
      const a = await fetch(`/api/analytics?days=${days}`, { cache: "no-store" }).then((r) => r.json());
      setAnalytics(a);

      const ro = await fetch(`/api/reorder?lookbackDays=${days}&targetDays=21`, { cache: "no-store" }).then((r) => r.json());
      setReorder(ro);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRecommendations = async (slug) => {
    try {
      const url = slug
        ? `/api/recommendations?slug=${encodeURIComponent(slug)}&days=90&limit=6`
        : `/api/recommendations?days=90&limit=6`;
      const r = await fetch(url, { cache: "no-store" }).then((x) => x.json());
      setReco(r);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchDashboard();
    fetchRecommendations("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  useEffect(() => {
    fetchRecommendations(recoSlug);
  }, [recoSlug]);

  // ------------------ FILTERED PRODUCTS ------------------
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    return products.filter((p) => String(p.slug || "").toLowerCase().includes(q));
  }, [products, query]);

  // ------------------ FORM HANDLERS ------------------
  const handleChange = (e) => {
    const { name, value } = e.target;
    setProductForm((prev) => ({ ...prev, [name]: value }));
  };

  const addOrUpdateProduct = async (e) => {
    e.preventDefault();
    const payload = {
      slug: productForm.slug.trim(),
      quantity: toNum(productForm.quantity),
      price: toNum(productForm.price),
      leadTimeDays: toNum(productForm.leadTimeDays, 7),
      safetyStock: toNum(productForm.safetyStock, 5),
      ...(ownerId ? { ownerId } : {}),
    };

    if (!payload.slug) return toastIt("Slug is required", "err");

    try {
      setSaving(true);
      const r = await fetch("/api/product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed");

      toastIt("Saved ✅");
      setProductForm((p) => ({ ...p, slug: "", quantity: "", price: "" }));
      await fetchProducts();
    } catch (e2) {
      toastIt(e2.message || "Save failed", "err");
    } finally {
      setSaving(false);
    }
  };

  // ------------------ QUICK ACTIONS ------------------
  const patchProduct = async (payload) => {
    const r = await fetch("/api/product", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error || "Update failed");
    return j;
  };

  const onSellOne = async (slug) => {
    try {
      await patchProduct({ slug, delta: -1 });
      toastIt("Sold 1 ✅");
      await fetchProducts();
      await fetchDashboard();
    } catch (e) {
      toastIt(e.message, "err");
    }
  };

  const onRestock = async (slug, qty = 10) => {
    try {
      await patchProduct({ slug, delta: qty });
      toastIt(`Restocked +${qty} ✅`);
      await fetchProducts();
      await fetchDashboard();
    } catch (e) {
      toastIt(e.message, "err");
    }
  };

  const onDelete = async (slug) => {
    try {
      const r = await fetch(`/api/product?slug=${encodeURIComponent(slug)}`, { method: "DELETE" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Delete failed");
      toastIt("Deleted ✅");
      await fetchProducts();
    } catch (e) {
      toastIt(e.message, "err");
    }
  };

  // ------------------ DASHBOARD DATA ------------------
  const daily = useMemo(() => analytics?.daily || [], [analytics]);
  const topProducts = useMemo(() => analytics?.topProducts || [], [analytics]);
  const suggestions = useMemo(() => reorder?.suggestions || [], [reorder]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 via-white to-white">
      <Header />

      {/* Toast */}
      <AnimatePresence>
        {toast ? (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className={`fixed right-4 top-4 z-50 rounded-2xl border px-4 py-3 shadow-sm backdrop-blur bg-white ${
              toast.type === "err" ? "border-red-200" : "border-green-200"
            }`}
          >
            <p className="text-sm">{toast.msg}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">InventoryX</h1>
              <p className="text-gray-600">
                Manage products, track sales, and get smart reorder + recommendations.
              </p>
            </div>
            <button
              onClick={() => {
                fetchProducts();
                fetchDashboard();
                fetchRecommendations(recoSlug);
              }}
              className="inline-flex items-center gap-2 rounded-2xl border bg-white px-4 py-2 shadow-sm hover:bg-gray-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </motion.div>

        {/* Add product */}
        <motion.form
          onSubmit={addOrUpdateProduct}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 rounded-2xl border bg-white p-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Add / Update Product</h2>
            <Badge text="Firestore-backed" />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-5">
            <input
              name="slug"
              value={productForm.slug}
              onChange={handleChange}
              placeholder="slug (unique id)"
              className="rounded-2xl border px-3 py-2 outline-none"
            />
            <input
              name="quantity"
              value={productForm.quantity}
              onChange={handleChange}
              placeholder="quantity"
              className="rounded-2xl border px-3 py-2 outline-none"
            />
            <input
              name="price"
              value={productForm.price}
              onChange={handleChange}
              placeholder="price"
              className="rounded-2xl border px-3 py-2 outline-none"
            />
            <input
              name="leadTimeDays"
              value={productForm.leadTimeDays}
              onChange={handleChange}
              placeholder="lead time (days)"
              className="rounded-2xl border px-3 py-2 outline-none"
            />
            <input
              name="safetyStock"
              value={productForm.safetyStock}
              onChange={handleChange}
              placeholder="safety stock"
              className="rounded-2xl border px-3 py-2 outline-none"
            />
          </div>

          <button
            disabled={saving}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-black px-4 py-2 text-white hover:opacity-90 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {saving ? "Saving..." : "Save Product"}
          </button>
        </motion.form>

        {/* Search + Range */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 rounded-2xl border bg-white px-3 py-2 shadow-sm">
            <Search className="h-4 w-4 text-gray-600" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by slug..."
              className="w-72 outline-none"
            />
          </div>

          <div className="flex items-center gap-2 rounded-2xl border bg-white p-2 shadow-sm">
            <label className="text-sm text-gray-600">Range</label>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="rounded-xl border px-3 py-2 text-sm outline-none"
            >
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>
        </div>

        {/* KPI cards */}
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <StatCard
            title="Revenue"
            value={`₹ ${analytics?.kpis?.revenue ?? 0}`}
            icon={IndianRupee}
          />
          <StatCard
            title="Sales Txns"
            value={`${analytics?.kpis?.salesCount ?? 0}`}
            icon={ShoppingCart}
          />
          <StatCard
            title="Avg Sale Value"
            value={`₹ ${analytics?.kpis?.aov ?? 0}`}
            icon={TrendingUp}
          />
        </div>

        {/* Charts */}
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border bg-white p-4 shadow-sm"
          >
            <h2 className="font-semibold">Revenue Trend</h2>
            <p className="text-sm text-gray-600">Uses transactions.sale + priceSnapshot</p>
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
            <p className="text-sm text-gray-600">Most sold by units</p>
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

        {/* Reorder + Recommendations */}
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border bg-white p-4 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Smart Auto-Reorder</h2>
                <p className="text-sm text-gray-600">Velocity + leadTime + safetyStock</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-gray-600" />
                {suggestions.filter((s) => s.urgency === "high" || s.urgency === "critical").length} urgent
              </div>
            </div>

            <div className="mt-4 max-h-[340px] overflow-auto rounded-xl border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-left text-gray-600">
                    <th className="p-3">Slug</th>
                    <th className="p-3">Qty</th>
                    <th className="p-3">ROP</th>
                    <th className="p-3">Suggest</th>
                    <th className="p-3">Action</th>
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
                        <button
                          onClick={() => onRestock(s.slug, Math.max(1, s.recommendedQty))}
                          className="rounded-xl border bg-white px-3 py-2 text-xs hover:bg-gray-50"
                        >
                          Restock
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!suggestions.length && (
                    <tr>
                      <td className="p-4 text-gray-600" colSpan={5}>
                        No suggestions yet. Record a few sales.
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
                  {recoSlug ? `For "${recoSlug}"` : "Trending fallback"}
                </p>
              </div>
              <div className="rounded-xl border bg-white p-2">
                <Sparkles className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <input
                value={recoSlug}
                onChange={(e) => setRecoSlug(e.target.value)}
                placeholder="Enter a product slug..."
                className="w-full rounded-2xl border px-3 py-2 outline-none"
              />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(reco?.recommendations || []).map((r) => (
                <motion.div
                  key={r.slug}
                  whileHover={{ scale: 1.02 }}
                  className="rounded-2xl border bg-gradient-to-b from-white to-indigo-50 p-4 shadow-sm"
                >
                  <p className="font-semibold">{r.slug}</p>
                  <p className="text-sm text-gray-600">score: {r.score}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setRecoSlug(r.slug)}
                      className="rounded-xl border bg-white px-3 py-2 text-xs hover:bg-gray-50"
                    >
                      Explore
                    </button>
                    <button
                      onClick={() => onSellOne(r.slug)}
                      className="rounded-xl bg-black px-3 py-2 text-xs text-white hover:opacity-90"
                    >
                      Sell 1
                    </button>
                  </div>
                </motion.div>
              ))}
              {!reco?.recommendations?.length && (
                <p className="text-sm text-gray-600">No recommendations yet.</p>
              )}
            </div>
          </motion.div>
        </div>

        {/* Products Table */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 rounded-2xl border bg-white p-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Current Stock</h2>
            <Badge text={`${filtered.length} items`} />
          </div>

          <div className="mt-4 overflow-auto rounded-xl border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left text-gray-600">
                  <th className="p-3">Slug</th>
                  <th className="p-3">Qty</th>
                  <th className="p-3">Price</th>
                  <th className="p-3">Lead</th>
                  <th className="p-3">Safety</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const qty = toNum(p.quantity);
                  return (
                    <tr key={p.slug} className="border-t">
                      <td className="p-3 font-medium">{p.slug}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {qty}
                          {qty <= 0 ? (
                            <span className="rounded-full border border-red-200 bg-red-50 px-2 py-1 text-xs">
                              out
                            </span>
                          ) : qty < 5 ? (
                            <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs">
                              low
                            </span>
                          ) : (
                            <span className="rounded-full border px-2 py-1 text-xs">
                              ok
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3">₹ {toNum(p.price)}</td>
                      <td className="p-3">{toNum(p.leadTimeDays, 7)}d</td>
                      <td className="p-3">{toNum(p.safetyStock, 5)}</td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => onSellOne(p.slug)}
                            className="rounded-xl bg-black px-3 py-2 text-xs text-white hover:opacity-90"
                          >
                            Sell 1
                          </button>
                          <button
                            onClick={() => onRestock(p.slug, 10)}
                            className="rounded-xl border bg-white px-3 py-2 text-xs hover:bg-gray-50"
                          >
                            Restock +10
                          </button>
                          <button
                            onClick={() => onDelete(p.slug)}
                            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs hover:bg-red-100"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!filtered.length && (
                  <tr>
                    <td className="p-4 text-gray-600" colSpan={6}>
                      No products found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
