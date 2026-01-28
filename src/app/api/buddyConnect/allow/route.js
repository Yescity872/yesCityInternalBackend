// app/api/buddyConnect/allow/route.js
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import { withAuth } from '@/middleware/auth';

// 1. Allow or disallow connections
export const POST = withAuth(async (req) => {
  try {
    const userId = req.user.userId;
    const { allow } = await req.json();

    await connectToDatabase();

    const user = await User.findByIdAndUpdate(
      userId,
      { allowToConnect: allow },
      { new: true }
    );

    return new Response(JSON.stringify({ success: true, allowToConnect: user.allowToConnect }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error updating allowToConnect:', err);
    return new Response(JSON.stringify({ error: 'Failed to update' }), { status: 500 });
  }
});
