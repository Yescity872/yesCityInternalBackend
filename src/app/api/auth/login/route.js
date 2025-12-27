// app/api/auth/login/route.js
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET;

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch (error) {
    console.error('Invalid login payload', error);
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  const { emailOrUsername, password } = body;

  if (!emailOrUsername || !password) {
    return NextResponse.json(
      { message: 'Email/Username and password are required' },
      { status: 400 }
    );
  }

  await connectToDatabase();

  try {
    // Find user by email or username
    const user = await User.findOne({
      $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
    });

    if (!user) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      return NextResponse.json(
        { 
          message: 'Email not verified. Please verify your email to login.',
          emailVerified: false 
        },
        { status: 403 }
      );
    }

    //  Check if user has a password (Google OAuth users might not have one)
    if (!user.password) {
      return NextResponse.json(
        { message: 'This account uses Google Sign-In. Please login with Google.' },
        { status: 401 }
      );
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Update last active timestamp
    user.lastActive = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        isPremium: user.isPremium,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Create response
    const response = NextResponse.json(
      {
        success: true,
        message: 'Login successful',
        token,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          isPremium: user.isPremium,
          profileImage: user.profileImage,
          referralCode: user.referralCode,
        },
      },
      { status: 200 }
    );

    // Set HTTP-only cookie
    response.cookies.set({
      name: 'token',
      value: token,
      httpOnly: true, // ✅ Added for security
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}