// lib/premium.js
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";

export async function extendUserPremium(userId) {
  await connectToDatabase();

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const oneTwentyDays = 120 * 24 * 60 * 60 * 1000; // 120 days
  const now = new Date();

  const referralCount = user.referralCount || 0;

  // 🚫 If more than 9 referrals, do nothing
  if (referralCount > 9) {
    return user;
  }

  if (user.isPremium === "FREE") {
    // FREE → A only if at least 3 referrals
    if (referralCount >= 3) {
      user.isPremium = "A";
      user.premiumStartDate = now;
      user.premiumExpiryDate = new Date(now.getTime() + oneTwentyDays);
    } else {
      throw new Error("Not enough referrals to upgrade to premium");
    }
  } else if (user.isPremium === "A") {
    // Already premium → extend 30 days for every 3 referrals
    const extensionDays = Math.floor(referralCount / 3) * thirtyDays;

    if (extensionDays > 0) {
      const currentExpiry = user.premiumExpiryDate ? new Date(user.premiumExpiryDate) : now;
      user.premiumExpiryDate = new Date(
        currentExpiry > now ? currentExpiry.getTime() + extensionDays : now.getTime() + extensionDays
      );
    }
  }

  await user.save();
  return user;
}


