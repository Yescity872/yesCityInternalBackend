import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Shop from '@/models/CityRoutes/Shop';
import { withAuth } from '@/middleware/auth';
import { recordCategoryEngagement } from '@/lib/engagement'; // ✅ import utility


// ✅ Premium helper
function getAccessiblePremiums(userPremium) {
  if (userPremium === 'B') return ['FREE', 'A', 'B'];
  if (userPremium === 'A') return ['FREE', 'A'];
  return ['FREE'];
}

// ✅ Core handler (shared for both public + auth calls)
async function coreHandler(req, context, user = null) {
  try {
    await connectToDatabase();

    const userPremium = user?.isPremium || 'FREE';
    const { cityName } = context.params;
    const formattedCityName = decodeURIComponent(cityName).toLowerCase();

    const accessiblePremiums = getAccessiblePremiums(userPremium);

    // ✅ Pagination setup
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = 5;
    const skip = (page - 1) * limit;

    // ✅ Fetch shops
    const shops = await Shop.find({
      cityName: { $regex: new RegExp(`^${formattedCityName}$`, 'i') },
      premium: { $in: accessiblePremiums },
    })
      .select('_id cityName flagship shops famousFor images premium')
      .skip(skip)
      .limit(limit);

    if (!shops.length) {
      return NextResponse.json({ error: 'No shops found' }, { status: 404 });
    }

    // ✅ Pagination metadata
    const total = await Shop.countDocuments({
      cityName: { $regex: new RegExp(`^${formattedCityName}$`, 'i') },
      premium: { $in: accessiblePremiums },
    });

    // ✅ Record engagement (including page=1 if user is logged in)
    if (user) {
      await recordCategoryEngagement(user, formattedCityName, "Shop");
    }   

    return NextResponse.json({
      data: shops,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching shops:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}



// ✅ Public entrypoint
// ✅ Public for page=1, Auth required for page>1
import { getUserFromCookies } from "@/middleware/auth"; // import the helper

export async function GET(req, context) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1", 10);

  if (page === 1) {
    // ✅ Try to get user (if logged in)
    const user = await getUserFromCookies();
    return coreHandler(req, context, user); // pass user if found, else null
  }

  // ✅ Page > 1 always requires auth
  return withAuth(async (reqWithAuth, contextWithAuth) => {
    return coreHandler(reqWithAuth, contextWithAuth, reqWithAuth.user);
  })(req, context);
}