// app/api/buddyConnect/following/route.js
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import { withAuth } from '@/middleware/auth';

export const GET = withAuth(async (req) => {
  try {
    const userId = req.user.userId;

    await connectToDatabase();

    const user = await User.findById(userId).populate(
      'followingUsers',
      'username isPremium contributionPoints referralCount favouriteCities'
    );

    return new Response(
      JSON.stringify({ following: user.followingUsers }),
      { status: 200 }
    );
  } catch (err) {
    console.error('Error fetching following:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch following' }),
      { status: 500 }
    );
  }
});
