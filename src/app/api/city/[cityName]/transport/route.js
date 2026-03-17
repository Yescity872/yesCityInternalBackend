import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Transport from '@/models/CityRoutes/Transport';
import { withAuth } from '@/middleware/auth';
import { recordCategoryEngagement } from '@/lib/engagement'; // ✅ import utility


// ✅ Premium helper
function getAccessiblePremiums(userPremium) {
  if (userPremium === 'B') return ['FREE', 'A', 'B'];
  if (userPremium === 'A') return ['FREE', 'A'];
  return ['FREE'];
}

// ✅ Core handler (works for both public + auth)
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

      const transports = await Transport.find({
        _id: { $in: ids },
        cityName: { $regex: new RegExp(`^${formattedCityName}$`, 'i') },
      }).select('_id cityName from to premium');

      if (!transports.length) {
        return NextResponse.json({ error: 'No transport options found for the given IDs' }, { status: 404 });
      }

      if (user) {
        await recordCategoryEngagement(user, formattedCityName, "Transport");
      }    

      return NextResponse.json({ data: transports });
    }

    // ✅ Normal paginated fetch
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = 5;
    const skip = (page - 1) * limit;

    // ✅ Fetch transports
    const transports = await Transport.find({
      cityName: { $regex: new RegExp(`^${formattedCityName}$`, 'i') },
      // premium: { $in: accessiblePremiums },
    })
      .select('_id cityName from to premium')
      .skip(skip)
      .limit(limit);

    if (!transports.length) {
      return NextResponse.json({ error: 'No transport options found' }, { status: 404 });
    }


    // ✅ Count total for pagination
    const total = await Transport.countDocuments({
      cityName: { $regex: new RegExp(`^${formattedCityName}$`, 'i') },
      // premium: { $in: accessiblePremiums },
    });

    // ✅ Record engagement (including page=1 if user is logged in)
    if (user) {
      await recordCategoryEngagement(user, formattedCityName, "Transport");
    }    

    return NextResponse.json({
      data: transports,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching transport options:', error);
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