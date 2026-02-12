"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Cloud,
  Plus,
  Search,
  Pencil,
  Trash2,
  X,
  LogOut,
  Package,
  Loader2,
  Download,
  ArrowUpDown,
  Shield,
  History,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  where,
  getDocs,
  getDoc,
  setDoc,
  doc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  limit,
} from "firebase/firestore";

export default function ProductsPage() {
  // ---------------- AUTH + ROLE ----------------
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [roleLoading, setRoleLoading] = useState(true);
  const [role, setRole] = useState("user"); // "user" | "admin"
  const isAdmin = role === "admin";

  // Admin view controls
  const [adminViewAll, setAdminViewAll] = useState(false);
  const [ownerFilter, setOwnerFilter] = useState("all"); // uid or "all"

  // ---------------- PRODUCTS ----------------
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // ---------------- HISTORY ----------------
  const [historyRows, setHistoryRows] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // ---------------- UI STATE ----------------
  const [qText, setQText] = useState("");

  const [form, setForm] = useState({
    name: "",
    sku: "",
    quantity: "",
    price: "",
  });

  const [saving, setSaving] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editItem, setEditItem] = useState(null);

  // Sorting + Pagination
  const [sortKey, setSortKey] = useState("updatedAt"); // name | sku | quantity | price | value | updatedAt
  const [sortDir, setSortDir] = useState("desc"); // asc | desc

  const [pageSize, setPageSize] = useState(8);
  const [page, setPage] = useState(1);

  const setRoleCookie = (r) => {
    document.cookie = `inventoryx_role=${r}; path=/; samesite=lax`;
  };

  const clearRoleCookie = () => {
    document.cookie = "inventoryx_role=; path=/; max-age=0; samesite=lax";
  };

  // ---------------- AUTH GUARD + ROLE LOAD ----------------
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setAuthLoading(false);

      if (!u) {
        clearRoleCookie();
        window.location.href = "/login";
        return;
      }

      setRoleLoading(true);
      try {
        const userRef = doc(db, "users", u.uid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) {
          await setDoc(
            userRef,
            {
              email: u.email || null,
              displayName: u.displayName || null,
              role: "user",
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
          setRole("user");
          setRoleCookie("user");
        } else {
          const data = snap.data() || {};
          const r = data.role === "admin" ? "admin" : "user";
          setRole(r);
          setRoleCookie(r);
        }
      } catch (e) {
        console.error("Role load failed:", e);
        setRole("user");
        setRoleCookie("user");
      } finally {
        setRoleLoading(false);
      }
    });

    return () => unsub();
  }, []);

  // Reset admin controls if not admin
  useEffect(() => {
    if (!isAdmin) {
      setAdminViewAll(false);
      setOwnerFilter("all");
    }
  }, [isAdmin]);

  // ---------------- REALTIME PRODUCTS ----------------
  useEffect(() => {
    if (!user || roleLoading) return;

    setLoadingProducts(true);

    const base = collection(db, "products");
    const qref =
      isAdmin && adminViewAll
        ? query(base, orderBy("createdAt", "desc"))
        : query(base, where("ownerId", "==", user.uid), orderBy("createdAt", "desc"));

    const unsub = onSnapshot(
      qref,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setProducts(rows);
        setLoadingProducts(false);
      },
      (err) => {
        console.error(err);
        setLoadingProducts(false);
      }
    );

    return () => unsub();
  }, [user, roleLoading, isAdmin, adminViewAll]);

  // ---------------- REALTIME HISTORY (last 200) ----------------
  useEffect(() => {
    if (!user || roleLoading) return;

    setLoadingHistory(true);

    const base = collection(db, "stockHistory");
    const qref =
      isAdmin && adminViewAll
        ? query(base, orderBy("timestamp", "desc"), limit(200))
        : query(base, where("ownerId", "==", user.uid), orderBy("timestamp", "desc"), limit(200));

    const unsub = onSnapshot(
      qref,
      (snap) => {
        const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setHistoryRows(rows);
        setLoadingHistory(false);
      },
      (err) => {
        console.error(err);
        setLoadingHistory(false);
      }
    );

    return () => unsub();
  }, [user, roleLoading, isAdmin, adminViewAll]);

  // ---------------- SEARCH + OWNER FILTER ----------------
  const visibleProducts = useMemo(() => {
    const s = qText.trim().toLowerCase();
    let list = products;

    if (isAdmin && adminViewAll && ownerFilter !== "all") {
      list = list.filter((p) => p.ownerId === ownerFilter);
    }

    if (!s) return list;

    return list.filter((p) => {
      const name = (p.name || "").toLowerCase();
      const sku = (p.sku || "").toLowerCase();
      const ownerEmail = (p.ownerEmail || "").toLowerCase();
      return name.includes(s) || sku.includes(s) || ownerEmail.includes(s);
    });
  }, [qText, products, isAdmin, adminViewAll, ownerFilter]);

  // ---------------- SORTING ----------------
  const sortedProducts = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;

    const getValue = (p) => {
      if (sortKey === "name") return (p.name || "").toLowerCase();
      if (sortKey === "sku") return (p.sku || "").toLowerCase();
      if (sortKey === "quantity") return Number(p.quantity || 0);
      if (sortKey === "price") return Number(p.price || 0);
      if (sortKey === "value") return Number(p.quantity || 0) * Number(p.price || 0);

      const upd = p.updatedAt?.seconds ? p.updatedAt.seconds : null;
      const crt = p.createdAt?.seconds ? p.createdAt.seconds : null;
      return upd ?? crt ?? 0;
    };

    const list = [...visibleProducts].sort((a, b) => {
      const va = getValue(a);
      const vb = getValue(b);

      if (typeof va === "number" && typeof vb === "number") return (va - vb) * dir;
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });

    return list;
  }, [visibleProducts, sortKey, sortDir]);

  // ---------------- PAGINATION ----------------
  useEffect(() => {
    setPage(1);
  }, [qText, ownerFilter, pageSize, sortKey, sortDir, adminViewAll]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(sortedProducts.length / pageSize)), [
    sortedProducts.length,
    pageSize,
  ]);

  const pagedProducts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedProducts.slice(start, start + pageSize);
  }, [sortedProducts, page, pageSize]);

  // ---------------- KPI ----------------
  const totalItems = useMemo(
    () => visibleProducts.reduce((sum, p) => sum + Number(p.quantity || 0), 0),
    [visibleProducts]
  );

  const totalValue = useMemo(
    () =>
      visibleProducts.reduce(
        (sum, p) => sum + Number(p.quantity || 0) * Number(p.price || 0),
        0
      ),
    [visibleProducts]
  );

  const lowStockCount = useMemo(
    () => visibleProducts.filter((p) => Number(p.quantity || 0) <= 5).length,
    [visibleProducts]
  );

  // ---------------- RECOMMENDATION V1 ----------------
  const recommendations = useMemo(() => {
    const now = Date.now();
    const days30 = 30 * 24 * 60 * 60 * 1000;

    const movement = new Map();
    for (const h of historyRows) {
      const ts = h.timestamp?.seconds ? h.timestamp.seconds * 1000 : null;
      if (!ts) continue;
      if (now - ts > days30) continue;

      const delta = Number(h.deltaQty || 0);
      if (delta >= 0) continue;

      const pid = h.productId || "unknown";
      movement.set(pid, (movement.get(pid) || 0) + Math.abs(delta));
    }

    const low = visibleProducts
      .filter((p) => Number(p.quantity || 0) <= 5)
      .map((p) => ({
        productId: p.id,
        name: p.name,
        sku: p.sku,
        qty: Number(p.quantity || 0),
        score: 1000 - Number(p.quantity || 0),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    const fast = visibleProducts
      .map((p) => ({
        productId: p.id,
        name: p.name,
        sku: p.sku,
        qty: Number(p.quantity || 0),
        moved: movement.get(p.id) || 0,
      }))
      .filter((x) => x.moved > 0)
      .sort((a, b) => b.moved - a.moved)
      .slice(0, 5);

    return { low, fast };
  }, [historyRows, visibleProducts]);

  // ---------------- DUPLICATE SKU CHECK (PER OWNER) ----------------
  const skuExistsForOwner = async (sku, ownerId, excludeDocId = null) => {
    const cleanSku = (sku || "").trim();
    if (!cleanSku || !ownerId) return false;

    const qSku = query(
      collection(db, "products"),
      where("ownerId", "==", ownerId),
      where("sku", "==", cleanSku),
      limit(1)
    );

    const snap = await getDocs(qSku);
    if (snap.empty) return false;

    if (excludeDocId) return snap.docs.some((d) => d.id !== excludeDocId);
    return true;
  };

  // ---------------- HISTORY WRITER ----------------
  const writeHistory = async ({
    ownerId,
    ownerEmail,
    productId,
    name,
    sku,
    action, // "create" | "update" | "delete"
    prevQty,
    newQty,
    prevPrice,
    newPrice,
  }) => {
    const deltaQty = Number(newQty || 0) - Number(prevQty || 0);

    await addDoc(collection(db, "stockHistory"), {
      ownerId,
      ownerEmail: ownerEmail || null,
      productId,
      name: name || null,
      sku: sku || null,
      action,
      prevQty: Number(prevQty || 0),
      newQty: Number(newQty || 0),
      deltaQty,
      prevPrice: Number(prevPrice || 0),
      newPrice: Number(newPrice || 0),
      timestamp: serverTimestamp(),
    });
  };

  // ---------------- ADD PRODUCT ----------------
  const addProduct = async (e) => {
    e.preventDefault();

    if (!user) return alert("Please login again.");
    if (!form.name || !form.sku) return alert("Name and SKU are required.");
    if (Number(form.quantity) < 0) return alert("Quantity cannot be negative.");
    if (Number(form.price) < 0) return alert("Price cannot be negative.");

    setSaving(true);
    try {
      const exists = await skuExistsForOwner(form.sku, user.uid);
      if (exists) {
        setSaving(false);
        return alert("This SKU already exists in your inventory. Use Edit instead.");
      }

      const newQty = Number(form.quantity || 0);
      const newPrice = Number(form.price || 0);

      const ref = await addDoc(collection(db, "products"), {
        ownerId: user.uid,
        ownerEmail: user.email || null,
        name: form.name.trim(),
        sku: form.sku.trim(),
        quantity: newQty,
        price: newPrice,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      await writeHistory({
        ownerId: user.uid,
        ownerEmail: user.email || null,
        productId: ref.id,
        name: form.name.trim(),
        sku: form.sku.trim(),
        action: "create",
        prevQty: 0,
        newQty,
        prevPrice: 0,
        newPrice,
      });

      setForm({ name: "", sku: "", quantity: "", price: "" });
    } catch (err) {
      alert(err?.message || "Failed to add product.");
    } finally {
      setSaving(false);
    }
  };

  // ---------------- OPEN EDIT ----------------
  const openEdit = (p) => {
    setEditItem({
      id: p.id,
      ownerId: p.ownerId || user?.uid,
      ownerEmail: p.ownerEmail || null,
      name: p.name || "",
      sku: p.sku || "",
      quantity: String(p.quantity ?? ""),
      price: String(p.price ?? ""),
      _origQty: Number(p.quantity ?? 0),
      _origPrice: Number(p.price ?? 0),
    });
    setEditOpen(true);
  };

  // ---------------- SAVE EDIT ----------------
  const saveEdit = async (e) => {
    e.preventDefault();
    if (!editItem?.name || !editItem?.sku) return alert("Name and SKU are required.");
    if (Number(editItem.quantity) < 0) return alert("Quantity cannot be negative.");
    if (Number(editItem.price) < 0) return alert("Price cannot be negative.");

    setEditSaving(true);
    try {
      const ownerId = editItem.ownerId || user.uid;

      const exists = await skuExistsForOwner(editItem.sku, ownerId, editItem.id);
      if (exists) {
        setEditSaving(false);
        return alert("This SKU is already used by another product. Choose a different SKU.");
      }

      const newQty = Number(editItem.quantity || 0);
      const newPrice = Number(editItem.price || 0);

      await updateDoc(doc(db, "products", editItem.id), {
        name: editItem.name.trim(),
        sku: editItem.sku.trim(),
        quantity: newQty,
        price: newPrice,
        updatedAt: serverTimestamp(),
      });

      await writeHistory({
        ownerId,
        ownerEmail: editItem.ownerEmail || user.email || null,
        productId: editItem.id,
        name: editItem.name.trim(),
        sku: editItem.sku.trim(),
        action: "update",
        prevQty: editItem._origQty,
        newQty,
        prevPrice: editItem._origPrice,
        newPrice,
      });

      setEditOpen(false);
      setEditItem(null);
    } catch (err) {
      alert(err?.message || "Failed to update product.");
    } finally {
      setEditSaving(false);
    }
  };

  // ---------------- DELETE ----------------
  const removeProduct = async (p) => {
    const ok = confirm(`Delete "${p.name}" (SKU: ${p.sku})?`);
    if (!ok) return;

    try {
      await writeHistory({
        ownerId: p.ownerId || user.uid,
        ownerEmail: p.ownerEmail || user.email || null,
        productId: p.id,
        name: p.name || null,
        sku: p.sku || null,
        action: "delete",
        prevQty: Number(p.quantity || 0),
        newQty: 0,
        prevPrice: Number(p.price || 0),
        newPrice: 0,
      });

      await deleteDoc(doc(db, "products", p.id));
    } catch (err) {
      alert(err?.message || "Failed to delete product.");
    }
  };

  // ---------------- LOGOUT ----------------
  const logout = async () => {
    try {
      await signOut(auth);
      clearRoleCookie();
      window.location.href = "/login";
    } catch (err) {
      alert(err?.message || "Logout failed.");
    }
  };

  // ---------------- CSV EXPORT ----------------
  const escapeCSV = (value) => {
    if (value === null || value === undefined) return "";
    const s = String(value);
    if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`;
    return s;
  };

  const exportCSV = () => {
    const rows = sortedProducts.map((p) => ({
      ownerEmail: p.ownerEmail ?? "",
      name: p.name ?? "",
      sku: p.sku ?? "",
      quantity: Number(p.quantity ?? 0),
      price: Number(p.price ?? 0),
      value: Number(p.quantity ?? 0) * Number(p.price ?? 0),
    }));

    if (rows.length === 0) return alert("No products to export.");

    const headers = ["ownerEmail", "name", "sku", "quantity", "price", "value"];
    const csv =
      [headers.join(",")]
        .concat(rows.map((r) => headers.map((h) => escapeCSV(r[h])).join(",")))
        .join("\n") + "\n";

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const safeName = (user?.displayName || user?.email || "inventory")
      .toString()
      .replaceAll(/[^a-zA-Z0-9-_]/g, "_");

    const fileName = `InventoryX_${safeName}_${new Date().toISOString().slice(0, 10)}.csv`;

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  // ---------------- OWNERS LIST (ADMIN FILTER) ----------------
  const owners = useMemo(() => {
    if (!(isAdmin && adminViewAll)) return [];
    const map = new Map();
    for (const p of products) {
      if (!p.ownerId) continue;
      if (!map.has(p.ownerId)) {
        map.set(p.ownerId, { ownerId: p.ownerId, ownerEmail: p.ownerEmail || p.ownerId });
      }
    }
    return Array.from(map.values()).sort((a, b) => (a.ownerEmail || "").localeCompare(b.ownerEmail || ""));
  }, [products, isAdmin, adminViewAll]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen grid place-items-center bg-white">
        <div className="flex items-center gap-2 text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-white via-sky-50 to-white text-slate-900">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/2 h-105 w-105 -translate-x-1/2 rounded-full bg-sky-200/30 blur-3xl" />
        <div className="absolute top-40 -left-24 h-80 w-[320px] rounded-full bg-blue-200/25 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-90 w-90 rounded-full bg-sky-200/25 blur-3xl" />
      </div>

      {/* Top bar */}
      <header className="relative z-10 border-b border-sky-100 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
          <div className="flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white shadow-sm ring-1 ring-sky-200">
              <Cloud className="h-5 w-5 text-sky-700" />
            </div>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-slate-900">InventoryX</p>
              <p className="text-xs text-slate-500">
                {user?.displayName ? `Hi, ${user.displayName}` : user?.email}
                {isAdmin ? (
                  <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-100">
                    <Shield className="h-3 w-3" /> Admin
                  </span>
                ) : null}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <Link
                href="/admin/users"
                className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-sky-200 hover:ring-sky-300 transition"
              >
                Admin
              </Link>
            )}

            <Link
              href="/"
              className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-sky-200 hover:ring-sky-300 transition"
            >
              Home
            </Link>

            <button
              onClick={logout}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 transition"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <div className="mx-auto max-w-6xl px-4 py-8">
          {/* Heading + KPIs */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"
          >
            <div>
              <p className="text-sm font-semibold text-sky-700">Dashboard</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                Products & Inventory
              </h1>
              <p className="mt-2 text-slate-600">
                CRUD + search + sorting + pagination + CSV export + history + recommendations.
              </p>

              {isAdmin && (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setAdminViewAll((v) => !v)}
                    className={[
                      "inline-flex items-center gap-2 rounded-2xl px-3 py-2 text-sm font-semibold ring-1 transition",
                      adminViewAll
                        ? "bg-sky-600 text-white ring-sky-600 hover:bg-sky-700"
                        : "bg-white text-slate-900 ring-sky-200 hover:ring-sky-300",
                    ].join(" ")}
                  >
                    <Shield className="h-4 w-4" />
                    {adminViewAll ? "Viewing: All inventories" : "Viewing: My inventory"}
                  </button>

                  {adminViewAll && (
                    <div className="flex items-center gap-2 rounded-2xl bg-white px-3 py-2 ring-1 ring-sky-200">
                      <span className="text-xs font-semibold text-slate-600">Owner:</span>
                      <select
                        value={ownerFilter}
                        onChange={(e) => setOwnerFilter(e.target.value)}
                        className="bg-transparent text-sm font-semibold text-slate-900 outline-none"
                      >
                        <option value="all">All</option>
                        {owners.map((o) => (
                          <option key={o.ownerId} value={o.ownerId}>
                            {o.ownerEmail}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-sky-100">
                <p className="text-xs text-slate-500">Products</p>
                <p className="mt-1 text-lg font-bold">{visibleProducts.length}</p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-sky-100">
                <p className="text-xs text-slate-500">Total Units</p>
                <p className="mt-1 text-lg font-bold">{totalItems}</p>
              </div>
              <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-sky-100">
                <p className="text-xs text-slate-500">Low Stock</p>
                <p className="mt-1 text-lg font-bold">{lowStockCount}</p>
              </div>
            </div>
          </motion.div>

          {/* Add + Table */}
          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {/* Add product */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.05 }}
              className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-sky-200 lg:col-span-1"
            >
              <div className="flex items-center justify-between">
                <p className="text-base font-semibold text-slate-900">Add product</p>
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-sky-50 ring-1 ring-sky-100">
                  <Plus className="h-5 w-5 text-sky-700" />
                </div>
              </div>

              <form onSubmit={addProduct} className="mt-4 space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">Product name</label>
                  <input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-1 w-full rounded-2xl bg-sky-50/70 px-3 py-2.5 text-sm outline-none ring-1 ring-sky-100 focus:ring-sky-200"
                    placeholder="e.g. Wireless Mouse"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">SKU</label>
                  <input
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    className="mt-1 w-full rounded-2xl bg-sky-50/70 px-3 py-2.5 text-sm outline-none ring-1 ring-sky-100 focus:ring-sky-200"
                    placeholder="e.g. MSE-220"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Quantity</label>
                    <input
                      type="number"
                      value={form.quantity}
                      onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                      className="mt-1 w-full rounded-2xl bg-sky-50/70 px-3 py-2.5 text-sm outline-none ring-1 ring-sky-100 focus:ring-sky-200"
                      placeholder="0"
                      min={0}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600">Price</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      className="mt-1 w-full rounded-2xl bg-sky-50/70 px-3 py-2.5 text-sm outline-none ring-1 ring-sky-100 focus:ring-sky-200"
                      placeholder="0.00"
                      min={0}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" /> Add product
                    </>
                  )}
                </button>

                <p className="text-xs text-slate-500">
                  Duplicate SKUs are blocked per user. Every change is tracked in history.
                </p>
              </form>
            </motion.div>

            {/* Products table + search + sort + pagination + export */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.08 }}
              className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-sky-200 lg:col-span-2"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <div className="grid h-10 w-10 place-items-center rounded-2xl bg-sky-50 ring-1 ring-sky-100">
                    <Package className="h-5 w-5 text-sky-700" />
                  </div>
                  <div>
                    <p className="text-base font-semibold text-slate-900">
                      {isAdmin && adminViewAll ? "All products" : "Your products"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {isAdmin && adminViewAll ? "Admin view across users" : "Only your inventory"}
                    </p>
                  </div>
                </div>

                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                  <div className="relative w-full sm:w-72">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={qText}
                      onChange={(e) => setQText(e.target.value)}
                      placeholder={
                        isAdmin && adminViewAll
                          ? "Search name / SKU / owner email..."
                          : "Search by name or SKU..."
                      }
                      className="w-full rounded-2xl bg-sky-50/70 py-2.5 pl-9 pr-3 text-sm outline-none ring-1 ring-sky-100 focus:ring-sky-200"
                    />
                  </div>

                  <button
                    onClick={exportCSV}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-900 ring-1 ring-sky-200 hover:ring-sky-300 transition"
                    title="Export current (sorted + filtered) products to CSV"
                  >
                    <Download className="h-4 w-4 text-sky-700" />
                    Export CSV
                  </button>
                </div>
              </div>

              {/* Sort + page size */}
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">Sort:</span>
                  {[
                    ["name", "Name"],
                    ["sku", "SKU"],
                    ["quantity", "Qty"],
                    ["price", "Price"],
                    ["value", "Value"],
                    ["updatedAt", "Updated"],
                  ].map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => toggleSort(key)}
                      className={[
                        "inline-flex items-center gap-1 rounded-2xl px-3 py-2 text-xs font-semibold ring-1 transition",
                        sortKey === key
                          ? "bg-sky-600 text-white ring-sky-600 hover:bg-sky-700"
                          : "bg-white text-slate-900 ring-sky-200 hover:ring-sky-300",
                      ].join(" ")}
                      title="Toggle sort"
                    >
                      <ArrowUpDown className="h-3.5 w-3.5" />
                      {label}
                      {sortKey === key ? (sortDir === "asc" ? " ↑" : " ↓") : ""}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">Page size:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="rounded-2xl bg-white px-3 py-2 text-sm font-semibold text-slate-900 ring-1 ring-sky-200 outline-none"
                  >
                    {[5, 8, 10, 15, 20].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Table */}
              <div className="mt-4 overflow-x-auto rounded-2xl ring-1 ring-sky-100">
                <table className="min-w-full text-sm">
                  <thead className="bg-sky-50">
                    <tr className="text-left text-xs font-semibold text-slate-600">
                      {isAdmin && adminViewAll ? <th className="px-4 py-3">Owner</th> : null}
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">SKU</th>
                      <th className="px-4 py-3">Qty</th>
                      <th className="px-4 py-3">Price</th>
                      <th className="px-4 py-3">Value</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-sky-100 bg-white">
                    {loadingProducts ? (
                      <tr>
                        <td className="px-4 py-6 text-slate-600" colSpan={isAdmin && adminViewAll ? 7 : 6}>
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading products...
                          </div>
                        </td>
                      </tr>
                    ) : pagedProducts.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-slate-600" colSpan={isAdmin && adminViewAll ? 7 : 6}>
                          No products found.
                        </td>
                      </tr>
                    ) : (
                      pagedProducts.map((p) => {
                        const qty = Number(p.quantity || 0);
                        const price = Number(p.price || 0);
                        const value = qty * price;
                        const isLow = qty <= 5;

                        return (
                          <tr key={p.id} className="hover:bg-sky-50/40 transition">
                            {isAdmin && adminViewAll ? (
                              <td className="px-4 py-3 text-slate-600">{p.ownerEmail || p.ownerId}</td>
                            ) : null}

                            <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
                            <td className="px-4 py-3 text-slate-600">{p.sku}</td>
                            <td className="px-4 py-3">
                              <span
                                className={[
                                  "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
                                  isLow
                                    ? "bg-amber-50 text-amber-700 ring-amber-100"
                                    : "bg-emerald-50 text-emerald-700 ring-emerald-100",
                                ].join(" ")}
                              >
                                {qty}
                                {isLow ? " • Low" : ""}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-600">₹{price.toFixed(2)}</td>
                            <td className="px-4 py-3 text-slate-600">₹{value.toFixed(2)}</td>

                            <td className="px-4 py-3">
                              <div className="flex justify-end gap-2">
                                <button
                                  onClick={() => openEdit(p)}
                                  className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-900 ring-1 ring-sky-200 hover:ring-sky-300 transition"
                                >
                                  <Pencil className="h-4 w-4 text-sky-700" />
                                  Edit
                                </button>

                                <button
                                  onClick={() => removeProduct(p)}
                                  className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-rose-700 ring-1 ring-rose-200 hover:ring-rose-300 transition"
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls */}
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs text-slate-500">
                <p>
                  Showing{" "}
                  <span className="font-semibold">
                    {sortedProducts.length === 0 ? 0 : (page - 1) * pageSize + 1}
                  </span>
                  {" - "}
                  <span className="font-semibold">{Math.min(page * pageSize, sortedProducts.length)}</span> of{" "}
                  <span className="font-semibold">{sortedProducts.length}</span>
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="inline-flex items-center gap-1 rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-slate-900 ring-1 ring-sky-200 hover:ring-sky-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Prev
                  </button>

                  <span className="text-xs">
                    Page <span className="font-semibold">{page}</span> /{" "}
                    <span className="font-semibold">{totalPages}</span>
                  </span>

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="inline-flex items-center gap-1 rounded-2xl bg-white px-3 py-2 text-xs font-semibold text-slate-900 ring-1 ring-sky-200 hover:ring-sky-300 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-2 text-xs text-slate-500">
                Estimated inventory value (current filter):{" "}
                <span className="font-semibold text-slate-700">₹{totalValue.toFixed(2)}</span>
              </div>
            </motion.div>
          </div>

          {/* Recommendations + History */}
          <div className="mt-4 grid gap-4 lg:grid-cols-3">
            {/* Recommendations */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.12 }}
              className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-sky-200 lg:col-span-1"
            >
              <p className="text-sm font-semibold text-slate-900">Recommendation system (v1)</p>
              <p className="mt-2 text-sm text-slate-600">
                Based on low stock (≤ 5) and fast movement from recent stock changes.
              </p>

              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-xs font-semibold text-slate-600">Low stock</p>
                  {recommendations.low.length === 0 ? (
                    <p className="mt-1 text-sm text-slate-600">No low-stock items right now.</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {recommendations.low.map((r) => (
                        <li key={r.productId} className="rounded-2xl bg-sky-50/70 p-3 ring-1 ring-sky-100">
                          <p className="text-sm font-semibold text-slate-900">
                            {r.name} <span className="text-xs text-slate-500">({r.sku})</span>
                          </p>
                          <p className="text-xs text-slate-600">Current qty: {r.qty} — restock recommended</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <p className="text-xs font-semibold text-slate-600">Fast-moving (last 30 days)</p>
                  {recommendations.fast.length === 0 ? (
                    <p className="mt-1 text-sm text-slate-600">No movement detected yet.</p>
                  ) : (
                    <ul className="mt-2 space-y-2">
                      {recommendations.fast.map((r) => (
                        <li key={r.productId} className="rounded-2xl bg-white p-3 ring-1 ring-sky-100">
                          <p className="text-sm font-semibold text-slate-900">
                            {r.name} <span className="text-xs text-slate-500">({r.sku})</span>
                          </p>
                          <p className="text-xs text-slate-600">
                            Units moved: <span className="font-semibold">{r.moved}</span> — keep stock ready
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </motion.div>

            {/* History */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.14 }}
              className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-sky-200 lg:col-span-2"
            >
              <div className="flex items-center gap-2">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-sky-50 ring-1 ring-sky-100">
                  <History className="h-5 w-5 text-sky-700" />
                </div>
                <div>
                  <p className="text-base font-semibold text-slate-900">Stock history</p>
                  <p className="text-xs text-slate-500">Last 200 events (showing latest 12)</p>
                </div>
              </div>

              <div className="mt-4 overflow-x-auto rounded-2xl ring-1 ring-sky-100">
                <table className="min-w-full text-sm">
                  <thead className="bg-sky-50">
                    <tr className="text-left text-xs font-semibold text-slate-600">
                      {isAdmin && adminViewAll ? <th className="px-4 py-3">Owner</th> : null}
                      <th className="px-4 py-3">Action</th>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">SKU</th>
                      <th className="px-4 py-3">Δ Qty</th>
                      <th className="px-4 py-3">New Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-sky-100 bg-white">
                    {loadingHistory ? (
                      <tr>
                        <td className="px-4 py-6 text-slate-600" colSpan={isAdmin && adminViewAll ? 6 : 5}>
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Loading history...
                          </div>
                        </td>
                      </tr>
                    ) : historyRows.length === 0 ? (
                      <tr>
                        <td className="px-4 py-6 text-slate-600" colSpan={isAdmin && adminViewAll ? 6 : 5}>
                          No history yet. Add or edit products to generate history.
                        </td>
                      </tr>
                    ) : (
                      historyRows.slice(0, 12).map((h) => {
                        const delta = Number(h.deltaQty || 0);
                        const isNeg = delta < 0;
                        const action = String(h.action || "update");

                        return (
                          <tr key={h.id} className="hover:bg-sky-50/40 transition">
                            {isAdmin && adminViewAll ? (
                              <td className="px-4 py-3 text-slate-600">{h.ownerEmail || h.ownerId}</td>
                            ) : null}
                            <td className="px-4 py-3">
                              <span
                                className={[
                                  "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1",
                                  action === "create"
                                    ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                                    : action === "delete"
                                    ? "bg-rose-50 text-rose-700 ring-rose-100"
                                    : "bg-sky-50 text-sky-700 ring-sky-100",
                                ].join(" ")}
                              >
                                {action}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-900">{h.name || "-"}</td>
                            <td className="px-4 py-3 text-slate-600">{h.sku || "-"}</td>
                            <td className="px-4 py-3">
                              <span className={["font-semibold", isNeg ? "text-rose-700" : "text-emerald-700"].join(" ")}>
                                {delta > 0 ? `+${delta}` : `${delta}`}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{Number(h.newQty || 0)}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              <p className="mt-3 text-xs text-slate-500">
                Tip: v1 recommendation uses recent negative deltas to detect fast-moving items.
              </p>
            </motion.div>
          </div>
        </div>

        {/* EDIT MODAL */}
        <AnimatePresence>
          {editOpen && editItem && (
            <motion.div
              className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-xl ring-1 ring-sky-200"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-lg font-bold text-slate-900">Edit product</p>
                    <p className="text-sm text-slate-600">Update details and save changes.</p>
                  </div>
                  <button
                    onClick={() => {
                      setEditOpen(false);
                      setEditItem(null);
                    }}
                    className="grid h-10 w-10 place-items-center rounded-2xl bg-white ring-1 ring-sky-200 hover:ring-sky-300 transition"
                    title="Close"
                  >
                    <X className="h-5 w-5 text-slate-700" />
                  </button>
                </div>

                <form onSubmit={saveEdit} className="mt-5 space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600">Product name</label>
                    <input
                      value={editItem.name}
                      onChange={(e) => setEditItem({ ...editItem, name: e.target.value })}
                      className="mt-1 w-full rounded-2xl bg-sky-50/70 px-3 py-2.5 text-sm outline-none ring-1 ring-sky-100 focus:ring-sky-200"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-600">SKU</label>
                    <input
                      value={editItem.sku}
                      onChange={(e) => setEditItem({ ...editItem, sku: e.target.value })}
                      className="mt-1 w-full rounded-2xl bg-sky-50/70 px-3 py-2.5 text-sm outline-none ring-1 ring-sky-100 focus:ring-sky-200"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600">Quantity</label>
                      <input
                        type="number"
                        min={0}
                        value={editItem.quantity}
                        onChange={(e) => setEditItem({ ...editItem, quantity: e.target.value })}
                        className="mt-1 w-full rounded-2xl bg-sky-50/70 px-3 py-2.5 text-sm outline-none ring-1 ring-sky-100 focus:ring-sky-200"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-600">Price</label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={editItem.price}
                        onChange={(e) => setEditItem({ ...editItem, price: e.target.value })}
                        className="mt-1 w-full rounded-2xl bg-sky-50/70 px-3 py-2.5 text-sm outline-none ring-1 ring-sky-100 focus:ring-sky-200"
                      />
                    </div>
                  </div>

                  <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setEditOpen(false);
                        setEditItem(null);
                      }}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-slate-900 ring-1 ring-sky-200 hover:ring-sky-300 transition"
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={editSaving}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-sky-600 px-4 py-3 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
                    >
                      {editSaving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                        </>
                      ) : (
                        <>
                          <Pencil className="h-4 w-4" /> Save changes
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}