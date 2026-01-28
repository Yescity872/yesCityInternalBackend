import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Food from "@/models/CityRoutes/Food";
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
      "_id cityName flagship reviews foodPlace lat lon address locationLink category vegOrNonVeg valueForMoney service taste hygiene menuSpecial menuLink openDay openTime phone website description images videos premium engagement";

    const userId = req.user.userId;
    const user = await User.findById(userId).select("isPremium");
    const userPremium = user?.isPremium || "FREE";
    const accessiblePremiums = getAccessiblePremiums(userPremium);

    // ✅ Step 1: find the document
    const food = await Food.findOne({
      _id: id,
      cityName: { $regex: new RegExp(`^${cityName}$`, "i") },
      premium: { $in: accessiblePremiums },
    }).select(fieldsToSelect);

    if (!food) {
      return NextResponse.json(
        { success: false, message: "Not authorized or food place not found" },
        { status: 403 }
      );
    }

    // ✅ Step 2: increment views
    food.engagement.views += 1;

    // ✅ Step 3: update viewedBy
    const viewedEntry = food.engagement.viewedBy.find(
      (v) => v.userId.toString() === userId.toString()
    );

    if (viewedEntry) {
      viewedEntry.timestamps.push(new Date());
    } else {
      food.engagement.viewedBy.push({
        userId,
        timestamps: [new Date()],
      });
    }

    await food.save();

    return NextResponse.json({ success: true, data: food });
  } catch (error) {
    console.error("Error updating food place:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}

export const GET = withAuth(handler);
