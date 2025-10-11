import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import { extendUserPremium } from "@/lib/extendPremium";
import { firebaseAdmin } from '@/lib/firebaseAdmin';

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch (error) {
    console.error('Invalid signup payload', error);
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  const { username, email, password, phone, referredBy, profileImage, firebaseIdToken } = body;

  if (!username || !email || !password || !phone) {
    return NextResponse.json(
      { message: 'All fields are required (including phone)' },
      { status: 400 }
    );
  }


    if (!firebaseIdToken) {
    return NextResponse.json(
      { message: 'Missing phone verification token' },
      { status: 401 }
    );
  }
  
  let decoded;
  try {
    decoded = await firebaseAdmin.auth().verifyIdToken(firebaseIdToken, true);
  } catch (err) {
    console.error('Firebase token verification failed', err);
    return NextResponse.json(
      { message: 'Invalid or expired phone verification token' },
      { status: 401 }
    );
  }
  
  const firebasePhone = decoded.phone_number?.replace(/^\+91/, ''); // adjust formatting
  if (!firebasePhone || firebasePhone !== phone) {
    return NextResponse.json(
      { message: 'Phone number mismatch; please verify again.' },
      { status: 403 }
    );
  }

  await connectToDatabase();

  try {
    // Check duplicates
    if (await User.findOne({ email })) {
      return NextResponse.json({ message: 'Email already in use' }, { status: 409 });
    }
    if (await User.findOne({ phone })) {
      return NextResponse.json({ message: 'Phone number already in use' }, { status: 409 });
    }


  if (referredBy) {
    const refUser = await User.findOne({ referralCode: referredBy });
    if (refUser) {
      refUser.referralCount += 1;

      // --- Apply monthly contribution points cap (90) ---
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
      // --- end cap logic ---

      await refUser.save();
      console.log(referredBy);

      try {
        await extendUserPremium(referredBy); // ✅ still send referralCode directly
      } catch (err) {
        console.error("Failed to extend referrer premium:", err);
      }
    }
  }


    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      phone,
      referralCode: phone,
      isPhoneVerified: true,
      referredBy: referredBy,
      profileImage,
      isPremium: 'FREE',
      contributionPoints: 2, // ✅ initialize with 0
      monthlyPoints: 2, // initialize monthly points
    });


    // Sign JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email, phone: user.phone },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return response (without token in body)
    const response =  NextResponse.json(
      {
  success: true,
        message: 'User registered and logged in successfully',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          phone: user.phone,
          referralCode: user.referralCode,
          referredBy: user.referredBy,
          isPremium: user.isPremium,
        },
      },
      { status: 201 }
    );
        // ✅ set cookie on the response
    response.cookies.set({
      name: 'token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
    
  } catch (err) {
    console.error('Signup error:', err);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
