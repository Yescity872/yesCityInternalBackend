// app/api/profile/route.js

import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import { withAuth } from '@/middleware/auth';

export const GET = withAuth(async (req) => {
  try {
    const userId = req.user.userId; // from withAuth

    await connectToDatabase();

    // Fetch user (referredBy here is phone string)
    const user = await User.findById(userId).select(
      '_id email username phone profileImage isPremium premiumStartDate premiumExpiryDate referralCode referredBy contributionPoints referralCount connectedUsers pendingRequests followingUsers allowToConnect acceptConnectTandC'
    );

    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }


    let referrerInfo = null;

    if (user.referredBy) {
      // Look up user who owns that phone
      const referrer = await User.findOne({ referralCode: user.referredBy }).select('username');
      if (referrer) {
        referrerInfo = referrer.username ;
      }
    }

    const responseUser = {
      ...user.toObject(),
      referredBy: referrerInfo, // { username } or null
    };

    return new Response(JSON.stringify({ user: responseUser }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch user' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
