import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import CityInfo from '@/models/CityRoutes/CityInfo';
import { recordCategoryEngagement } from '@/lib/engagement';
import { getUserFromCookies } from '@/middleware/auth';

async function coreHandler(req, context, user = null) {
  try {
    await connectToDatabase();

    const userPremium = user?.isPremium || 'FREE';
    const { cityName } = await context.params;
    const formattedCityName = decodeURIComponent(cityName).toLowerCase();

    // ✅ Query data (no pagination)
    const cityInfos = await CityInfo.find({
      cityName: { $regex: new RegExp(`^${formattedCityName}$`, 'i') },
    }).select('_id cityName stateOrUT alternateNames coverImage premium');

    if (!cityInfos.length) {
      return NextResponse.json({ error: 'No city info found' }, { status: 404 });
    }

    // ✅ Record engagement if user is logged in
    if (user) {
      await recordCategoryEngagement(user, formattedCityName, 'CityInfo');
    }

    return NextResponse.json({
      success: true,
      count: cityInfos.length,
      data: cityInfos,
    });
  } catch (error) {
    console.error('Error fetching city info:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function GET(req, context) {
  try {
    // ✅ Try to get user (if logged in)
    const user = await getUserFromCookies(req); // ✅ important: pass req
    return coreHandler(req, context, user);
  } catch (err) {
    console.error('Error in GET handler:', err);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
