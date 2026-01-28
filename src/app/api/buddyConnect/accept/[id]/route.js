// app/api/buddyConnect/accept/[id]/route.js
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import { withAuth } from '@/middleware/auth';

export const POST = withAuth(async (req, { params }) => {
  try {
    const toUserId = req.user.userId; // user accepting the request
    const fromUserId = params.id; // user who sent the request

    await connectToDatabase();

    const toUser = await User.findById(toUserId);
    const fromUser = await User.findById(fromUserId);

    if (!toUser || !fromUser) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
      });
    }

    // ✅ Ensure user is still allowing connections
    if (!toUser.allowToConnect) {
      return new Response(
        JSON.stringify({ error: 'You are not accepting requests currently' }),
        { status: 403 }
      );
    }

    // ✅ Check if request exists
    if (!toUser.pendingRequests.includes(fromUserId)) {
      return new Response(
        JSON.stringify({ error: 'No such pending request' }),
        { status: 400 }
      );
    }

    // ✅ Remove from pendingRequests
    toUser.pendingRequests = toUser.pendingRequests.filter(
      (id) => id.toString() !== fromUserId
    );

    // ✅ Add each other as connected users
    if (!toUser.connectedUsers.includes(fromUserId)) {
      toUser.connectedUsers.push(fromUserId);
    }
    if (!fromUser.connectedUsers.includes(toUserId)) {
      fromUser.connectedUsers.push(toUserId);
    }

    // ✅ Remove "followingUsers" entry from the sender
    fromUser.followingUsers = fromUser.followingUsers.filter(
      (id) => id.toString() !== toUserId
    );

    await toUser.save();
    await fromUser.save();

    return new Response(
      JSON.stringify({ success: true, message: 'Request accepted' }),
      { status: 200 }
    );
  } catch (err) {
    console.error('Error accepting request:', err);
    return new Response(JSON.stringify({ error: 'Failed to accept request' }), {
      status: 500,
    });
  }
});
