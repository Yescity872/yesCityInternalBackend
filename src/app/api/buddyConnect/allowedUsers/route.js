// app/api/buddyConnect/allowedUsers/route.js
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import { withAuth } from '@/middleware/auth';

export const GET = withAuth(async (req) => {
  try {
    const userId = req.user.userId; // Current user
    await connectToDatabase();

    // Fetch current user to get connectedUsers and pendingRequests
    const currentUser = await User.findById(userId).select('connectedUsers pendingRequests');
    if (!currentUser) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });
    }

    const excludeIds = [
      userId,
      ...currentUser.connectedUsers.map((id) => id.toString()),
      ...currentUser.pendingRequests.map((id) => id.toString()),
    ];

    // Fetch allowed users excluding the ones in excludeIds
    const users = await User.find({
      allowToConnect: true,
      _id: { $nin: excludeIds },
    }).select('username isPremium contributionPoints referralCount favouriteCities');

    return new Response(JSON.stringify({ users }), { status: 200 });
  } catch (err) {
    console.error('Error fetching allowed users:', err);
    return new Response(JSON.stringify({ error: 'Failed to fetch users' }), { status: 500 });
  }
});
