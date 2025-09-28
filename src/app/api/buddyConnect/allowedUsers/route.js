// app/api/buddyConnect/allowedUsers/route.js
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import { withAuth } from '@/middleware/auth';

export const GET = withAuth(async (req) => {
  try {
    await connectToDatabase();

    // Fetch all users who allow connections
    const users = await User.find({ allowToConnect: true }).select(
      'username isPremium contributionPoints referralCount favouriteCities'
    );

    return new Response(JSON.stringify({ users }), { status: 200 });
  } catch (err) {
    console.error('Error fetching allowed users:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to fetch users' }),
      { status: 500 }
    );
  }
});
