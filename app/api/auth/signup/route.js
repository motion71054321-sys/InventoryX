import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { signToken, SESSION_COOKIE, cookieOptions } from "@/lib/auth";

export async function POST(req) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    }

    await dbConnect();

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
    });

    const token = await signToken({ sub: user._id.toString(), email: user.email, name: user.name });

    const res = NextResponse.json({ success: true }, { status: 201 });
    res.cookies.set(SESSION_COOKIE, token, cookieOptions());
    return res;
  } catch (err) {
    return NextResponse.json({ error: err.message || "Signup failed" }, { status: 500 });
  }
}