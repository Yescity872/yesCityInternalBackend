import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import City from "@/models/City";
import { recordCategoryEngagement } from "@/lib/engagement"; 
import { getUserFromCookies } from "@/middleware/auth"; // helper to extract user

export async function GET(req) {
  try {
    await connectToDatabase();

    // Try to get user (if logged in)
    const user = await getUserFromCookies(req); // pass req here

    // Fetch all cities
    const cities = await City.find({}).select("cityName content coverImage onSite");

    // If user logged in → record engagement
    if (user) {
      await recordCategoryEngagement(user, "all", "CityList");
    }

    return NextResponse.json({
      success: true,
      count: cities.length,
      data: cities,
    });
  } catch (error) {
    console.error("Error fetching cities:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
