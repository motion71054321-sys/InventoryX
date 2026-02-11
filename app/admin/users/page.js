"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Shield,
  Users,
  Loader2,
  ArrowLeft,
  UserCog,
  CheckCircle2,
  XCircle,
} from "lucide-react";

import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

export default function AdminUsersPage() {
  const [authLoading, setAuthLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(true);

  const [me, setMe] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  const [qText, setQText] = useState("");
  const [savingUid, setSavingUid] = useState(null);

  const setRoleCookie = (role) => {
    document.cookie = `inventoryx_role=${role}; path=/; samesite=lax`;
  };

  const clearRoleCookie = () => {
    document.cookie = "inventoryx_role=; path=/; max-age=0; samesite=lax";
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setMe(u);
      setAuthLoading(false);

      if (!u) {
        clearRoleCookie();
        window.location.href = "/login";
        return;
      }

      setRoleLoading(true);
      try {
        const snap = await getDoc(doc(db, "users", u.uid));
        const role = snap.exists() ? snap.data()?.role : "user";
        const admin = role === "admin";
        setIsAdmin(admin);

        // keep cookie aligned
        setRoleCookie(admin ? "admin" : "user");

        if (!admin) window.location.href = "/products";
      } catch (e) {
        console.error("Admin check failed:", e);
        window.location.href = "/products";
      } finally {
        setRoleLoading(false);
      }
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    if (!me || roleLoading || !isAdmin) return;

    setLoadingUsers(true);
    const qref = query(collection(db, "users"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      qref,
      (snap) => {
        setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoadingUsers(false);
      },
      (err) => {
        console.error(err);
        setLoadingUsers(false);
      }
    );

    return () => unsub();
  }, [me, roleLoading, isAdmin]);

  const filteredUsers = useMemo(() => {
    const s = qText.trim().toLowerCase();
    if (!s) return users;

    return users.filter((u) => {
      const email = (u.email || "").toLowerCase();
      const name = (u.displayName || "").toLowerCase();
      const role = (u.role || "user").toLowerCase();
      return email.includes(s) || name.includes(s) || role.includes(s);
    });
  }, [users, qText]);

  const changeRole = async (targetUid, nextRole) => {
    if (!me) return;
    if (targetUid === me.uid && nextRole !== "admin") {
      return alert("You cannot remove your own admin role from this screen.");
    }

    setSavingUid(targetUid);
    try {
      await updateDoc(doc(db, "users", targetUid), {
        role: nextRole,
        updatedAt: serverTimestamp(),
      });
    } catch (e) {
      alert(e?.message || "Failed to update role.");
    } finally {
      setSavingUid(null);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      clearRoleCookie();
      window.location.href = "/login";
    } catch (e) {
      alert(e?.message || "Logout failed.");
    }
  };

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-white">
        <div className="flex items-center gap-2 text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading admin panel...
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

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
              <Shield className="h-5 w-5 text-sky-700" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-slate-900">InventoryX • Admin</p>
              <p className="text-xs text-slate-500">{me?.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/products"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-sky-200 hover:ring-sky-300 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>

            <button
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <div className="mx-auto max-w-6xl px-4 py-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-sky-200"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-sky-50 ring-1 ring-sky-100">
                  <Users className="h-5 w-5 text-sky-700" />
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-900">Users</p>
                  <p className="text-xs text-slate-500">Promote/demote roles</p>
                </div>
              </div>

              <input
                value={qText}
                onChange={(e) => setQText(e.target.value)}
                placeholder="Search users..."
                className="w-full sm:w-80 rounded-2xl bg-sky-50/70 px-3 py-2.5 text-sm outline-none ring-1 ring-sky-100 focus:ring-sky-200"
              />
            </div>

            <div className="mt-5 overflow-x-auto rounded-2xl ring-1 ring-sky-100">
              <table className="min-w-full text-sm">
                <thead className="bg-sky-50">
                  <tr className="text-left text-xs font-semibold text-slate-600">
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-sky-100 bg-white">
                  {loadingUsers ? (
                    <tr>
                      <td className="px-4 py-6 text-slate-600" colSpan={4}>
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Loading users...
                        </div>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td className="px-4 py-6 text-slate-600" colSpan={4}>
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const r = u.role === "admin" ? "admin" : "user";
                      const isMe = u.id === me?.uid;

                      return (
                        <tr key={u.id} className="hover:bg-sky-50/40 transition">
                          <td className="px-4 py-3 font-medium text-slate-900">
                            {u.displayName || (isMe ? "You" : "—")}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{u.email || "—"}</td>
                          <td className="px-4 py-3">
                            <span
                              className={[
                                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
                                r === "admin"
                                  ? "bg-sky-50 text-sky-700 ring-sky-100"
                                  : "bg-white text-slate-700 ring-slate-200",
                              ].join(" ")}
                            >
                              <UserCog className="h-3.5 w-3.5" />
                              {r}
                              {isMe ? " • me" : ""}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => changeRole(u.id, "admin")}
                                disabled={savingUid === u.id || r === "admin"}
                                className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-900 ring-1 ring-sky-200 hover:ring-sky-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                              >
                                {savingUid === u.id && r !== "admin" ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <CheckCircle2 className="h-4 w-4 text-sky-700" />
                                )}
                                Make admin
                              </button>

                              <button
                                onClick={() => changeRole(u.id, "user")}
                                disabled={savingUid === u.id || r === "user"}
                                className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-rose-700 ring-1 ring-rose-200 hover:ring-rose-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                              >
                                {savingUid === u.id && r !== "user" ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <XCircle className="h-4 w-4" />
                                )}
                                Make user
                              </button>
                            </div>

                            {isMe ? (
                              <p className="mt-2 text-right text-[11px] text-slate-500">
                                You can’t demote yourself here.
                              </p>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              Users appear here after they login once (a profile doc is created).
            </p>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
