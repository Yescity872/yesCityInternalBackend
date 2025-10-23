// /app/api/auth/google/route.js
import { NextResponse } from 'next/server';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const state = searchParams.get('state');

  // if (!state) {
  //   return NextResponse.json({ message: 'State parameter is required' }, { status: 400 });
  // }

  let phone, referredBy, isLogin, firebaseIdToken;
  try {
    const parsedState = JSON.parse(state);
    phone = parsedState.phone;
    referredBy = parsedState.referredBy;
    isLogin = parsedState.isLogin; // Preserve login flag
    firebaseIdToken = parsedState.firebaseIdToken; // Preserve firebase token
  } catch (error) {
    console.error('Error parsing state:', error);
    return NextResponse.json({ message: 'Invalid state parameter' }, { status: 400 });
  }

  // if (!phone) {
  //   return NextResponse.json({ message: 'Phone number is required' }, { status: 400 });
  // }

  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI; // must match Google Console

  const oauthURL = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  oauthURL.searchParams.set('client_id', GOOGLE_CLIENT_ID);
  oauthURL.searchParams.set('redirect_uri', REDIRECT_URI);
  oauthURL.searchParams.set('response_type', 'code');
  oauthURL.searchParams.set('scope', 'openid email profile');
  oauthURL.searchParams.set('access_type', 'offline');
  oauthURL.searchParams.set('prompt', 'consent');
  oauthURL.searchParams.set('state', JSON.stringify({ 
    phone, 
    referredBy: referredBy || null,
    isLogin: isLogin || false,
    firebaseIdToken: firebaseIdToken || null
  }));

  // ✅ Debugging logs
  console.log("🔍 redirect_uri being sent:", REDIRECT_URI);
  console.log("🔍 Full Google OAuth URL:", oauthURL.toString());
  console.log("#########",referredBy);

  return NextResponse.redirect(oauthURL.toString());
}
