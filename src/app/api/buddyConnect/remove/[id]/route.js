// app/api/buddyConnect/remove/[id]/route.js
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import { withAuth } from '@/middleware/auth';

export const DELETE = withAuth(async (req, { params }) => {
  try {
    const userId = req.user.userId;
    const friendId = params.id;

    await connectToDatabase();

    const user = await User.findById(userId);
    const friend = await User.findById(friendId);

    if (!user || !friend) return new Response(JSON.stringify({ error: 'User not found' }), { status: 404 });

    user.connectedUsers = user.connectedUsers.filter((id) => id.toString() !== friendId);
    friend.connectedUsers = friend.connectedUsers.filter((id) => id.toString() !== userId);

    await user.save();
    await friend.save();

    return new Response(JSON.stringify({ success: true, message: 'Friend removed' }), { status: 200 });
  } catch (err) {
    console.error('Error removing friend:', err);
    return new Response(JSON.stringify({ error: 'Failed to remove friend' }), { status: 500 });
  }
});
