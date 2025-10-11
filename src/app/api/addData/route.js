import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';

// import City from '@/models/City';
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
  // city: City,
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

export async function POST(request) {
  try {
    await connectToDatabase();
    const body = await request.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    const results = {};

    for (const [key, value] of Object.entries(body)) {
      const modelKey = key.toLowerCase();
      const Model = modelMap[modelKey];

      if (!Model) {
        results[key] = { success: false, error: 'Invalid collection name' };
        continue;
      }

      if (!Array.isArray(value)) {
        results[key] = { success: false, error: 'Expected an array of objects' };
        continue;
      }

      try {
        const inserted = await Model.insertMany(value);
        results[key] = { success: true, count: inserted.length };
      } catch (err) {
        console.error(`Error inserting into ${key}:`, err);
        results[key] = { success: false, error: 'Insert failed' };
      }
    }

    return NextResponse.json({ results }, { status: 200 });
  } catch (error) {
    console.error('Error in bulk POST route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}



