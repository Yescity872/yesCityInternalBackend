// lib/premium.js
import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";

export async function extendUserPremium(referredBy) {
  console.log("phone",referredBy);
  await connectToDatabase();

  const user = await User.findOne({ referralCode: referredBy });
  if (!user) throw new Error("User not found");

  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const oneTwentyDays = 120 * 24 * 60 * 60 * 1000; // 120 days
  const now = new Date();

  const referralCount = user.referralCount || 0;

  console.log("referralCount", referralCount);
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
  // Extend only when referralCount is a multiple of 3 (3, 6, 9)
  if (referralCount % 3 === 0 && referralCount <= 9) {
    const currentExpiry = user.premiumExpiryDate
      ? new Date(user.premiumExpiryDate)
      : now;

    user.premiumExpiryDate = new Date(
      currentExpiry > now
        ? currentExpiry.getTime() + thirtyDays
        : now.getTime() + thirtyDays
    );
  }
}

  await user.save();
  return user;
}


