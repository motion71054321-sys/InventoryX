"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, db } from "@/lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // login or signup mode
  const initialMode =
    searchParams.get("mode") === "signup" ? "signup" : "login";

  const [mode, setMode] = useState(initialMode);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    const cleanEmail = email.trim();
    const cleanName = name.trim();

    if (!cleanEmail) return setError("Email is required");
    if (!password || password.length < 6)
      return setError("Password must be at least 6 characters");

    if (mode === "signup" && !cleanName)
      return setError("Name is required");

    try {
      setLoading(true);

      let cred;

      // ---------- LOGIN ----------
      if (mode === "login") {
        cred = await signInWithEmailAndPassword(
          auth,
          cleanEmail,
          password
        );
      }

      // ---------- SIGNUP ----------
      else {
        cred = await createUserWithEmailAndPassword(
          auth,
          cleanEmail,
          password
        );

        await updateProfile(cred.user, {
          displayName: cleanName,
        });

        await setDoc(
          doc(db, "users", cred.user.uid),
          {
            uid: cred.user.uid,
            email: cred.user.email,
            displayName: cleanName,
            role: "user",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      // ---------- CREATE SESSION ----------
      const idToken = await cred.user.getIdToken();

      const endpoint =
        mode === "login" ? "/api/auth/login" : "/api/auth/signup";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body:
          mode === "login"
            ? JSON.stringify({ idToken })
            : JSON.stringify({ idToken, name: cleanName }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.error || "Authentication failed");
      }

      // ---------- REDIRECT ----------
      router.replace("/products");
      router.refresh();
    } catch (err) {
      setError(err?.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50">
      <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">
          {mode === "login" ? "Login" : "Create account"}
        </h1>

        {/* Mode Switch */}
        <div className="mt-4 grid grid-cols-2 rounded-xl border bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
              mode === "login"
                ? "bg-white shadow-sm"
                : "text-slate-600"
            }`}
          >
            Login
          </button>

          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`rounded-lg px-3 py-2 text-sm font-semibold ${
              mode === "signup"
                ? "bg-white shadow-sm"
                : "text-slate-600"
            }`}
          >
            Sign up
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          {mode === "signup" && (
            <input
              className="w-full rounded-xl border px-4 py-2"
              placeholder="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          )}

          <input
            className="w-full rounded-xl border px-4 py-2"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            className="w-full rounded-xl border px-4 py-2"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            disabled={loading}
            className="w-full rounded-xl bg-black px-4 py-2 text-white font-semibold disabled:opacity-60"
          >
            {loading
              ? "Please wait..."
              : mode === "login"
              ? "Login"
              : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}
