// app/api/buddyConnect/pending/route.js
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import { withAuth } from '@/middleware/auth';

export const GET = withAuth(async (req) => {
  try {
    const userId = req.user.userId;

    await connectToDatabase();

    const user = await User.findById(userId).populate('pendingRequests', 'username isPremium contributionPoints referralCount favouriteCities');

    return new Response(JSON.stringify({ pending: user.pendingRequests }), { status: 200 });
  } catch (err) {
    console.error('Error fetching pending:', err);
    return new Response(JSON.stringify({ error: 'Failed to fetch pending' }), { status: 500 });
  }
});
