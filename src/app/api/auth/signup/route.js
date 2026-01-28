import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import OTPVerification from '@/models/OTPVerification';
import { extendUserPremium } from "@/lib/extendPremium";

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch (error) {
    console.error('Invalid signup payload', error);
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  const { username, email, password, emailOTP, referredBy, profileImage } = body;

  // Basic validation
  if (!username || !email || !password || !emailOTP) {
    return NextResponse.json(
      { message: 'Username, email, password, and OTP are required' },
      { status: 400 }
    );
  }

  await connectToDatabase();

  try {
    // Check if email is already registered and verified
    const verifiedUser = await User.findOne({ email, isEmailVerified: true });
    
    if (verifiedUser) {
      return NextResponse.json(
        { message: 'Email already registered' },
        { status: 409 }
      );
    }

    // Check if username is already taken
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return NextResponse.json(
        { message: 'Username already taken' },
        { status: 409 }
      );
    }

    // Find the temporary OTP record (stored separately, not as a user)
    const OTPRecord = await OTPVerification.findOne({ 
      email, 
      otp: emailOTP,
      expiresAt: { $gt: new Date() } // Not expired
    });

    if (!OTPRecord) {
      return NextResponse.json(
        { message: 'Invalid or expired OTP' },
        { status: 401 }
      );
    }

    // OTP is valid, handle referral logic
    if (referredBy) {
      const refUser = await User.findOne({ referralCode: referredBy });
      if (refUser) {
        refUser.referralCount += 1;

        // Apply monthly contribution points cap (90)
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const storedMonth = refUser.pointsMonth?.getMonth();
        const storedYear = refUser.pointsMonth?.getFullYear();

        // Reset if new month
        if (storedMonth !== currentMonth || storedYear !== currentYear) {
          refUser.monthlyPoints = 0;
          refUser.pointsMonth = now;
        }

        // Add points with cap
        if (refUser.monthlyPoints < 90) {
          const available = 90 - refUser.monthlyPoints;
          const addedPoints = Math.min(5, available);

          refUser.monthlyPoints += addedPoints;
          refUser.contributionPoints += addedPoints;
        }

        await refUser.save();

        try {
          await extendUserPremium(referredBy);
        } catch (err) {
          console.error("Failed to extend referrer premium:", err);
        }
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate unique referral code
    const referralCode = email.split('@')[0] + Math.random().toString(36).substring(2, 8);

    // NOW create the verified user (ONLY after OTP verification)
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      referralCode,
      isEmailVerified: true, // Already verified via OTP
      referredBy: referredBy || undefined,
      profileImage: profileImage || undefined,
      isPremium: 'FREE',
      contributionPoints: 2,
      monthlyPoints: 2,
    });

    // Delete the OTP record after successful verification
    await OTPVerification.deleteOne({ _id: OTPRecord._id });

    // Sign JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Return response
    const response = NextResponse.json(
      {
        success: true,
        message: 'User registered and logged in successfully',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          referralCode: user.referralCode,
          referredBy: user.referredBy,
          isPremium: user.isPremium,
        },
      },
      { status: 201 }
    );

    // Set cookie
    response.cookies.set({
      name: 'token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
    
  } catch (err) {
    console.error('Signup error:', err);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}