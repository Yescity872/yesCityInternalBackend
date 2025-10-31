// /api/festivals/city/[cityName]/route.js
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Festival from '@/models/Festivals';

// GET - Fetch festivals by city name
export async function GET(req, { params }) {
  try {
    await connectToDatabase();

    const { cityName } = params;
    const decodedCity = decodeURIComponent(cityName);

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const limit = Number.parseInt(searchParams.get('limit')) || 50;
    const page = Number.parseInt(searchParams.get('page')) || 1;
    const upcoming = searchParams.get('upcoming') === 'true';

    // Build filter query
    const filter = {
      city: new RegExp(`^${decodedCity}$`, 'i'), // Case-insensitive exact match
    };

    if (category) {
      filter.category = category;
    }

    // Filter for upcoming festivals only
    if (upcoming) {
      const today = new Date().toISOString().split('T')[0];
      filter.date = { $gte: today };
    }

    // Fetch festivals with pagination
    const skip = (page - 1) * limit;
    const festivals = await Festival.find(filter)
      .sort({ date: 1, createdAt: -1 }) // Sort by date (soonest first), then newest
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await Festival.countDocuments(filter);

    if (festivals.length === 0) {
      return NextResponse.json({
        success: true,
        message: `No festivals found in ${decodedCity}`,
        data: [],
        pagination: {
          total: 0,
          page,
          limit,
          totalPages: 0,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: festivals,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching festivals by city:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch festivals', error: error.message },
      { status: 500 }
    );
  }
}
