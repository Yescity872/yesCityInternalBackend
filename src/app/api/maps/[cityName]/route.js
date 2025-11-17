import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';

// Import all 6 category models
import Accommodation from '@/models/CityRoutes/Accommodation';
import Food from '@/models/CityRoutes/Food';
import HiddenGem from '@/models/CityRoutes/HiddenGem';
import NearbySpot from '@/models/CityRoutes/NearbySpot';
import Place from '@/models/CityRoutes/Place';
import Shop from '@/models/CityRoutes/Shop';

// Map category to model + fields to fetch
const CATEGORY_CONFIG = {
  Accommodation: {
    model: Accommodation,
    fields: '_id cityName flagship hotels roomTypes images premium lat lon locationLink',
  },
  Food: {
    model: Food,
    fields: '_id cityName flagship foodPlace vegOrNonVeg menuSpecial images premium lat lon locationLink',
  },
  HiddenGem: {
    model: HiddenGem,
    fields: '_id cityName hiddenGem images premium lat lon locationLink',
  },
  NearbySpot: {
    model: NearbySpot,
    fields: '_id cityName places description images premium lat lon locationLink',
  },
  Place: {
    model: Place,
    fields: '_id cityName places establishYear description images premium lat lon locationLink',
  },
  Shop: {
    model: Shop,
    fields: '_id cityName flagship shops famousFor images premium lat lon locationLink',
  },
};

export async function GET(req, context) {
  try {
    await connectToDatabase();
    const { cityName } = await context.params;
    const formattedCityName = decodeURIComponent(cityName).toLowerCase();

    const result = {};

    // ✅ Fetch data for all 6 categories
    for (const [category, { model, fields }] of Object.entries(CATEGORY_CONFIG)) {
      const data = await model.find({
        cityName: { $regex: new RegExp(`^${formattedCityName}$`, 'i') },
      }).select(fields);

      result[category] = data || [];
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    console.error('Error fetching city categories:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
