"use client";

import { motion } from "framer-motion";
import {
  Boxes,
  Search,
  ShieldCheck,
  Sparkles,
  Pencil,
  Trash2,
  BarChart3,
  Cloud,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";

export default function Home() {
  const features = [
    {
      icon: <Sparkles className="h-5 w-5" />,
      title: "Smart Recommendation System",
      desc: "Get product suggestions and stock insights based on trends, low-stock risk, and movement history.",
    },
    {
      icon: <Boxes className="h-5 w-5" />,
      title: "Add & Manage Products",
      desc: "Create products with quantity and pricing. Maintain a clean and searchable catalog.",
    },
    {
      icon: <Pencil className="h-5 w-5" />,
      title: "Edit Products Anytime",
      desc: "Quickly update quantity, price, or details from the products table—changes reflect instantly.",
    },
    {
      icon: <Trash2 className="h-5 w-5" />,
      title: "Delete With Confidence",
      desc: "Safe delete flows with confirmation. Remove unused items while keeping your inventory accurate.",
    },
    {
      icon: <Search className="h-5 w-5" />,
      title: "Fast Search & Filters",
      desc: "Search by product name/slug and filter by stock status to find items in seconds.",
    },
    {
      icon: <BarChart3 className="h-5 w-5" />,
      title: "Reports & Insights",
      desc: "Track low stock, inventory value, and movement summaries for better purchasing decisions.",
    },
  ];

  const steps = [
    "Login or create an account securely",
    "Add products to your inventory",
    "Search and view items in a clean table",
    "Edit details or delete products securely",
    "Get recommendations for restocking & optimization",
  ];

  return (
    <div className="min-h-screen bg-linear-to-b from-white via-sky-50 to-white text-slate-900">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-105 w-105 -translate-x-1/2 rounded-full bg-sky-200/35 blur-3xl" />
        <div className="absolute top-32 -left-24 h-85 w-85 rounded-full bg-blue-200/30 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-90 w-90 rounded-full bg-sky-200/25 blur-3xl" />
      </div>

      {/* Header (Login/Signup ONLY here) */}
      <header className="relative z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
          <div className="flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white shadow-sm ring-1 ring-sky-200">
              <Cloud className="h-5 w-5 text-sky-700" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-slate-900">InventoryX</p>
              <p className="text-xs text-slate-500">
                Inventory Management • Next.js • MongoDB
              </p>
            </div>
          </div>

          <nav className="hidden items-center gap-6 md:flex">
            <a
              href="#features"
              className="text-sm text-slate-600 hover:text-slate-900 transition"
            >
              Features
            </a>
            <a
              href="#how"
              className="text-sm text-slate-600 hover:text-slate-900 transition"
            >
              How it works
            </a>
            <a
              href="#security"
              className="text-sm text-slate-600 hover:text-slate-900 transition"
            >
              Security
            </a>

            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-sky-200 hover:ring-sky-300 transition"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 transition"
              >
                Sign up
              </Link>
            </div>
          </nav>

          {/* Mobile */}
          <div className="md:hidden flex items-center gap-2">
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-sky-200 hover:ring-sky-300 transition"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 transition"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="relative z-10">
        {/* Hero */}
        <div className="mx-auto max-w-6xl px-4 pb-14 pt-8 md:pt-14">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6"
            >
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-sky-700 shadow-sm ring-1 ring-sky-200">
                <ShieldCheck className="h-4 w-4" />
                Professional inventory control with smart insights
              </div>

              <h1 className="text-3xl font-bold tracking-tight text-slate-900 md:text-5xl">
                Manage inventory with confidence — and{" "}
                <span className="text-sky-700">recommendations</span> that help
                you restock smarter.
              </h1>

              <p className="text-base leading-relaxed text-slate-600 md:text-lg">
                InventoryX is a clean, modern inventory management system built
                with Next.js and MongoDB. Add products, view them in a table,
                and safely edit or delete items. Our recommendation system helps
                you spot trends and reduce stock-outs.
              </p>

              <div className="grid grid-cols-3 gap-3 pt-2">
                {[
                  { label: "Fast CRUD", value: "1-click" },
                  { label: "Search", value: "Instant" },
                  { label: "Insights", value: "Smart" },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-sky-100"
                  >
                    <p className="text-lg font-bold text-slate-900">
                      {stat.value}
                    </p>
                    <p className="text-xs text-slate-500">{stat.label}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right panel mock (no login/signup buttons here) */}
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.1 }}
              className="relative"
            >
              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-sky-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Products Overview
                    </p>
                    <p className="text-xs text-slate-500">
                      Sample view • clean table + actions
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-xl bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800 ring-1 ring-sky-100">
                    <Sparkles className="h-4 w-4" />
                    Recommendations ON
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {[
                    {
                      name: "USB-C Cable",
                      sku: "USBC-101",
                      qty: 14,
                      status: "Healthy",
                    },
                    {
                      name: "Wireless Mouse",
                      sku: "MSE-220",
                      qty: 4,
                      status: "Low Stock",
                    },
                    {
                      name: "Notebook (A5)",
                      sku: "NBK-500",
                      qty: 0,
                      status: "Out of Stock",
                    },
                  ].map((p, idx) => (
                    <motion.div
                      key={p.sku}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.35, delay: 0.15 + idx * 0.08 }}
                      className="flex items-center justify-between rounded-2xl bg-sky-50/60 px-4 py-3 ring-1 ring-sky-100"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {p.name}
                        </p>
                        <p className="text-xs text-slate-500">SKU: {p.sku}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 ring-1 ring-sky-100">
                          Qty: {p.qty}
                        </span>

                        <span
                          className={[
                            "rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
                            p.status === "Healthy"
                              ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                              : p.status === "Low Stock"
                              ? "bg-amber-50 text-amber-700 ring-amber-100"
                              : "bg-rose-50 text-rose-700 ring-rose-100",
                          ].join(" ")}
                        >
                          {p.status}
                        </span>

                        <button
                          type="button"
                          className="grid h-9 w-9 place-items-center rounded-xl bg-white ring-1 ring-sky-100 hover:ring-sky-200 transition"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4 text-sky-800" />
                        </button>
                        <button
                          type="button"
                          className="grid h-9 w-9 place-items-center rounded-xl bg-white ring-1 ring-sky-100 hover:ring-sky-200 transition"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-rose-600" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-sky-100">
                  <p className="text-sm font-semibold text-slate-900">
                    Recommendation
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Restock{" "}
                    <span className="font-semibold">Wireless Mouse</span> (Qty:
                    4). Based on recent usage, it may run low soon—avoid stock-out.
                  </p>
                </div>
              </div>

              <div className="absolute -bottom-6 -left-6 hidden h-24 w-24 rounded-3xl bg-sky-200/50 blur-2xl md:block" />
              <div className="absolute -top-6 -right-6 hidden h-24 w-24 rounded-3xl bg-blue-200/40 blur-2xl md:block" />
            </motion.div>
          </div>
        </div>

        {/* Features */}
        <section id="features" className="relative z-10">
          <div className="mx-auto max-w-6xl px-4 py-12">
            <div className="flex items-end justify-between gap-6">
              <div>
                <p className="text-sm font-semibold text-sky-700">
                  Core Features
                </p>
                <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                  Everything you need to manage inventory
                </h2>
                <p className="mt-2 max-w-2xl text-slate-600">
                  Built for clean workflows: maintain accurate stock, update
                  products in seconds, and leverage recommendations to make
                  smarter purchase decisions.
                </p>
              </div>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-sky-100 hover:ring-sky-200 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-sky-50 text-sky-800 ring-1 ring-sky-100">
                      {f.icon}
                    </div>
                    <p className="text-base font-semibold text-slate-900">
                      {f.title}
                    </p>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">
                    {f.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="relative z-10">
          <div className="mx-auto max-w-6xl px-4 pb-12">
            <div className="rounded-3xl bg-white p-8 shadow-sm ring-1 ring-sky-200">
              <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-sm font-semibold text-sky-700">
                    How it works
                  </p>
                  <h3 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                    Simple workflow, powerful control
                  </h3>
                  <p className="mt-2 max-w-2xl text-slate-600">
                    InventoryX keeps everything transparent: products live in
                    MongoDB, actions are fast, and recommendations highlight what
                    matters next.
                  </p>
                </div>

                <div className="flex items-center gap-2 rounded-2xl bg-sky-50 px-4 py-3 ring-1 ring-sky-100">
                  <ShieldCheck className="h-5 w-5 text-sky-700" />
                  <p className="text-sm font-semibold text-slate-800">
                    Safe edit/delete with confirmation
                  </p>
                </div>
              </div>

              <div className="mt-8 grid gap-3 md:grid-cols-2">
                {steps.map((s) => (
                  <div
                    key={s}
                    className="flex items-start gap-3 rounded-2xl bg-sky-50/60 p-4 ring-1 ring-sky-100"
                  >
                    <CheckCircle2 className="mt-0.5 h-5 w-5 text-sky-700" />
                    <p className="text-sm font-medium text-slate-700">{s}</p>
                  </div>
                ))}
              </div>

              <div className="mt-8 flex items-center gap-2 text-sm text-slate-600">
                <Cloud className="h-4 w-4 text-sky-700" />
                Built on Next.js + MongoDB Atlas
              </div>
            </div>
          </div>
        </section>

        {/* Security */}
        <section id="security" className="relative z-10">
          <div className="mx-auto max-w-6xl px-4 pb-14">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-sky-100">
                <p className="text-sm font-semibold text-slate-900">
                  Reliable CRUD
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Add, edit, and delete products with predictable, safe API
                  updates to MongoDB.
                </p>
              </div>
              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-sky-100">
                <p className="text-sm font-semibold text-slate-900">
                  Clean Data Rules
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Server-side validation ensures correct quantity/price formats
                  and prevents broken entries.
                </p>
              </div>
              <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-sky-100">
                <p className="text-sm font-semibold text-slate-900">
                  Confirmation on Delete
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Prevent accidental removals with confirmation flows and clear
                  UI feedback.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer (no login/signup here) */}
        <footer className="relative z-10 border-t border-sky-100 bg-white/70 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-8 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-slate-600">
              © {new Date().getFullYear()} InventoryX • Built with Next.js &
              MongoDB
            </div>
            <div className="flex items-center gap-4 text-sm">
              <a
                href="#features"
                className="text-slate-600 hover:text-slate-900 transition"
              >
                Features
              </a>
              <a
                href="#how"
                className="text-slate-600 hover:text-slate-900 transition"
              >
                How it works
              </a>
              <a
                href="#security"
                className="text-slate-600 hover:text-slate-900 transition"
              >
                Security
              </a>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
