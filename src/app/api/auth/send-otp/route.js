import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import OTPVerification from '@/models/OTPVerification';
import { sendOTPEmail } from '@/lib/sendOTPEmail';

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch (error) {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  const { email, type } = body;

  if (!email) {
    return NextResponse.json(
      { message: 'Email is required' },
      { status: 400 }
    );
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return NextResponse.json(
      { message: 'Invalid email format' },
      { status: 400 }
    );
  }

  await connectToDatabase();

  try {
    // Check if email already exists and is verified
    const existingUser = await User.findOne({ email, isEmailVerified: true });
    
    if (type === 'signup') {
      if (existingUser) {
        return NextResponse.json(
          { message: 'Email is already registered. Please sign in.' },
          { status: 409 }
        );
      }
    } else {
      if (!existingUser) {
        return NextResponse.json(
          { message: 'Incorrect email or Email not registered' },
          { status: 409 }
        );
      }
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing OTP for this email
    await OTPVerification.deleteMany({ email });

    // Store OTP in separate collection
    await OTPVerification.create({
      email,
      otp,
      expiresAt,
    });

    // Send OTP email
    await sendOTPEmail(email, otp);

    return NextResponse.json(
      {
        success: true,
        message: 'OTP sent successfully to your email',
      },
      { status: 200 }
    );
    
  } catch (err) {
    console.error('Send OTP error:', err);
    return NextResponse.json(
      { message: 'Failed to send OTP' },
      { status: 500 }
    );
  }
}