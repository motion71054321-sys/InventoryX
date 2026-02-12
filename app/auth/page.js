import { Suspense } from "react";
import AuthClient from "./AuthClient";

export default function AuthPage() {
  return (
    <Suspense fallback={<AuthLoading />}>
      <AuthClient />
    </Suspense>
  );
}

function AuthLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50">
      <div className="w-full max-w-md rounded-2xl border bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-700">Loading…</p>
      </div>
    </div>
  );
}
