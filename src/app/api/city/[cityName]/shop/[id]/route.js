import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Shop from "@/models/CityRoutes/Shop";
import { withAuth } from "@/middleware/auth";
import User from "@/models/User";

// ✅ Premium access helper
function getAccessiblePremiums(userPremium) {
  if (userPremium === "B") return ["FREE", "A", "B"];
  if (userPremium === "A") return ["FREE", "A"];
  return ["FREE"];
}

async function handler(req, context) {
  const { cityName, id } = await context.params;

  await connectToDatabase();

  try {
    const fieldsToSelect =
      "_id cityName flagship reviews shops lat lon address locationLink famousFor priceRange openDay openTime phone website images premium engagement";

    // ✅ Logged-in user
    const userId = req.user.userId;
    const user = await User.findById(userId).select("isPremium");
    const userPremium = user?.isPremium || "FREE";
    const accessiblePremiums = getAccessiblePremiums(userPremium);

    // ✅ Step 1: find document with premium check
    const shop = await Shop.findOne({
      _id: id,
      cityName: { $regex: new RegExp(`^${cityName}$`, "i") },
      premium: { $in: accessiblePremiums },
    }).select(fieldsToSelect);

    if (!shop) {
      return NextResponse.json(
        { success: false, message: "Not authorized or Shop not found" },
        { status: 403 }
      );
    }

    // ✅ Step 2: increment views
    shop.engagement.views += 1;

    // ✅ Step 3: update viewedBy with timestamps
    const viewedEntry = shop.engagement.viewedBy.find(
      (v) => v.userId.toString() === userId.toString()
    );

    if (viewedEntry) {
      viewedEntry.timestamps.push(new Date());
    } else {
      shop.engagement.viewedBy.push({
        userId,
        timestamps: [new Date()],
      });
    }

    await shop.save();

    return NextResponse.json({ success: true, data: shop });
  } catch (error) {
    console.error("Error updating Shop:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}

// ✅ Protect with auth
export const GET = withAuth(handler);
