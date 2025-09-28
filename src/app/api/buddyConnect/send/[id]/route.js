// app/api/buddyConnect/send/[id]/route.js
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import { withAuth } from '@/middleware/auth';

export const POST = withAuth(async (req, { params }) => {
  try {
    const fromUserId = req.user.userId;
    const toUserId = params.id;

    await connectToDatabase();

    if (fromUserId === toUserId) {
      return new Response(
        JSON.stringify({ error: "Can't send request to yourself" }),
        { status: 400 }
      );
    }

    const toUser = await User.findById(toUserId);
    if (!toUser)
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
      });

    // ✅ Check if that user has allowed connections
    if (!toUser.allowToConnect) {
      return new Response(
        JSON.stringify({ error: 'This user is not accepting requests' }),
        { status: 403 }
      );
    }

    // Check if already connected
    if (toUser.connectedUsers.includes(fromUserId)) {
      return new Response(
        JSON.stringify({ error: 'Already friends' }),
        { status: 400 }
      );
    }

    // Add to pendingRequests if not already
    if (!toUser.pendingRequests.includes(fromUserId)) {
      toUser.pendingRequests.push(fromUserId);
      await toUser.save();
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Request sent' }),
      { status: 200 }
    );
  } catch (err) {
    console.error('Error sending request:', err);
    return new Response(
      JSON.stringify({ error: 'Failed to send request' }),
      { status: 500 }
    );
  }
});
