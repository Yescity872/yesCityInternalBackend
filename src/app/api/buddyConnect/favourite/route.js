// app/api/buddyConnect/favourite/route.js
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import { withAuth } from '@/middleware/auth';

export const POST = withAuth(async (req) => {
  try {
    const userId = req.user.userId;
    const { cities } = await req.json(); // can be a single string or array

    await connectToDatabase();

    const user = await User.findById(userId);
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
      });
    }

    let cityArray = [];
    if (typeof cities === "string") {
      cityArray = [cities];
    } else if (Array.isArray(cities)) {
      cityArray = cities;
    } else {
      return new Response(JSON.stringify({ error: 'Invalid input' }), {
        status: 400,
      });
    }

    // Add new unique cities
    cityArray.forEach((city) => {
      if (!user.favouriteCities.includes(city)) {
        user.favouriteCities.push(city);
      }
    });

    await user.save();

    return new Response(
      JSON.stringify({
        success: true,
        favouriteCities: user.favouriteCities,
      }),
      { status: 200 }
    );
  } catch (err) {
    console.error('Error adding favourite city:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to add city' }),
      { status: 500 }
    );
  }
});
