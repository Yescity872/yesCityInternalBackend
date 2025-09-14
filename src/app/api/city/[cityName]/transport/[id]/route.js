import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Transport from "@/models/CityRoutes/Transport";
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
      "_id cityName reviews from to autoPrice cabPrice bikePrice premium engagement";

    // ✅ Logged-in user
    const userId = req.user.userId;
    const user = await User.findById(userId).select("isPremium");
    const userPremium = user?.isPremium || "FREE";
    const accessiblePremiums = getAccessiblePremiums(userPremium);

    // ✅ Step 1: find transport with premium check
    const transport = await Transport.findOne({
      _id: id,
      cityName: { $regex: new RegExp(`^${cityName}$`, "i") },
      premium: { $in: accessiblePremiums },
    }).select(fieldsToSelect);

    if (!transport) {
      return NextResponse.json(
        { success: false, message: "Not authorized or Transport route not found" },
        { status: 403 }
      );
    }

    // ✅ Step 2: increment views
    transport.engagement.views += 1;

    // ✅ Step 3: update viewedBy with timestamps
    const viewedEntry = transport.engagement.viewedBy.find(
      (v) => v.userId.toString() === userId.toString()
    );

    if (viewedEntry) {
      viewedEntry.timestamps.push(new Date());
    } else {
      transport.engagement.viewedBy.push({
        userId,
        timestamps: [new Date()],
      });
    }

    await transport.save();

    return NextResponse.json({ success: true, data: transport });
  } catch (error) {
    console.error("Error updating Transport:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}

// ✅ Protect with auth
export const GET = withAuth(handler);
