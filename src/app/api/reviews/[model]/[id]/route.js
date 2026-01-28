import { connectToDatabase } from '@/lib/db';
import Review from '@/models/Review';
import { withAuth } from '@/middleware/auth';

import User from '@/models/User'; // ✅ THIS IS REQUIRED

// ✅ Import all models
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

// ✅ Mapping lowercase route to actual model
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

async function handler(_req, context) {
  try {
    await connectToDatabase();

    const { model, id } = await context.params;

    if (!model || !id) {
      return new Response(JSON.stringify({ message: 'Model and ID are required.' }), { status: 400 });
    }

    // Convert model name to PascalCase (capitalize first letter)
    const modelKey = model.charAt(0).toUpperCase() + model.slice(1);

    // Validate model exists
    if (!MODELS[modelKey]) {
      return new Response(JSON.stringify({ message: `Invalid model: ${model}` }), { status: 400 });
    }

    // ✅ Find reviews for this model and id
    const reviews = await Review.find({
      onModel: modelKey,
      parentRef: id,
    }).populate('createdBy', 'username email');

    return new Response(JSON.stringify({ success: true, reviews }), { status: 200 });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), { status: 500 });
  }
}

export const GET = withAuth(handler);
