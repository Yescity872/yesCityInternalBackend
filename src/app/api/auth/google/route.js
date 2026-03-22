// /app/api/auth/google/route.js
import { NextResponse } from 'next/server';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const state = searchParams.get('state');

  const redirect = searchParams.get('redirect'); // Captures return page URL
  let referredBy;
  
  // Parse state if provided (optional for Google OAuth)
  if (state) {
    try {
      const parsedState = JSON.parse(state);
      referredBy = parsedState.referredBy;
    } catch (error) {
      console.error('Error parsing state:', error);
      // Continue anyway - state is optional
    }
  }

  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI; // must match Google Console

  // Build Google OAuth URL
  const oauthURL = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  oauthURL.searchParams.set('client_id', GOOGLE_CLIENT_ID);
  oauthURL.searchParams.set('redirect_uri', REDIRECT_URI);
  oauthURL.searchParams.set('response_type', 'code');
  oauthURL.searchParams.set('scope', 'openid email profile');
  oauthURL.searchParams.set('access_type', 'offline');
  oauthURL.searchParams.set('prompt', 'consent');
  
  // Create our state object
  const statePayload = {
    referredBy: referredBy || null,
    redirect: redirect || '/'
  };

  // Always set state since we now want to track the redirect URL
  oauthURL.searchParams.set('state', JSON.stringify(statePayload));

  // Debugging logs
  console.log("🔍 redirect_uri being sent:", REDIRECT_URI);
  console.log("🔍 Full Google OAuth URL:", oauthURL.toString());
  if (referredBy) console.log("🎁 Referral code:", referredBy);
  if (redirect) console.log("🧭 Redirect Target:", redirect);

  return NextResponse.redirect(oauthURL.toString());
}