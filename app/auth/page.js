"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from "@/lib/firebase"; // adjust path if needed
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
} from "firebase/auth";

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // allow /auth?mode=signup or /auth?mode=login
  const initialMode = searchParams.get("mode") === "signup" ? "signup" : "login";

  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // if already logged in, go to dashboard
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) router.replace("/dashboard"); // change if your dashboard route differs
    });
    return () => unsub();
  }, [router]);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      router.replace("/dashboard");
    } catch (error) {
      setErr(error?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">
          {mode === "login" ? "Login" : "Create account"}
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          {mode === "login"
            ? "Welcome back to InventoryX"
            : "Start managing inventory with InventoryX"}
        </p>

        {/* Toggle */}
        <div className="mt-5 grid grid-cols-2 rounded-xl border bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              mode === "login" ? "bg-white shadow-sm" : "text-slate-600"
            }`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              mode === "signup" ? "bg-white shadow-sm" : "text-slate-600"
            }`}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={submit} className="mt-5 space-y-4">
          <input
            className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-900/15"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-slate-900/15"
            type="password"
            placeholder="Password (min 6 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {err ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {err}
            </div>
          ) : null}

          <button
            disabled={loading}
            className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 active:scale-[0.99] transition disabled:opacity-60"
          >
            {loading ? "Please wait..." : mode === "login" ? "Login" : "Sign Up"}
          </button>
        </form>
      </div>
    </div>
  );
}
