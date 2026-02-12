"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebaseClient";

export default function LogoutButton({ className = "" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const logout = async () => {
    try {
      setLoading(true);

      // 1) Sign out from Firebase on client
      await signOut(auth);

      // 2) Clear the server session cookie
      await fetch("/api/logout", { method: "POST" });

      // 3) Redirect to login page
      router.push("/login");
      router.refresh();
    } catch (e) {
      console.error("Logout failed:", e);
      alert(e.message || "Logout failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={logout}
      disabled={loading}
      className={
        className ||
        "rounded-2xl border bg-white px-4 py-2 text-sm shadow-sm hover:bg-gray-50 disabled:opacity-50"
      }
    >
      {loading ? "Logging out..." : "Logout"}
    </button>
  );
}
