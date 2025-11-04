import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { withAuth } from '@/middleware/auth';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import Payment from '@/models/Payment';

// Premium duration constants
const PREMIUM_DURATION = {
  A: 3,     // 3 months
  B: 6      // 6 months
};

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

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      premiumType
    } = await req.json();

    // Validate input
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({
        success: false,
        message: 'Missing payment details'
      }, { status: 400 });
    }

    if (!premiumType || !['A', 'B'].includes(premiumType)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid premium type'
      }, { status: 400 });
    }

    // Verify signature
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generated_signature !== razorpay_signature) {
      return NextResponse.json({
        success: false,
        message: 'Invalid payment signature'
      }, { status: 400 });
    }

    // Check if user already exists
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json({
        success: false,
        message: 'User not found'
      }, { status: 404 });
    }

    // Check if payment already exists
    const existingPayment = await Payment.findOne({ paymentId: razorpay_payment_id });
    if (existingPayment) {
      return NextResponse.json({
        success: false,
        message: 'Payment already processed'
      }, { status: 400 });
    }

    // Calculate dates
    const premiumStartDate = new Date();
    const durationMonths = PREMIUM_DURATION[premiumType];
    const premiumExpiryDate = new Date(premiumStartDate);
    premiumExpiryDate.setMonth(premiumExpiryDate.getMonth() + durationMonths);

    // If user already has the same premium type and it hasn't expired, extend it
    if (user.isPremium === premiumType && user.premiumExpiryDate && user.premiumExpiryDate > new Date()) {
      // Extend from current expiry date
      premiumExpiryDate.setMonth(user.premiumExpiryDate.getMonth() + durationMonths);
    }

    // Update user premium status
    user.isPremium = premiumType;
    user.premiumStartDate = premiumStartDate;
    user.premiumExpiryDate = premiumExpiryDate;

    await user.save();

    // Calculate price for payment record
    const PREMIUM_PRICING = {
      A: 499,
      B: 999
    };

    // Save payment record
    await Payment.create({
      userId: userId,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      premiumType: premiumType,
      amount: PREMIUM_PRICING[premiumType],
      status: 'success',
      createdAt: new Date()
    });

    // Return success
    return NextResponse.json({
      success: true,
      message: 'Payment successful! Premium activated.',
      data: {
        premiumType: premiumType,
        premiumStartDate: premiumStartDate,
        premiumExpiryDate: premiumExpiryDate
      }
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json({
      success: false,
      message: 'Payment verification failed',
      error: error.message
    }, { status: 500 });
  }
}

export const POST = withAuth(handler);
