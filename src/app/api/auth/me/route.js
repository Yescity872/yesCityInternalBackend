import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { connectToDatabase } from '@/lib/db';
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    // ✅ First check cookies
    const cookieStore = await cookies();
    let token = cookieStore.get("token")?.value;

    // ✅ If not in cookies, check headers (localStorage token from frontend)
    if (!token) {
      const authHeader = req.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split(" ")[1];
      }
    }

    console.log("Token:", token);

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // ✅ Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ✅ Fetch user
    await connectToDatabase();
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // ✅ Return sanitized user data
    return NextResponse.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        phone: user.phone,
        isPremium: user.isPremium,
        premiumStartDate: user.premiumStartDate,
        premiumExpiryDate: user.premiumExpiryDate,
        points: user.contributionPoints || 0,
      },
    });
  } catch (err) {
    console.error("Error in /api/auth/me:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
