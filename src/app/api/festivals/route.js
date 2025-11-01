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
    const date = searchParams.get('date');
    const premium = searchParams.get('premium');
    const best_experience_time = searchParams.get('best_experience_time');
    const limit = Number.parseInt(searchParams.get('limit')) || 50;
    const page = Number.parseInt(searchParams.get('page')) || 1;

    // Build filter query
    const filter = {};
    if (city) filter.city = new RegExp(city, 'i'); // Case-insensitive
    if (state) filter.state = new RegExp(state, 'i');
    if (category) filter.category = category;
    if (date) filter.date = date; // Exact match for date
    if (premium) filter.premium = premium;
    if (best_experience_time) filter.best_experience_time = new RegExp(best_experience_time, 'i');

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

    // Validate date format: accept ISO-8601 or any string parseable by Date
    const parsedDate = new Date(body.date);
    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { success: false, message: 'Invalid date format. Use ISO-8601 date string.' },
        { status: 400 }
      );
    }

    // Validate duration_days
    if (typeof body.duration_days !== 'number' || body.duration_days <= 0) {
      return NextResponse.json({ success: false, message: 'duration_days must be a positive number' }, { status: 400 });
    }

    // Validate category against allowed values
    const allowedCategories = ["Religious", "Religious Celebration", "Cultural", "Seasonal", "Regional", "National"];
    if (body.category && !allowedCategories.includes(body.category)) {
      return NextResponse.json({ success: false, message: `Invalid category. Allowed: ${allowedCategories.join(', ')}` }, { status: 400 });
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

    // Generate a URL-friendly slug (ensure uniqueness by appending a short suffix if needed)
    const generateSlug = (name) => {
      if (!name) return '';
      const base = name.toString().toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-');
      return base;
    };

    let slug = generateSlug(body.name);
    // If slug collides, append a short suffix (timestamp-based) — this is simple but effective
    if (slug) {
      const existing = await Festival.findOne({ slug });
      if (existing) {
        slug = `${slug}-${Date.now().toString().slice(-4)}`;
      }
    }

    // Create festival data structure
    const festivalData = {
      name: body.name,
      slug,
      city: body.city,
      state: body.state,
      country: body.country || 'India',
  // store as Date object
  date: parsedDate,
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
