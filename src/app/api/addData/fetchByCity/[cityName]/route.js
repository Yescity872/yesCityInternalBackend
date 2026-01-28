// app/api/cityRoutes/fetchByCity/[cityName]/route.js
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';

import Accommodation from '@/models/CityRoutes/Accommodation';
import Activity from '@/models/CityRoutes/Activity';
import CityInfo from '@/models/CityRoutes/CityInfo';
import Connectivity from '@/models/CityRoutes/Connectivity';
import Food from '@/models/CityRoutes/Food';
import HiddenGem from '@/models/CityRoutes/HiddenGem';
import Itinerary from '@/models/CityRoutes/Itinerary';
import Misc from '@/models/CityRoutes/Misc';
import NearbySpot from '@/models/CityRoutes/NearbySpot';
import Place from '@/models/CityRoutes/Place';
import Shop from '@/models/CityRoutes/Shop';
import Transport from '@/models/CityRoutes/Transport';

const modelMap = {
  accommodation: Accommodation,
  activity: Activity,
  cityinfo: CityInfo,
  connectivity: Connectivity,
  food: Food,
  hiddengem: HiddenGem,
  itinerary: Itinerary,
  misc: Misc,
  nearbyspot: NearbySpot,
  place: Place,
  shop: Shop,
  transport: Transport,
};

export async function GET(req, context) {
  try {
    const cityName = decodeURIComponent(context.params.cityName);
    if (!cityName) {
      return NextResponse.json({ error: 'cityName is required' }, { status: 400 });
    }

    await connectToDatabase();

    const results = {};
    const excludeFields = { engagement: 0, reviews: 0 };

    for (const [key, Model] of Object.entries(modelMap)) {
      try {
        const docs = await Model.find({ cityName }).select(excludeFields);
        results[key] = docs;
      } catch (err) {
        console.error(`Error fetching ${key}:`, err);
        results[key] = { error: 'Fetch failed' };
      }
    }

    // Check for ?download=true
    const { searchParams } = new URL(req.url);
    const download = searchParams.get("download") === "true";

    if (download) {
      return new NextResponse(JSON.stringify(results, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${cityName}.json"`,
        },
      });
    }

    // Normal API response
    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error('Error fetching city data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
