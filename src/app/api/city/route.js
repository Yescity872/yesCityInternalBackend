import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import City from "@/models/City";


export async function GET() {
  try {
    // ✅ Connect DB
    await connectToDatabase();

    // ✅ Fetch all cities
    const cities = await City.find({}).select("cityName content cover-image onSite");

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


