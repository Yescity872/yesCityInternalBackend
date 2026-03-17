import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Accommodation from "@/models/CityRoutes/Accommodation";
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
      "_id cityName flagship reviews hotels lat lon address locationLink category roomTypes facilities images premium engagement";

    const userId = req.user.userId;
    const user = await User.findById(userId).select("isPremium");
    const userPremium = user?.isPremium || "FREE";
    const accessiblePremiums = getAccessiblePremiums(userPremium);

    // Step 1: find the document
    const accommodation = await Accommodation.findOne({
      _id: id,
      cityName: { $regex: new RegExp(`^${cityName}$`, "i") },
      premium: { $in: accessiblePremiums },
    });

    if (!accommodation) {
      return NextResponse.json(
        { success: false, message: "Not authorized or accommodation not found" },
        { status: 403 }
      );
    }

    // Step 2: increment views
    accommodation.engagement.views += 1;

    // Step 3: update viewedBy
    const viewedEntry = accommodation.engagement.viewedBy.find(
      (v) => v.userId.toString() === userId.toString()
    );

    if (viewedEntry) {
      // user exists → add new timestamp
      viewedEntry.timestamps.push(new Date());
    } else {
      // new user → add entry with first timestamp
      accommodation.engagement.viewedBy.push({
        userId,
        timestamps: [new Date()],
      });
    }

    await accommodation.save();

    return NextResponse.json({ success: true, data: accommodation });
  } catch (error) {
    console.error("Error updating accommodation:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handler);
