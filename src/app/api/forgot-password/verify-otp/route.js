import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import ForgotPasswordOTP from '@/models/ForgotPasswordOTP';

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch (error) {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  const { email, otp } = body;

  if (!email || !otp) {
    return NextResponse.json(
      { message: 'Email and OTP are required' },
      { status: 400 }
    );
  }

  // Validate OTP format (6 digits)
  if (!/^\d{6}$/.test(otp)) {
    return NextResponse.json(
      { message: 'Invalid OTP format' },
      { status: 400 }
    );
  }

  await connectToDatabase();

  try {
    // Find OTP record
    const otpRecord = await ForgotPasswordOTP.findOne({
      email: email.toLowerCase(),
      otp,
    });

    if (!otpRecord) {
      return NextResponse.json(
        { message: 'Invalid OTP' },
        { status: 400 }
      );
    }

    // Check if OTP has expired
    if (new Date() > otpRecord.expiresAt) {
      await ForgotPasswordOTP.deleteOne({ _id: otpRecord._id });
      return NextResponse.json(
        { message: 'OTP has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Check if already verified
    if (otpRecord.isVerified) {
      return NextResponse.json(
        { message: 'OTP already used. Please request a new one.' },
        { status: 400 }
      );
    }

    // Mark OTP as verified (but don't delete yet - needed for password reset)
    otpRecord.isVerified = true;
    await otpRecord.save();

    return NextResponse.json(
      {
        success: true,
        message: 'OTP verified successfully. You can now reset your password.',
      },
      { status: 200 }
    );
    
  } catch (err) {
    console.error('Verify OTP error:', err);
    return NextResponse.json(
      { message: 'Failed to verify OTP. Please try again.' },
      { status: 500 }
    );
  }
}