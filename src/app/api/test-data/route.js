import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';

// Import your existing models
import PlacesToVisit from '@/models/CityRoutes/Place';
import Food from '@/models/CityRoutes/Food';
import Accommodation from '@/models/CityRoutes/Accommodation';
import Activity from '@/models/CityRoutes/Activity';
import Shop from '@/models/CityRoutes/Shop';
import HiddenGem from '@/models/CityRoutes/HiddenGem';
import NearbySpot from '@/models/CityRoutes/NearbySpot';

export async function GET() {
  try {
    await connectToDatabase();
    
    const stats = {
      PlacesToVisit: await PlacesToVisit.countDocuments(),
      Food: await Food.countDocuments(),
      Accommodation: await Accommodation.countDocuments(),
      Activity: await Activity.countDocuments(),
      Shop: await Shop.countDocuments(),
      HiddenGem: await HiddenGem.countDocuments(),
      NearbySpot: await NearbySpot.countDocuments(),
    };
    
    // Get sample documents from each collection
    const samples = {
      PlacesToVisit: await PlacesToVisit.findOne().populate('cityId', 'cityName').lean(),
      Food: await Food.findOne().populate('cityId', 'cityName').lean(),
      Accommodation: await Accommodation.findOne().populate('cityId', 'cityName').lean(),
      Activity: await Activity.findOne().populate('cityId', 'cityName').lean(),
      Shop: await Shop.findOne().populate('cityId', 'cityName').lean(),
      HiddenGem: await HiddenGem.findOne().populate('cityId', 'cityName').lean(),
      NearbySpot: await NearbySpot.findOne().populate('cityId', 'cityName').lean(),
    };
    
    return NextResponse.json({
      success: true,
      message: "Database statistics and samples",
      stats,
      samples: Object.fromEntries(
        Object.entries(samples).map(([key, value]) => [
          key, 
          value ? {
            id: value._id,
            cityName: value.cityName || value.cityId?.cityName,
            mainField: value.places || value.foodPlace || value.hotels || value.topActivities || value.shops || value.hiddenGem || 'unknown',
            hasAddress: !!value.address,
            hasCategory: !!value.category,
            hasDescription: !!(value.description || value.famousFor)
          } : null
        ])
      )
    });
    
  } catch (error) {
    console.error('Database test error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Database test failed',
        message: error.message 
      },
      { status: 500 }
    );
  }
}