import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import { extendUserPremium } from "@/lib/extendPremium";

// Add cookie util from Next.js
import { cookies } from 'next/headers';

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch (err) {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  const { username, email, password, phone, referredBy, profileImage } = body;

  if (!username || !email || !password || !phone) {
    return NextResponse.json(
      { message: 'All fields are required (including phone)' },
      { status: 400 }
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

    let referredByUserId = null;
    if (referredBy) {
      const refUser = await User.findOne({ referralCode: referredBy });
      if (refUser) {
        referredByUserId = refUser._id;
        refUser.referralCount += 1;
        refUser.contributionPoints += 5;
        await refUser.save();
        try {
          await extendUserPremium(refUser._id);
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
      referredBy: referredByUserId,
      profileImage,
      isPremium: 'FREE',
      contributionPoints: 2, // ✅ initialize with 0
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
  secure: process.env.NODE_ENV === "production", // only secure in prod
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      sameSite: 'none',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
    
  } catch (err) {
    console.error('Signup error:', err);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
