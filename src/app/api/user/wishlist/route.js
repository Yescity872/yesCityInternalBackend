import { connectToDatabase } from '@/lib/db.js';
import User from '@/models/User.js';
import { withAuth } from '@/middleware/auth.js';
import { NextResponse } from 'next/server';

// ==========================
// POST route
// ==========================
export const POST = withAuth(async (req) => {
  await connectToDatabase();
  const { onModel, parentRef, cityName } = await req.json();
  const userId = req.user.userId;

  if (!onModel || !parentRef || !cityName) {
    return NextResponse.json(
      { message: 'onModel, parentRef and cityName are required' },
      { status: 400 }
    );
  }

  const user = await User.findById(userId);

  const alreadyExists = user.wishlist.some(
    (item) =>
      item.onModel === onModel &&
      item.parentRef.toString() === parentRef &&
      item.cityName === cityName
  );

  if (alreadyExists) {
    return NextResponse.json({ message: 'Already in wishlist' }, { status: 400 });
  }

  user.wishlist.push({ onModel, parentRef, cityName });
  await user.save();

  return NextResponse.json({ success: true, message: 'Added to wishlist' });
});

// ==========================
// DELETE route
// ==========================
export const DELETE = withAuth(async (req) => {
  await connectToDatabase();
  const { onModel, parentRef, cityName } = await req.json();
  const userId = req.user.userId;

  if (!onModel || !parentRef || !cityName) {
    return NextResponse.json(
      { message: 'onModel, parentRef and cityName are required' },
      { status: 400 }
    );
  }

  await User.findByIdAndUpdate(userId, {
    $pull: {
      wishlist: { onModel, parentRef, cityName },
    },
  });

  return NextResponse.json({ success: true, message: 'Removed from wishlist' });
});

// ==========================
// GET route for wishlist
// ==========================
import Accommodation from '@/models/CityRoutes/Accommodation.js';
import Activity from '@/models/CityRoutes/Activity.js';
import CityInfo from '@/models/CityRoutes/CityInfo.js';
import Connectivity from '@/models/CityRoutes/Connectivity.js';
import Food from '@/models/CityRoutes/Food.js';
import HiddenGem from '@/models/CityRoutes/HiddenGem.js';
import Itinerary from '@/models/CityRoutes/Itinerary.js';
import Misc from '@/models/CityRoutes/Misc.js';
import NearbySpot from '@/models/CityRoutes/NearbySpot.js';
import Place from '@/models/CityRoutes/Place.js';
import Shop from '@/models/CityRoutes/Shop.js';
import Transport from '@/models/CityRoutes/Transport.js';

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

import SELECT_FIELDS from "@/lib/selectFields.js";

import City from "@/models/City.js";
import Festival from "@/models/Festivals.js";

export const GET = withAuth(async (req) => {
  try {
    await connectToDatabase();
    const userId = req.user.userId;

    const user = await User.findById(userId).lean();
    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    
    const nonFestivalWishlistItems = user.wishlist.filter(item => item.onModel !== 'festivals');
    const uniqueCityNames = [...new Set(nonFestivalWishlistItems.map((item) => item.cityName))];
    
    
    const cities = await City.find({ cityName: { $in: uniqueCityNames } })
      .select("cityName content coverImage")
      .lean();

    
    const festivalWishlistItems = user.wishlist.filter(item => item.onModel === 'festivals');
    const festivalIds = [...new Set(festivalWishlistItems.map(item => item.parentRef))];
    const festivals = await Festival.find({ _id: { $in: festivalIds } })
      .select("name city state category media premium")
      .lean();

    return NextResponse.json({
      success: true,
      count: cities.length + festivals.length,
      cities: cities,
      festivals: festivals,
    });
  } catch (error) {
    console.error("Error fetching wishlist:", error);
    return NextResponse.json(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
});



// export const GET = withAuth(async (req) => {
//   await connectToDatabase();
//   const userId = req.user.userId;

//   const user = await User.findById(userId).lean();
//   if (!user) {
//     return NextResponse.json({ message: "User not found" }, { status: 404 });
//   }

//   const populated = await Promise.all(
//     user.wishlist.map(async (item) => {
//       try {
//         const Model = MODELS[item.onModel];
//         const selectFields = SELECT_FIELDS[item.onModel] || "";

//         const data = await Model.findById(item.parentRef)
//           .select(selectFields)
//           .lean();

//         // keep cityName along with data
//         return data ? { ...item, data } : null;
//       } catch (e) {
//         console.error(`Error populating ${item.onModel}:`, e);
//         return null;
//       }
//     })
//   );

//   return NextResponse.json({
//     success: true,
//     wishlist: populated.filter(Boolean),
//   });
// });
