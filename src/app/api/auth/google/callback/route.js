// /app/api/auth/google/callback/route.js
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import User from '@/models/User';
import { connectToDatabase } from '@/lib/db';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code) {
    return NextResponse.json({ message: 'Authorization code missing' }, { status: 400 });
  }

  // Retrieve phone and referredBy from state (sent back by Google)
  let phone, referredBy;
  try {
    const parsedState = JSON.parse(state || '{}');
    phone = parsedState.phone;
    referredBy = parsedState.referredBy;
  } catch (error) {
    console.error('Error parsing state:', error);
    phone = null;
    referredBy = null;
  }

  // if (!phone) {
  //   return NextResponse.json({ message: 'Phone number missing from state' }, { status: 400 });
  // }

  try {
    // Step 1: Exchange code for access token
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: process.env.GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      console.error('Token exchange failed:', tokenData);
      return NextResponse.json({ message: 'Failed to get access token' }, { status: 400 });
    }

    // Step 2: Fetch user profile
    const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const profile = await userInfoRes.json();

    if (!profile?.email) {
      console.error('Profile fetch failed:', profile);
      return NextResponse.json({ message: 'Failed to fetch user profile' }, { status: 400 });
    }

    await connectToDatabase();

    // Step 3: Find or create user
    let user = await User.findOne({
      $or: [{ email: profile.email }, { googleId: profile.id }],
    });

   if (!user) {
    if (phone) {

      // ✅ Normal signup with phone (already in your code)
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

      const newReferralCode = phone;

      user = await User.create({
        username: profile.name,
        email: profile.email,
        profileImage: profile.picture,
        googleId: profile.id,
        phone,
        isPhoneVerified: true,
        contributionPoints: 2,
        referredBy: referredByUserId,
        referralCode: newReferralCode,
        password: '',
      });

          // Step 4: Generate JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email, username: user.username, phone: user.phone },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Step 5: Create response + set cookie and redirect to frontend
    const redirectUrl = `${process.env.FRONTEND_URL}/`;
    const res =  NextResponse.redirect(redirectUrl);
    res.cookies.set({
      name: 'token',
      value: token,
      httpOnly: true,
    secure: process.env.NODE_ENV === "production", // only secure in prod
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return res;
    }
     else {
      // 🚨 Case: user doesn’t exist AND no phone provided
      const redirectUrl = `${process.env.FRONTEND_URL}/signup`;
      return NextResponse.redirect(redirectUrl);
    }
  }

    // Step 4: Generate JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email, username: user.username, phone: user.phone },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Step 5: Create response + set cookie and redirect to frontend
    const redirectUrl = `${process.env.FRONTEND_URL}/`;
    const res =  NextResponse.redirect(redirectUrl);
    res.cookies.set({
      name: 'token',
      value: token,
      httpOnly: true,
  secure: process.env.NODE_ENV === "production", // only secure in prod
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return res;

  } catch (error) {
    console.error('Google OAuth callback error:', error);
    return NextResponse.json(
      { message: 'Internal server error during Google authentication' },
      { status: 500 }
    );
  }
}
