import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";
import { withAuth } from "@/middleware/auth";
import { NextResponse } from "next/server";

// Import models
import Accommodation from "@/models/CityRoutes/Accommodation";
import Activity from "@/models/CityRoutes/Activity";
import CityInfo from "@/models/CityRoutes/CityInfo";
import Connectivity from "@/models/CityRoutes/Connectivity";
import Food from "@/models/CityRoutes/Food";
import HiddenGem from "@/models/CityRoutes/HiddenGem";
import Itinerary from "@/models/CityRoutes/Itinerary";
import Misc from "@/models/CityRoutes/Misc";
import NearbySpot from "@/models/CityRoutes/NearbySpot";
import Place from "@/models/CityRoutes/Place";
import Shop from "@/models/CityRoutes/Shop";
import Transport from "@/models/CityRoutes/Transport";

import SELECT_FIELDS from "@/lib/selectFields";

const MODELS = {
  Accommodation,
  Activity,
  CityInfo,
  Connectivity,
  Food,
  HiddenGem,
  Itinerary,
  Misc,
  NearbySpot,
  Place,
  Shop,
  Transport,
};

export const GET = withAuth(async (req, context) => {
  try {
    await connectToDatabase();

    const { cityName } = await context.params; // dynamic param from route
    const userId = req.user.userId;

    if (!cityName) {
      return NextResponse.json(
        { success: false, error: "cityName is required" },
        { status: 400 }
      );
    }

    // ✅ Find user
    const user = await User.findById(userId).lean();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // ✅ Filter wishlist entries for this city
    const filteredWishlist = user.wishlist.filter(
      (item) => item.cityName === cityName
    );

    if (!filteredWishlist.length) {
      return NextResponse.json({
        success: true,
        wishlist: [],
      });
    }

    // ✅ Populate according to each onModel
    const populated = await Promise.all(
      filteredWishlist.map(async (item) => {
        try {
          const Model = MODELS[item.onModel];
          if (!Model) return null;

          const selectFields = SELECT_FIELDS[item.onModel] || "";
          const data = await Model.findById(item.parentRef)
            .select(selectFields)
            .lean();

          return data ? { ...item, data } : null;
        } catch (err) {
          console.error(`Error fetching ${item.onModel}:`, err);
          return null;
        }
      })
    );

    return NextResponse.json({
      success: true,
      wishlist: populated.filter(Boolean),
    });
  } catch (error) {
    console.error("Error fetching wishlist by city:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
});
