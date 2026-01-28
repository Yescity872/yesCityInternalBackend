import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import NearbySpot from "@/models/CityRoutes/NearbySpot";
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
      "_id cityName reviews places distance category lat lon address locationLink openDay openTime establishYear fee description essential story images videos premium engagement";

    // ✅ Logged-in user
    const userId = req.user.userId;
    const user = await User.findById(userId).select("isPremium");
    const userPremium = user?.isPremium || "FREE";
    const accessiblePremiums = getAccessiblePremiums(userPremium);

    // ✅ Step 1: find document with premium check
    const spot = await NearbySpot.findOne({
      _id: id,
      cityName: { $regex: new RegExp(`^${cityName}$`, "i") }, // case-insensitive
      premium: { $in: accessiblePremiums },
    }).select(fieldsToSelect);

    if (!spot) {
      return NextResponse.json(
        { success: false, message: "Not authorized or Nearby tourist spot not found" },
        { status: 403 }
      );
    }

    // ✅ Step 2: increment views
    spot.engagement.views += 1;

    // ✅ Step 3: update viewedBy timestamps
    const viewedEntry = spot.engagement.viewedBy.find(
      (v) => v.userId.toString() === userId.toString()
    );

    if (viewedEntry) {
      viewedEntry.timestamps.push(new Date());
    } else {
      spot.engagement.viewedBy.push({
        userId,
        timestamps: [new Date()],
      });
    }

    await spot.save();

    return NextResponse.json({ success: true, data: spot });
  } catch (error) {
    console.error("Error fetching Nearby tourist spot:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}

// ✅ Wrap with auth middleware
export const GET = withAuth(handler);
