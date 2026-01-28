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

export async function DELETE() {
  try {
    await connectToDatabase();

    const results = {};

    for (const [key, Model] of Object.entries(modelMap)) {
      try {
        const res = await Model.deleteMany({});
        results[key] = { success: true, deletedCount: res.deletedCount };
      } catch (err) {
        console.error(`Error deleting from ${key}:`, err);
        results[key] = { success: false, error: 'Delete failed' };
      }
    }

    return NextResponse.json({ results }, { status: 200 });
  } catch (error) {
    console.error('Error in bulk DELETE route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
