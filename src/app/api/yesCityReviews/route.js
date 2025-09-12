import { connectToDatabase } from '@/lib/db';
import User from '@/models/User';
import YesCityReview from '@/models/YesCityReview';
import mongoose from 'mongoose';

import { withAuth } from '@/middleware/auth'; // ✅ Import middleware


async function handler(req) {
  try {
    await connectToDatabase();

    const body = await req.json();
    const { rating, content } = body; // ❌ removed createdBy from body
    const date = new Date().toISOString().split('T')[0];

    const userId = req.user.userId; // ✅ from withAuth

    if (!rating || !content) {
      return new Response(
        JSON.stringify({ message: 'Rating and content are required.', success: false }),
        { status: 400 }
      );
    }

    const newReview = await YesCityReview.create({
      rating,
      content,
      createdBy: userId, // ✅ taken from auth middleware
      date,
    });

    return new Response(
      JSON.stringify({
        message: 'Review added successfully!',
        success: true,
        review: newReview,
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error('Error saving review:', error);
    return new Response(
      JSON.stringify({ message: 'Internal Server Error', success: false }),
      { status: 500 }
    );
  }
}
export const POST = withAuth(handler);


// GET route
export async function GET() {
  try {
    await connectToDatabase();

    const reviews = await YesCityReview.find().populate({
      path: 'createdBy',
      model: 'User',
      select: 'username email profileImage',
    });

    return new Response(
      JSON.stringify({
        message: 'Reviews fetched successfully!',
        success: true,
        reviews,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return new Response(JSON.stringify({ message: 'Internal Server Error', success: false }), {
      status: 500,
    });
  }
}
