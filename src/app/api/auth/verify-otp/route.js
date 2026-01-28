import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import OTPVerification from '@/models/OTPVerification';

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

  await connectToDatabase();

  try {
    // Find the OTP record
    const otpRecord = await OTPVerification.findOne({
      email,
      otp,
      expiresAt: { $gt: new Date() } // Not expired
    });

    if (!otpRecord) {
      return NextResponse.json(
        { message: 'Invalid or expired OTP' },
        { status: 401 }
      );
    }

    // OTP is valid - don't delete it yet (will be deleted during signup)
    return NextResponse.json(
      {
        success: true,
        message: 'OTP verified successfully',
      },
      { status: 200 }
    );
    
  } catch (err) {
    console.error('Verify OTP error:', err);
    return NextResponse.json(
      { message: 'Failed to verify OTP' },
      { status: 500 }
    );
  }
}