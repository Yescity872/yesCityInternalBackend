import { connectToDatabase } from '@/lib/db.js';
import User from '@/models/User.js';
import { withAuth } from '@/middleware/auth.js';
import { NextResponse } from 'next/server';

// ==========================
// POST route to check if item is wishlisted
// ==========================
export const POST = withAuth(async (req) => {
  await connectToDatabase();

  const { onModel, parentRef, cityName } = await req.json();
  const userId = req.user.userId;

  if (!onModel || !parentRef || !cityName) {
    return NextResponse.json(
      { message: 'onModel, parentRef and cityName are required' },
      { status: 400 }
    );
  }

  const user = await User.findById(userId);

  const exists = user.wishlist.some(
    (item) =>
      item.onModel === onModel &&
      item.parentRef.toString() === parentRef &&
      item.cityName === cityName
  );

  return NextResponse.json({ exists });
});
