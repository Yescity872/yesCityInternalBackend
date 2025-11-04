import { NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import { getPremiumStatus } from '@/lib/premiumHelpers';

async function handler(req) {
  await connectToDatabase();

  try {
    const userId = req.user.userId;

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 });
    }

    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }

    const status = getPremiumStatus(user);

    return NextResponse.json({
      success: true,
      data: status
    });

  } catch (error) {
    console.error('Error fetching premium status:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch premium status',
      error: error.message
    }, { status: 500 });
  }
}

export const GET = withAuth(handler);

