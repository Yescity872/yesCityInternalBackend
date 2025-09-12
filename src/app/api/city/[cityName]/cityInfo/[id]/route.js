import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import CityInfo from "@/models/CityRoutes/CityInfo";
import { withAuth } from "@/middleware/auth";
import User from "@/models/User";

function getAccessiblePremiums(userPremium) {
  if (userPremium === "B") return ["FREE", "A", "B"];
  if (userPremium === "A") return ["FREE", "A"];
  return ["FREE"];
}

export async function GET(req, context) {
  const { cityName, id } = await context.params;
  await connectToDatabase();

  try {
    const fieldsToSelect =
      "_id cityName stateOrUT alternateNames languagesSpoken climateInfo bestTimeToVisit cityHistory coverImage premium engagement";

    const userId = req.user.userId;
    const user = await User.findById(userId).select("premium");
    const userPremium = user?.premium || "FREE";
    const accessiblePremiums = getAccessiblePremiums(userPremium);

    // ✅ Step 1: find the document
    const cityInfo = await CityInfo.findOne({
      _id: id,
      cityName: { $regex: new RegExp(`^${cityName}$`, "i") },
      // premium: { $in: accessiblePremiums },
    }).select(fieldsToSelect);

    if (!cityInfo) {
      return NextResponse.json(
        { success: false, message: "Not authorized or city info not found" },
        { status: 403 }
      );
    }

    // ✅ Step 2: increment views
    cityInfo.engagement.views += 1;

    // ✅ Step 3: update viewedBy
    const viewedEntry = cityInfo.engagement.viewedBy.find(
      (v) => v.userId.toString() === userId.toString()
    );

    if (viewedEntry) {
      viewedEntry.timestamps.push(new Date());
    } else {
      cityInfo.engagement.viewedBy.push({
        userId,
        timestamps: [new Date()],
      });
    }

    await cityInfo.save();

    return NextResponse.json({ success: true, data: cityInfo });
  } catch (error) {
    console.error("Error updating city info:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}

// export const GET = withAuth(handler);
