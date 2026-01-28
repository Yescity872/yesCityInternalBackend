// app/api/auth/logout/route.js
import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ success: true, message: "Logged out" });

  // 🚀 MUST match cookie options used when setting
  res.cookies.set("token", "", {
    httpOnly: true,
  secure: process.env.NODE_ENV === "production", // only secure in prod
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
    expires: new Date(0), // delete cookie
  });

  return res;
}
