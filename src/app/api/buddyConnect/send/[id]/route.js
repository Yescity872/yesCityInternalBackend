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
    const fromUser = await User.findById(fromUserId);

    if (!toUser || !fromUser) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
      });
    }

    //  Check if sender has enabled connections
    if (!fromUser.allowToConnect) {
      return new Response(
        JSON.stringify({ error: 'You must allow connections to send requests' }),
        { status: 403 }
      );
    }

    //  Check if recipient accepts requests
    if (!toUser.allowToConnect) {
      return new Response(
        JSON.stringify({ error: 'This user is not accepting requests' }),
        { status: 403 }
      );
    }

    //  Check if already connected
    if (toUser.connectedUsers.includes(fromUserId)) {
      return new Response(
        JSON.stringify({ error: 'Already friends' }),
        { status: 400 }
      );
    }

    //  Add to "pendingRequests" of recipient
    if (!toUser.pendingRequests.includes(fromUserId)) {
      toUser.pendingRequests.push(fromUserId);
      await toUser.save();
    }

    //  Add to "followingUsers" of sender
    if (!fromUser.followingUsers.includes(toUserId)) {
      fromUser.followingUsers.push(toUserId);
      await fromUser.save();
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
