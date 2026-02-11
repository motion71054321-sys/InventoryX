import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { signToken, SESSION_COOKIE, cookieOptions } from "@/lib/auth";

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const token = await signToken({ sub: user._id.toString(), email: user.email, name: user.name });

    const res = NextResponse.json({ success: true }, { status: 200 });
    res.cookies.set(SESSION_COOKIE, token, cookieOptions());
    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message || "Login failed" }, { status: 500 });
  }
}
