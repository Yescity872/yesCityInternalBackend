import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Connectivity from "@/models/CityRoutes/Connectivity";
import { withAuth } from "@/middleware/auth";
import User from "@/models/User";

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
      "_id cityName reviews nearestAirportStationBusStand distance lat lon locationLink majorFlightsTrainsBuses premium engagement";

    const userId = req.user.userId;
    const user = await User.findById(userId).select("isPremium");
    const userPremium = user?.isPremium || "FREE";
    const accessiblePremiums = getAccessiblePremiums(userPremium);

    // ✅ Step 1: find the document
    const connectivity = await Connectivity.findOne({
      _id: id,
      cityName: { $regex: new RegExp(`^${cityName}$`, "i") },
      premium: { $in: accessiblePremiums },
    }).select(fieldsToSelect);

    if (!connectivity) {
      return NextResponse.json(
        { success: false, message: "Not authorized or connectivity info not found" },
        { status: 403 }
      );
    }

    // ✅ Step 2: increment views
    connectivity.engagement.views += 1;

    // ✅ Step 3: update viewedBy
    const viewedEntry = connectivity.engagement.viewedBy.find(
      (v) => v.userId.toString() === userId.toString()
    );

    if (viewedEntry) {
      viewedEntry.timestamps.push(new Date());
    } else {
      connectivity.engagement.viewedBy.push({
        userId,
        timestamps: [new Date()],
      });
    }

    await connectivity.save();

    return NextResponse.json({ success: true, data: connectivity });
  } catch (error) {
    console.error("Error updating connectivity:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handler);
