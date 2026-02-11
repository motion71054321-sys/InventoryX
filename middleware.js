// /middleware.js
import { NextResponse } from "next/server";

export function middleware(req) {
  const { pathname } = req.nextUrl;

  // Protect /admin/*
  if (pathname.startsWith("/admin")) {
    const role = req.cookies.get("inventoryx_role")?.value || "user";
    if (role !== "admin") {
      const url = req.nextUrl.clone();
      url.pathname = "/products";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
