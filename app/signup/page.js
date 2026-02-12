"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { Cloud, Lock, Mail, User, ArrowRight, Loader2 } from "lucide-react";

import { auth, db } from "@/lib/firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export default function SignupPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const setRoleCookie = (role) => {
    document.cookie = `inventoryx_role=${role}; path=/; samesite=lax`;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password || !form.name) return;

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);

      await updateProfile(cred.user, { displayName: form.name });

      // Create user profile doc
      await setDoc(
        doc(db, "users", cred.user.uid),
        {
          email: cred.user.email || null,
          displayName: form.name || null,
          role: "user",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setRoleCookie("user");
      window.location.href = "/products";
    } catch (err) {
      alert(err?.message || "Signup failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-white via-sky-50 to-white text-slate-900">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-105 w-105 -translate-x-1/2 rounded-full bg-sky-200/30 blur-3xl" />
        <div className="absolute top-40 -left-24 h-80 w-[320px] rounded-full bg-blue-200/25 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-90 w-90 rounded-full bg-sky-200/25 blur-3xl" />
      </div>

      <header className="relative z-10 border-b border-sky-100 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
          <div className="flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white shadow-sm ring-1 ring-sky-200">
              <Cloud className="h-5 w-5 text-sky-700" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-slate-900">InventoryX</p>
              <p className="text-xs text-slate-500">Create your account</p>
            </div>
          </div>

          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-sky-200 hover:ring-sky-300 transition"
          >
            Login
            <ArrowRight className="h-4 w-4 text-sky-700" />
          </Link>
        </div>
      </header>

      <main className="relative z-10">
        <div className="mx-auto max-w-md px-4 py-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-sky-200"
          >
            <p className="text-sm font-semibold text-sky-700">Get started</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">Sign up</h1>
            <p className="mt-2 text-sm text-slate-600">
              Create your account and start managing products.
            </p>

            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600">Name</label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full rounded-2xl bg-sky-50/70 py-2.5 pl-9 pr-3 text-sm outline-none ring-1 ring-sky-100 focus:ring-sky-200"
                    placeholder="Your name"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">Email</label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full rounded-2xl bg-sky-50/70 py-2.5 pl-9 pr-3 text-sm outline-none ring-1 ring-sky-100 focus:ring-sky-200"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600">Password</label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full rounded-2xl bg-sky-50/70 py-2.5 pl-9 pr-3 text-sm outline-none ring-1 ring-sky-100 focus:ring-sky-200"
                    placeholder="Minimum 6 characters"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Creating...
                  </>
                ) : (
                  <>
                    Create account <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <p className="text-xs text-slate-500">
                Already have an account?{" "}
                <Link href="/login" className="font-semibold text-sky-700 hover:underline">
                  Login
                </Link>
              </p>
            </form>
          </motion.div>
        </div>
      </main>
    </div>
  );
}