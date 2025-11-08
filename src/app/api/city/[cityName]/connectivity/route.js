import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Connectivity from '@/models/CityRoutes/Connectivity';
import { withAuth, getUserFromCookies } from '@/middleware/auth';
import { recordCategoryEngagement } from '@/lib/engagement';

// ✅ Core handler (shared for public & auth)
async function coreHandler(req, context, user = null) {
  try {
    await connectToDatabase();

    const { cityName } = await context.params;
    const formattedCityName = decodeURIComponent(cityName).toLowerCase();

    // ✅ Pagination
    const { searchParams } = new URL(req.url);
    const page = Number.parseInt(searchParams.get('page') || '1', 10);
    const limit = 5;
    const skip = (page - 1) * limit;

    // ✅ Fetch data - only get records with valid location AND distance
    const connectivityRecords = await Connectivity.find({
      cityName: { $regex: new RegExp(`^${formattedCityName}$`, 'i') },
      nearestAirportStationBusStand: { $exists: true, $nin: [null, ''] },
      distance: { $exists: true, $nin: [null, ''] },
    })
      .select('_id cityName nearestAirportStationBusStand distance premium')
      .skip(skip)
      .limit(limit)
      .lean();
    
    // Additional filter for whitespace-only strings
    const filteredRecords = connectivityRecords.filter(record => 
      record.nearestAirportStationBusStand?.trim() && 
      record.distance?.trim()
    );

    if (!filteredRecords.length) {
      return NextResponse.json({ error: 'No connectivity data found' }, { status: 404 });
    }

    // ✅ Count total - same filter
    const total = await Connectivity.countDocuments({
      cityName: { $regex: new RegExp(`^${formattedCityName}$`, 'i') },
      nearestAirportStationBusStand: { $exists: true, $nin: [null, ''] },
      distance: { $exists: true, $nin: [null, ''] },
    });

    // ✅ Record engagement (including page=1 if user is logged in)
    if (user) {
      await recordCategoryEngagement(user, formattedCityName, "Connectivity");
    }    

    return NextResponse.json({
      data: filteredRecords,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching connectivity:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// ✅ Public for page=1, Auth required for page>1
export async function GET(req, context) {
  const { searchParams } = new URL(req.url);
  const page = Number.parseInt(searchParams.get("page") || "1", 10);

  if (page === 1) {
    // ✅ Try to get user (if logged in)
    const user = await getUserFromCookies();
    return coreHandler(req, context, user);
  }

  // ✅ Page > 1 always requires auth
  return withAuth(async (reqWithAuth, contextWithAuth) => {
    return coreHandler(reqWithAuth, contextWithAuth, reqWithAuth.user);
  })(req, context);
}
