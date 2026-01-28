// app/api/buddyConnect/findByCity/[city]/route.js
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import { withAuth } from '@/middleware/auth';

export const GET = withAuth(async (req, { params }) => {
  try {
    const city = decodeURIComponent(params.city);
    const userId = req.user.userId;

    await connectToDatabase();

    // Fetch current user to get connectedUsers, pendingRequests, and followingUsers
    const currentUser = await User.findById(userId).select(
      'connectedUsers pendingRequests followingUsers'
    );
    if (!currentUser) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
      });
    }

    const excludeIds = [
      userId,
      ...currentUser.connectedUsers.map((id) => id.toString()),
      ...currentUser.pendingRequests.map((id) => id.toString()),
      ...currentUser.followingUsers.map((id) => id.toString()),
    ];

    // Find users who have this city in favourites AND allowToConnect = true
    // Excluding users in excludeIds
    const users = await User.find({
      favouriteCities: city,
      allowToConnect: true,
      _id: { $nin: excludeIds },
    }).select('username email profileImage favouriteCities');

    return new Response(JSON.stringify({ users }), { status: 200 });
  } catch (err) {
    console.error('Error finding users by city:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to find users' }),
      { status: 500 }
    );
  }
});
