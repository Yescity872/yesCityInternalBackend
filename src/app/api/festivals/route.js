// /api/festivals/route.js
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Festival from '@/models/Festivals';

// GET - Fetch all festivals (with optional filters)
export async function GET(req) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    const category = searchParams.get('category');
    const limit = Number.parseInt(searchParams.get('limit')) || 50;
    const page = Number.parseInt(searchParams.get('page')) || 1;

    // Build filter query
    const filter = {};
    if (city) filter.city = new RegExp(city, 'i'); // Case-insensitive
    if (state) filter.state = new RegExp(state, 'i');
    if (category) filter.category = category;

    // Fetch festivals with pagination
    const skip = (page - 1) * limit;
    const festivals = await Festival.find(filter)
      .sort({ date: 1, createdAt: -1 }) // Sort by date, then newest first
      .limit(limit)
      .skip(skip)
      .lean();

    const total = await Festival.countDocuments(filter);

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
    console.error('Error fetching festivals:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch festivals', error: error.message },
      { status: 500 }
    );
  }
}

// POST - Create a new festival
export async function POST(req) {
  try {
    await connectToDatabase();

    const body = await req.json();

    // Validate required fields
    const { name, city, state, date, duration_days, about, importance } = body;
    if (!name || !city || !state || !date || !duration_days || !about || !importance) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Process media images from the flat structure in your JSON
    const images = [];
    if (body.media) {
      for (let i = 0; i <= 10; i++) {
        const imageKey = `image_${i}`;
        if (body.media[imageKey]) {
          images.push(body.media[imageKey]);
        }
      }
    }

    // Create festival data structure
    const festivalData = {
      name: body.name,
      city: body.city,
      state: body.state,
      country: body.country || 'India',
      date: body.date,
      duration_days: body.duration_days,
      category: body.category || 'Cultural',
      about: body.about,
      importance: body.importance,
      locations: body.locations || [],
      budget_estimate: body.budget_estimate?.[0] || body.budget_estimate || {},
      travel_tips: body.travel_tips,
      best_experience_time: body.best_experience_time,
      media: {
        images: images.length > 0 ? images : (body.media?.images || []),
        videos: {
          full_video: body.media?.full_video || '',
          short_video: body.media?.short_video || '',
          drone_clip: body.media?.drone_clip || '',
        },
      },
      premium: body.premium || 'FREE',
    };

    const festival = await Festival.create(festivalData);

    return NextResponse.json(
      { success: true, message: 'Festival created successfully', data: festival },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating festival:', error);
    
    if (error.code === 11000) {
      return NextResponse.json(
        { success: false, message: 'Festival with this name already exists' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, message: 'Failed to create festival', error: error.message },
      { status: 500 }
    );
  }
}
