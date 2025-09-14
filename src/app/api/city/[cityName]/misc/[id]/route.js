import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Misc from "@/models/CityRoutes/Misc";
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
      "_id cityName reviews localMap emergencyContacts hospital hospitalLocationLink hospitalLat hospitalLon Police PoliceLocationLink PoliceLat PoliceLon parking parkingLocationLink parkingLat parkingLon publicWashrooms publicWashroomsLocationLink publicWashroomsLat publicWashroomsLon locker lockerLocationLink lockerLat lockerLon premium engagement";

    // ✅ Logged-in user
    const userId = req.user.userId;
    const user = await User.findById(userId).select("isPremium");
    const userPremium = user?.isPremium || "FREE";
    const accessiblePremiums = getAccessiblePremiums(userPremium);

    // ✅ Step 1: find the document with premium check
    const misc = await Misc.findOne({
      _id: id,
      cityName: { $regex: new RegExp(`^${cityName}$`, "i") }, // case-insensitive
      premium: { $in: accessiblePremiums },
    }).select(fieldsToSelect);

    if (!misc) {
      return NextResponse.json(
        { success: false, message: "Not authorized or Misc entry not found" },
        { status: 403 }
      );
    }

    // ✅ Step 2: increment views
    misc.engagement.views += 1;

    // ✅ Step 3: update viewedBy timestamps
    const viewedEntry = misc.engagement.viewedBy.find(
      (v) => v.userId.toString() === userId.toString()
    );

    if (viewedEntry) {
      viewedEntry.timestamps.push(new Date());
    } else {
      misc.engagement.viewedBy.push({
        userId,
        timestamps: [new Date()],
      });
    }

    await misc.save();

    return NextResponse.json({ success: true, data: misc });
  } catch (error) {
    console.error("Error fetching Misc:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}

// ✅ Wrap with auth middleware
export const GET = withAuth(handler);
