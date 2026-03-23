// /app/api/auth/google/callback/route.js
import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import User from '@/models/User';
import { connectToDatabase } from '@/lib/db';
import { extendUserPremium } from "@/lib/extendPremium";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  // Handle OAuth error (user cancelled)
  const error = searchParams.get('error');
  if (error) {
    console.error('Google OAuth Error:', error);
    const redirectUrl = `${process.env.FRONTEND_URL}/login?status=cancelled`;
    return NextResponse.redirect(redirectUrl);
  }
  
  if (!code) {
    return NextResponse.json({ message: 'Authorization code missing' }, { status: 400 });
  }

  // Retrieve referredBy and returnTo from state (sent back by Google)
  let referredBy;
  let returnTo;
  try {
    const parsedState = JSON.parse(state || '{}');
    referredBy = parsedState.referredBy;
    returnTo = parsedState.returnTo;
  } catch (error) {
    console.error('Error parsing state:', error);
    referredBy = null;
    returnTo = null;
  }

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

    // Step 2: Fetch user profile from Google
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
      //  NEW USER - Create account with Google OAuth
      console.log('Creating new user via Google OAuth');

      // Handle referral logic
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
          console.log('🎁 Referral code applied:', referredBy);

          try {
            await extendUserPremium(referredBy);
          } catch (err) {
            console.error("Failed to extend referrer premium:", err);
          }
        }
      }

      // Generate unique referral code from email
      const referralCode = profile.email.split('@')[0] + Math.random().toString(36).substring(2, 8);

      // Generate unique username if needed
      let username = profile.name.replace(/\s+/g, '_').toLowerCase();
      const existingUsername = await User.findOne({ username });
      if (existingUsername) {
        username = username + Math.random().toString(36).substring(2, 6);
      }

      // Create new user
      user = await User.create({
        username,
        email: profile.email,
        profileImage: profile.picture,
        googleId: profile.id,
        isEmailVerified: true, // ✅ Google emails are pre-verified
        contributionPoints: 2,
        monthlyPoints: 2,
        referredBy: referredBy || undefined,
        referralCode,
        isPremium: 'FREE',
      });

      console.log('New user created:', user.email);
    } else {
      //  EXISTING USER - Login
      console.log(' Existing user logging in:', user.email);

      // Update last active timestamp
      user.lastActive = new Date();
      await user.save();
    }

    // Step 4: Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id, 
        email: user.email, 
        username: user.username,
        isPremium: user.isPremium 
      },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Step 5: Redirect to frontend with token
    let baseRedirectUrl = process.env.FRONTEND_URL;
    if (returnTo) {
      try {
        const returnUrl = new URL(returnTo);
        // Redirect back to the originating UI's origin (e.g., localhost:3001) where sessionStorage lives
        baseRedirectUrl = returnUrl.origin;
      } catch (e) {
        console.error('Invalid returnTo URL', e);
      }
    }

    const redirectUrl = user.isNew 
      ? `${baseRedirectUrl}/?googleCheck=true&token=${token}`
      : `${baseRedirectUrl}/?token=${token}`;
    
    const res = NextResponse.redirect(redirectUrl);
    
    // Set HTTP-only cookie
    res.cookies.set({
      name: 'token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return res;

  } catch (error) {
    console.error('Google OAuth callback error:', error);
    const redirectUrl = `${process.env.FRONTEND_URL}/login?error=auth_failed`;
    return NextResponse.redirect(redirectUrl);
  }
}