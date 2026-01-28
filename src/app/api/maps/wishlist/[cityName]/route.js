import { connectToDatabase } from "@/lib/db";
import User from "@/models/User";
import { withAuth } from "@/middleware/auth";
import { NextResponse } from "next/server";

// Import only models that exist in wishlist enum
import Accommodation from "@/models/CityRoutes/Accommodation";
// import Activity from "@/models/CityRoutes/Activity";
import Food from "@/models/CityRoutes/Food";
import HiddenGem from "@/models/CityRoutes/HiddenGem";
import NearbySpot from "@/models/CityRoutes/NearbySpot";
import Place from "@/models/CityRoutes/Place";
import Shop from "@/models/CityRoutes/Shop";
// import Festivals from "@/models/CityRoutes/Festivals"; // only if exists

import SELECT_FIELDS from "@/lib/selectFields";

// Strict mapping of categories allowed in wishlist
const WISHLIST_MODELS = {
  Accommodation,
//   Activity,
  Food,
  HiddenGem,
  NearbySpot,
  Place,
  Shop,
};

export const GET = withAuth(async (req, context) => {
  try {
    await connectToDatabase();

    const { cityName } = await context.params;
    const userId = req.user.userId;

    if (!cityName) {
      return NextResponse.json(
        { success: false, error: "cityName is required" },
        { status: 400 }
      );
    }

    const user = await User.findById(userId).lean();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    const formattedCity = decodeURIComponent(cityName).toLowerCase();

    const filteredWishlist = user.wishlist.filter(
    (item) =>
        item.cityName.trim().toLowerCase() === formattedCity.trim().toLowerCase()
    );


    if (!filteredWishlist.length) {
      return NextResponse.json({
        success: true,
        wishlist: [],
      });
    }

    const populated = await Promise.all(
      filteredWishlist.map(async (item) => {
        const Model = WISHLIST_MODELS[item.onModel];

        // If model is not allowed → skip
        if (!Model) return null;

        const fields = SELECT_FIELDS[item.onModel] || "";
        try {
          const data = await Model.findById(item.parentRef)
            .select(fields)
            .lean();

          return data ? { ...item, data } : null;
        } catch (e) {
          console.error(`Error populating model ${item.onModel}:`, e);
          return null;
        }
      })
    );

    return NextResponse.json({
      success: true,
      wishlist: populated.filter(Boolean),
    });
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
});
