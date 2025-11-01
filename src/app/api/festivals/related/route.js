import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Festival from '@/models/Festivals';
import mongoose from 'mongoose';

// GET /api/festivals/related?festivalId=...&limit=3
export async function GET(req) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const idOrSlug = searchParams.get('festivalId');
    const limit = Number.parseInt(searchParams.get('limit')) || 3;

    if (!idOrSlug) {
      return NextResponse.json({ success: false, message: 'Missing festivalId' }, { status: 400 });
    }

    // Resolve festival by id or slug/name
    let festival = null;
    if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
      festival = await Festival.findById(idOrSlug).lean();
    }
    if (!festival) {
      festival = await Festival.findOne({ $or: [{ slug: idOrSlug }, { name: new RegExp(`^${idOrSlug}$`, 'i') }] }).lean();
    }

    if (!festival) {
      return NextResponse.json({ success: false, message: 'Festival not found' }, { status: 404 });
    }

    // Aggregation: score by category match (5), city match (2), views (0.01 * views)
    const pipeline = [
      { $match: { _id: { $ne: new mongoose.Types.ObjectId(festival._id) } } },
      { $addFields: {
          score: {
            $add: [
              { $cond: [{ $eq: ['$category', festival.category] }, 5, 0] },
              { $cond: [{ $eq: ['$city', festival.city] }, 2, 0] },
              { $multiply: [ { $ifNull: ['$engagement.views', 0] }, 0.01 ] }
            ]
          }
        }
      },
      { $sort: { score: -1, 'engagement.views': -1, date: 1 } },
      { $limit: limit },
      { $project: { score: 1, name: 1, city:1, state:1, date:1, media:1, category:1, premium:1, engagement:1 } }
    ];

    const related = await Festival.aggregate(pipeline);

    return NextResponse.json({ success: true, data: related }, { status: 200 });
  } catch (err) {
    console.error('Error fetching related festivals:', err);
    return NextResponse.json({ success: false, message: 'Failed to fetch related festivals', error: err.message }, { status: 500 });
  }
}
