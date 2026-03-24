import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Food from '@/models/CityRoutes/Food';
import { withAuth, getUserFromCookies } from '@/middleware/auth';
import { recordCategoryEngagement } from '@/lib/engagement'; // ✅ import utility


// ✅ Premium access helper
function getAccessiblePremiums(userPremium) {
  if (userPremium === 'B') return ['FREE', 'A', 'B'];
  if (userPremium === 'A') return ['FREE', 'A'];
  return ['FREE'];
}

// ✅ Core handler (works for public + auth)
async function coreHandler(req, context, user = null) {
  try {
    await connectToDatabase();

    const userPremium = user?.isPremium || 'FREE';

    const { cityName } = await context.params;
    const formattedCityName = decodeURIComponent(cityName).toLowerCase();

    // const accessiblePremiums = getAccessiblePremiums(userPremium);

    // ✅ Get query params
    const { searchParams } = new URL(req.url);
    const idsParam = searchParams.get('ids');

    if (idsParam) {
      const ids = idsParam.split(',').map((id) => id.trim()).filter(Boolean);

      const foods = await Food.find({
        _id: { $in: ids },
        cityName: { $regex: new RegExp(`^${formattedCityName}$`, 'i') },
      }).select('_id cityName flagship foodPlace vegOrNonVeg menuSpecial images premium');

      if (!foods.length) {
        return NextResponse.json({ error: 'No food data found for the given IDs' }, { status: 404 });
      }

      if (user) {
        await recordCategoryEngagement(user, formattedCityName, "Food");
      }

      return NextResponse.json({ data: foods });
    }

    // ✅ Normal paginated fetch
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = 5;
    const skip = (page - 1) * limit;

    // ✅ Find foods
    const foods = await Food.find({
      cityName: { $regex: new RegExp(`^${formattedCityName}$`, 'i') },
      // premium: { $in: accessiblePremiums },
    })
      .select('_id cityName flagship foodPlace vegOrNonVeg menuSpecial images premium')
      .skip(skip)
      .limit(limit);

    if (!foods.length) {
      return NextResponse.json({ error: 'No food data found' }, { status: 404 });
    }

    // ✅ Total count
    const total = await Food.countDocuments({
      cityName: { $regex: new RegExp(`^${formattedCityName}$`, 'i') },
      // premium: { $in: accessiblePremiums },
    });

    // ✅ Record engagement (including page=1 if user is logged in)
    if (user) {
      await recordCategoryEngagement(user, formattedCityName, "Food");
    }    

    return NextResponse.json({
      data: foods,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching food data:', error);
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