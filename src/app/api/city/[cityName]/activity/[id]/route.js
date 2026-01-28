import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Activity from "@/models/CityRoutes/Activity";
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
      "_id cityName reviews topActivities bestPlaces description essentials fee images videos premium engagement";

    const userId = req.user.userId;
    const user = await User.findById(userId).select("isPremium");
    const userPremium = user?.isPremium || "FREE";
    const accessiblePremiums = getAccessiblePremiums(userPremium);

    // ✅ Step 1: find the document
    const activity = await Activity.findOne({
      _id: id,
      cityName: { $regex: new RegExp(`^${cityName}$`, "i") },
      premium: { $in: accessiblePremiums },
    }).select(fieldsToSelect);

    if (!activity) {
      return NextResponse.json(
        { success: false, message: "Not authorized or activity not found" },
        { status: 403 }
      );
    }

    // ✅ Step 2: increment views
    activity.engagement.views += 1;

    // ✅ Step 3: update viewedBy
    const viewedEntry = activity.engagement.viewedBy.find(
      (v) => v.userId.toString() === userId.toString()
    );

    if (viewedEntry) {
      viewedEntry.timestamps.push(new Date());
    } else {
      activity.engagement.viewedBy.push({
        userId,
        timestamps: [new Date()],
      });
    }

    await activity.save();

    return NextResponse.json({ success: true, data: activity });
  } catch (error) {
    console.error("Error updating activity:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handler);
