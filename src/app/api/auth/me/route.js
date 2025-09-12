import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { connectToDatabase } from '@/lib/db';
import User from "@/models/User";

export async function GET(req) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return Response.json({ message: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    await connectToDatabase();
    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return Response.json({ message: "User not found" }, { status: 404 });
    }

    return Response.json({
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
    return Response.json({ message: "Server error" }, { status: 500 });
  }
}
