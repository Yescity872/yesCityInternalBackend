import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";

export async function POST(req) {
  try {
    const body = await req.json();
    const { phone } = body;

    if (!phone) {
      return NextResponse.json(
        { message: "Phone number is required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const existingUser = await User.findOne({ phone });
    if (existingUser) {
      return NextResponse.json({ unique: false }, { status: 200 });
    }

    return NextResponse.json({ unique: true }, { status: 200 });
  } catch (err) {
    console.error("Error checking phone:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
