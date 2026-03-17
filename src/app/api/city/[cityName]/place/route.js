import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Place from '@/models/CityRoutes/Place';
import { withAuth } from '@/middleware/auth';
import { recordCategoryEngagement } from '@/lib/engagement'; // ✅ import utility


// ✅ Premium access helper
function getAccessiblePremiums(userPremium) {
  if (userPremium === 'B') return ['FREE', 'A', 'B'];
  if (userPremium === 'A') return ['FREE', 'A'];
  return ['FREE'];
}

// ✅ Core reusable logic
async function coreHandler(req, context, user = null) {
  try {
    await connectToDatabase();

    const userPremium = user?.isPremium || 'FREE';

    const { cityName } = context.params;
    const formattedCityName = decodeURIComponent(cityName).toLowerCase();

    // const accessiblePremiums = getAccessiblePremiums(userPremium);

    // ✅ Get query params
    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get('ids');

    if (idsParam) {
      const ids = idsParam.split(',').map((id) => id.trim()).filter(Boolean);

      const places = await Place.find({
        _id: { $in: ids },
        cityName: { $regex: new RegExp(`^${formattedCityName}$`, 'i') },
      }).select('_id cityName places establishYear description images premium');

      if (!places.length) {
        return NextResponse.json({ error: 'No places found for the given IDs' }, { status: 404 });
      }

      if (user) {
        await recordCategoryEngagement(user, formattedCityName, "Place");
      }        

      return NextResponse.json({ data: places });
    }

    // ✅ Normal paginated fetch
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = 5;
    const skip = (page - 1) * limit;

    // ✅ Fetch places
    const places = await Place.find({
      cityName: { $regex: new RegExp(`^${formattedCityName}$`, 'i') },
      // premium: { $in: accessiblePremiums },
    })
      .select('_id cityName places establishYear description images premium')
      .skip(skip)
      .limit(limit);

    if (!places.length) {
      return NextResponse.json({ error: 'No places found' }, { status: 404 });
    }

    // ✅ Get total count
    const total = await Place.countDocuments({
      cityName: { $regex: new RegExp(`^${formattedCityName}$`, 'i') },
      // premium: { $in: accessiblePremiums },
    });

    // ✅ Record engagement (including page=1 if user is logged in)
    if (user) {
      await recordCategoryEngagement(user, formattedCityName, "Place");
    }        

    return NextResponse.json({
      data: places,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching places:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}



export async function GET(req, context) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1", 10);
  const idsParam = searchParams.get("ids");

  if (idsParam || page === 1) {
    // ✅ Try to get user (if logged in)
    const user = await getUserFromCookies();
    return coreHandler(req, context, user);
  }

  // ✅ Page > 1 always requires auth
  return withAuth(async (reqWithAuth, contextWithAuth) => {
    return coreHandler(reqWithAuth, contextWithAuth, reqWithAuth.user);
  })(req, context);
}