import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import City from '@/models/City';
import CityInfo from '@/models/CityRoutes/CityInfo';
import { withAuth } from '@/middleware/auth';

async function handler(req, context) {
  try {
    await connectToDatabase();

    const { cityName } = await context.params;
    const formattedCityName = decodeURIComponent(cityName).toLowerCase();

    // ✅ Logged-in user
    const userId = req.user.userId;

    // ✅ Step 1: find city
    const city = await City.findOne({
      cityName: new RegExp(`^${formattedCityName}$`, "i"),
    }).select("cityName content coverImage engagement");

    if (!city) {
      return NextResponse.json({ error: "City not found" }, { status: 404 });
    }

    // ✅ Step 2: update engagement (views + viewedBy timestamps)
    city.engagement.views += 1;

    const viewedEntry = city.engagement.viewedBy.find(
      (v) => v.userId.toString() === userId.toString()
    );

    if (viewedEntry) {
      viewedEntry.timestamps.push(new Date());
    } else {
      city.engagement.viewedBy.push({
        userId,
        timestamps: [new Date()],
      });
    }

    await city.save();

    // ✅ Step 3: fetch corresponding city info (no premium filtering)
    const cityInfo = await CityInfo.findOne({ cityId: city._id }).select(
      "_id cityName stateOrUT alternateNames coverImage premium"
    );

    return NextResponse.json({
      city,
      cityInfo: cityInfo || null,
    });
  } catch (error) {
    console.error("Error fetching city:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ✅ Protect with auth
export const GET = withAuth(handler);
