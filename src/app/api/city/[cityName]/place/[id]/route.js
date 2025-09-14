import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Place from "@/models/CityRoutes/Place";
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
      "_id cityName reviews places category lat lon address locationLink openDay openTime establishYear fee description essential story images videos premium engagement";

    // ✅ Logged-in user
    const userId = req.user.userId;
    const user = await User.findById(userId).select("isPremium");
    const userPremium = user?.isPremium || "FREE";
    const accessiblePremiums = getAccessiblePremiums(userPremium);

    // ✅ Step 1: find document with premium check
    const place = await Place.findOne({
      _id: id,
      cityName: { $regex: new RegExp(`^${cityName}$`, "i") },
      premium: { $in: accessiblePremiums },
    }).select(fieldsToSelect);

    if (!place) {
      return NextResponse.json(
        { success: false, message: "Not authorized or Place not found" },
        { status: 403 }
      );
    }

    // ✅ Step 2: increment views
    place.engagement.views += 1;

    // ✅ Step 3: update viewedBy timestamps
    const viewedEntry = place.engagement.viewedBy.find(
      (v) => v.userId.toString() === userId.toString()
    );

    if (viewedEntry) {
      viewedEntry.timestamps.push(new Date());
    } else {
      place.engagement.viewedBy.push({
        userId,
        timestamps: [new Date()],
      });
    }

    await place.save();

    return NextResponse.json({ success: true, data: place });
  } catch (error) {
    console.error("Error updating Place:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}

// ✅ Protect with auth
export const GET = withAuth(handler);
