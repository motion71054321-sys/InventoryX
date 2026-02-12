"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebaseClient";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (!cleanName) return setError("Name is required");
    if (!cleanEmail) return setError("Email is required");
    if (!password || password.length < 6) return setError("Password must be at least 6 characters");

    try {
      setLoading(true);

      // 1) Create Firebase user
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);

      // 2) Set display name (optional but recommended)
      await updateProfile(cred.user, { displayName: cleanName });

      // 3) Get ID token
      const idToken = await cred.user.getIdToken();

      // 4) Create session cookie (server)
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, name: cleanName }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Signup failed");

      // 5) Redirect
      router.push("/dashboard"); // change to "/" if you want home
    } catch (err) {
      setError(err?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-indigo-50 via-white to-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="rounded-3xl border bg-white/80 backdrop-blur p-6 shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight">Create your InventoryX account</h1>
          <p className="mt-1 text-sm text-gray-600">
            Sign up to manage stock, sales insights, and smart reorder suggestions.
          </p>

          {error ? (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleSignup} className="mt-5 space-y-3">
            <div>
              <label className="text-sm text-gray-700">Name</label>
              <input
                className="mt-1 w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>

            <div>
              <label className="text-sm text-gray-700">Email</label>
              <input
                className="mt-1 w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>

            <div>
              <label className="text-sm text-gray-700">Password</label>
              <input
                type="password"
                className="mt-1 w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <button
              disabled={loading}
              className="w-full rounded-2xl bg-black px-4 py-3 text-white font-medium hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-4 text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-indigo-600 hover:underline">
              Log in
            </Link>
          </p>
        </div>

        <p className="mt-4 text-center text-xs text-gray-500">
          By signing up, you agree to use InventoryX responsibly.
        </p>
      </div>
    </div>
  );
}
