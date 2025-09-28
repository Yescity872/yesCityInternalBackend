// app/api/buddyConnect/findByCity/[city]/route.js
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import { withAuth } from '@/middleware/auth';

export const GET = withAuth(async (req, { params }) => {
  try {
    const city = decodeURIComponent(params.city);

    await connectToDatabase();

    // Find users who have this city in favourites AND allowToConnect = true
    const users = await User.find({
      favouriteCities: city,
      allowToConnect: true
    }).select('username email profileImage favouriteCities');

    return new Response(JSON.stringify({ users }), { status: 200 });
  } catch (err) {
    console.error('Error finding users by city:', err);
    return new Response(JSON.stringify({ error: 'Failed to find users' }), { status: 500 });
  }
});
