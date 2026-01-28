import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import ForgotPasswordOTP from '@/models/ForgotPasswordOTP';
import { sendOTPEmail } from '@/lib/forgotPasswordEmail.js';

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch (error) {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  const { email } = body;

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
    // Check if user exists with this email and is verified
    const existingUser = await User.findOne({ email: email.toLowerCase(), isEmailVerified: true });
    
    if (!existingUser) {
      return NextResponse.json(
        { message: 'No account found with this email address' },
        { status: 404 }
      );
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Delete any existing OTP for this email (for forgot password)
    await ForgotPasswordOTP.deleteMany({ email: email.toLowerCase() });

    // Store OTP in ForgotPasswordOTP collection
    await ForgotPasswordOTP.create({
      email: email.toLowerCase(),
      otp,
      expiresAt,
      isVerified: false,
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
      { message: 'Failed to send OTP. Please try again.' },
      { status: 500 }
    );
  }
}