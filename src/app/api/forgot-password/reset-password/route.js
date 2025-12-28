import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import ForgotPasswordOTP from '@/models/ForgotPasswordOTP';
import bcrypt from 'bcryptjs';

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch (error) {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  const { email, otp, newPassword } = body;

  if (!email || !otp || !newPassword) {
    return NextResponse.json(
      { message: 'Email, OTP, and new password are required' },
      { status: 400 }
    );
  }

  // Validate password strength
  if (newPassword.length < 8) {
    return NextResponse.json(
      { message: 'Password must be at least 8 characters long' },
      { status: 400 }
    );
  }

  await connectToDatabase();

  try {
    // Verify OTP is valid and verified
    const otpRecord = await ForgotPasswordOTP.findOne({
      email: email.toLowerCase(),
      otp,
      isVerified: true,
    });

    if (!otpRecord) {
      return NextResponse.json(
        { message: 'Invalid or unverified OTP. Please verify OTP first.' },
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

    // Find user
    const user = await User.findOne({ email: email.toLowerCase(), isEmailVerified: true });
    
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update user password
    user.password = hashedPassword;
    await user.save();

    // Delete the used OTP record
    await ForgotPasswordOTP.deleteOne({ _id: otpRecord._id });

    return NextResponse.json(
      {
        success: true,
        message: 'Password reset successfully. You can now login with your new password.',
      },
      { status: 200 }
    );
    
  } catch (err) {
    console.error('Reset password error:', err);
    return NextResponse.json(
      { message: 'Failed to reset password. Please try again.' },
      { status: 500 }
    );
  }
}