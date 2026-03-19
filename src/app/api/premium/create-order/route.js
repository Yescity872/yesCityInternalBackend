import { NextResponse } from 'next/server';
import Razorpay from 'razorpay';
import { withAuth } from '@/middleware/auth';
import { connectToDatabase } from '@/lib/db';

// Premium pricing constants
const PREMIUM_PRICING = {
  A: 499,   // Gold - 3 Months - ₹499
  B: 999    // Diamond - 6 Months - ₹999
};

function generateReceipt(userId, premiumType) {
    // Shorten userId if it's too long, use last 6 characters
    const shortUserId = userId.toString().slice(-6);
    const timestamp = Date.now().toString().slice(-8); // Last 8 digits of timestamp
    const receipt = `pm_${shortUserId}_${premiumType}_${timestamp}`;
    
    // Ensure it doesn't exceed 40 characters
    return receipt.length > 40 ? receipt.substring(0, 40) : receipt;
  }

async function handler(req) {
  await connectToDatabase();

  try {
    const userId = req.user.userId;
    console.log(req.body)

    if (!userId) {
      return NextResponse.json({
        success: false,
        message: 'Unauthorized'
      }, { status: 401 });
    }

    const { premiumType, currency = 'INR' } = await req.json();

    // Validate premium type
    if (!premiumType || !['A', 'B'].includes(premiumType)) {
      return NextResponse.json({
        success: false,
        message: 'Invalid premium type. Use "A" or "B"'
      }, { status: 400 });
    }

    // Calculate price based on premium type
    const price = PREMIUM_PRICING[premiumType];
    const amount = price * 100; // Convert to paise
    const receipt = generateReceipt(userId, premiumType);
    
    // Initialize Razorpay
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });

    // Create Razorpay order
    const options = {
      amount: amount,
      currency: currency,
      receipt: receipt,
      notes: {
        userId: userId,
        premiumType: premiumType,
        price: price,
        timestamp:new Date().toISOString()
      }
    };

    console.log('Creating Razorpay order with receipt:', receipt);

    const order = await razorpay.orders.create(options);

    // Return order details
    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: process.env.RAZORPAY_KEY_ID,
    });

  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to create order',
      error: error.message
    }, { status: 500 });
  }
}

export const POST = withAuth(handler);
