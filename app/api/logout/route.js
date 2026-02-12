import { NextResponse } from "next/server";

const SESSION_COOKIE = "session";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
};

export async function POST() {
  const res = NextResponse.json({ success: true }, { status: 200 });
  res.cookies.set(SESSION_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return res;
}
