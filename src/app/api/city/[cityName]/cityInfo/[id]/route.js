import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import CityInfo from "@/models/CityRoutes/CityInfo";

export async function GET(req, context) {
  const { cityName, id } = await context.params;
  await connectToDatabase();

  try {
    const fieldsToSelect =
      "_id cityName stateOrUT alternateNames languagesSpoken climateInfo bestTimeToVisit cityHistory coverImage engagement";

    const escapedCityName = cityName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    const cityInfo = await CityInfo.findOne({
      _id: id,
      cityName: { $regex: new RegExp(`^${escapedCityName}$`, "i") },
    }).select(fieldsToSelect);

    if (!cityInfo) {
      return NextResponse.json(
        { success: false, message: "City info not found" },
        { status: 404 }
      );
    }

    // Increment views
    cityInfo.engagement = cityInfo.engagement || { views: 0 };
    cityInfo.engagement.views = (cityInfo.engagement.views || 0) + 1;

    await cityInfo.save();

    return NextResponse.json({ success: true, data: cityInfo });
  } catch (error) {
    console.error("Error fetching city info:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
