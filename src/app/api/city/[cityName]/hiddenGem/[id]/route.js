import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import HiddenGem from "@/models/CityRoutes/HiddenGem";
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
      "_id cityName reviews hiddenGem category lat lon address locationLink openDay openTime guideAvailability establishYear fee description essential story images videos premium engagement";

    const userId = req.user.userId;
    const user = await User.findById(userId).select("isPremium");
    const userPremium = user?.isPremium || "FREE";
    const accessiblePremiums = getAccessiblePremiums(userPremium);

    // ✅ Step 1: find the document
    const gem = await HiddenGem.findOne({
      _id: id,
      cityName: { $regex: new RegExp(`^${cityName}$`, "i") },
      premium: { $in: accessiblePremiums },
    }).select(fieldsToSelect);

    if (!gem) {
      return NextResponse.json(
        { success: false, message: "Not authorized or hidden gem not found" },
        { status: 403 }
      );
    }

    // ✅ Step 2: increment views
    gem.engagement.views += 1;

    // ✅ Step 3: update viewedBy
    const viewedEntry = gem.engagement.viewedBy.find(
      (v) => v.userId.toString() === userId.toString()
    );

    if (viewedEntry) {
      viewedEntry.timestamps.push(new Date());
    } else {
      gem.engagement.viewedBy.push({
        userId,
        timestamps: [new Date()],
      });
    }

    await gem.save();

    return NextResponse.json({ success: true, data: gem });
  } catch (error) {
    console.error("Error updating hidden gem:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handler);
