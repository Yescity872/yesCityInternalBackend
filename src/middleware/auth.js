// middleware/auth.js
import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";
import { cookies } from "next/headers";

const JWT_SECRET = process.env.JWT_SECRET;

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function withAuth(handler) {
  return async (req, context) => {
    // ✅ await cookies()
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;
    console.log(token);

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return NextResponse.json(
        { message: "Invalid or expired token" },
        { status: 403 }
      );
    }

    // ✅ connect DB and fetch user
    await connectToDatabase();
    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    // ✅ check premium expiry
    if (
      user.isPremium !== "FREE" &&
      user.premiumExpiryDate &&
      user.premiumExpiryDate < Date.now()
    ) {
      user.isPremium = "FREE";
      user.premiumStartDate = new Date();
      user.premiumExpiryDate = null;
      await user.save();
    }

    // ✅ attach merged info
    req.user = {
      ...decoded,
      userId: user._id.toString(),
      isPremium: user.isPremium,
      premiumStartDate: user.premiumStartDate,
      premiumExpiryDate: user.premiumExpiryDate,
    };

    
    return handler(req, context);
  };
}


export async function getUserFromCookies() {
  // ✅ Get token from cookies
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;

  if (!token) return null;

  const decoded = verifyToken(token);
  if (!decoded) return null;

  // ✅ Fetch user from DB
  await connectToDatabase();
  const user = await User.findById(decoded.userId);
  if (!user) return null;

  // ✅ Handle expired premium
  if (
    user.isPremium !== "FREE" &&
    user.premiumExpiryDate &&
    user.premiumExpiryDate < Date.now()
  ) {
    user.isPremium = "FREE";
    user.premiumStartDate = new Date();
    user.premiumExpiryDate = null;
    await user.save();
  }

  // ✅ Return merged info
  return {
    ...decoded,
    userId: user._id.toString(),
    isPremium: user.isPremium,
    premiumStartDate: user.premiumStartDate,
    premiumExpiryDate: user.premiumExpiryDate,
  };
}