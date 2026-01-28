import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import { handlePost } from '@/utils/handlePost';

import City from '@/models/City';
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
  city: City,
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

export async function POST(request, context) {
  const {collection} = await context.params;

  try {
    await connectToDatabase();

    const modelKey = collection.toLowerCase();
    const Model = modelMap[modelKey];

    if (!Model) {
      return NextResponse.json({ error: 'Invalid collection name' }, { status: 400 });
    }

    return await handlePost(Model, request);
  } catch (error) {
    console.error('Error in dynamic POST route:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
