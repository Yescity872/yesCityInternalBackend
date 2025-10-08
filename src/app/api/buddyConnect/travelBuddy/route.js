import { connectToDatabase } from '@/lib/db';
import TravelBuddy from '@/models/TravelBuddy';
import { withAuth } from '@/middleware/auth';

/**
 * GET: Fetch all future travels (endDate >= today)
 * Query params optional for filtering: city, fromDate, toDate
 */
export const GET = withAuth(async (req) => {
  try {
    await connectToDatabase();

    const url = new URL(req.url);
    const city = url.searchParams.get('city');
    const fromDate = url.searchParams.get('fromDate');
    const toDate = url.searchParams.get('toDate');

    const today = new Date();

    let query = { endDate: { $gte: today } };

    // Optional city filter
    if (city) {
      query.city = { $regex: new RegExp(city, 'i') }; // case-insensitive
    }

    // Optional date range overlap filter
    if (fromDate && toDate) {
      const from = new Date(fromDate);
      const to = new Date(toDate);
      query = {
        ...query,
        startDate: { $lte: to },
        endDate: { $gte: from },
      };
    }

    const travels = await TravelBuddy.find(query)
      .populate('user', 'username email')
      .sort({ startDate: 1 });

    return new Response(JSON.stringify({ travels }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching travels:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch travels' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

/**
 * POST: Add a new travel buddy plan
 */
export const POST = withAuth(async (req) => {
  try {
    await connectToDatabase();

    const body = await req.json();
    const { city, startDate, endDate, description, travelType } = body;

    if (!city || !startDate || !endDate) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const newTravel = new TravelBuddy({
      user: req.user.userId, // from withAuth
      city,
      startDate,
      endDate,
      description: description || '',
      travelType: travelType || 'open',
    });

    await newTravel.save();

    return new Response(JSON.stringify({ message: 'Travel added', travel: newTravel }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error adding travel:', error);
    return new Response(JSON.stringify({ error: 'Failed to add travel' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
