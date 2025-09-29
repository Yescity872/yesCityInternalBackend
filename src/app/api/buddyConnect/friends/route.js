// app/api/buddyConnect/friends/route.js
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import { withAuth } from '@/middleware/auth';

export const GET = withAuth(async (req) => {
  try {
    const userId = req.user.userId;

    await connectToDatabase();

    const user = await User.findById(userId);

    // Populate connected users
    await user.populate(
      'connectedUsers',
      'username isPremium contributionPoints referralCount profileImage favouriteCities'
    );

    const message = user.allowToConnect
      ? null
      : 'Enable allowToConnect to let other users connect with you';

    return new Response(
      JSON.stringify({ 
        friends: user.connectedUsers, 
        currentUserId: userId.toString(), // ✅ ADDED: Return current user ID
        message 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Error fetching friends:', err);
    return new Response(JSON.stringify({ error: 'Failed to fetch friends' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});