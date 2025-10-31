// /api/festivals/[id]/route.js
import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/db';
import Festival from '@/models/Festivals';
import mongoose from 'mongoose';

// GET - Fetch festival by ID
export async function GET(req, { params }) {
  try {
    await connectToDatabase();

    const { id } = params;

    // Validate MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid festival ID' },
        { status: 400 }
      );
    }

    const festival = await Festival.findById(id)
      .populate('reviews')
      .lean();

    if (!festival) {
      return NextResponse.json(
        { success: false, message: 'Festival not found' },
        { status: 404 }
      );
    }

    // Increment view count
    await Festival.findByIdAndUpdate(id, {
      $inc: { 'engagement.views': 1 },
    });

    return NextResponse.json({
      success: true,
      data: festival,
    });
  } catch (error) {
    console.error('Error fetching festival by ID:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch festival', error: error.message },
      { status: 500 }
    );
  }
}

// PUT - Update festival by ID
export async function PUT(req, { params }) {
  try {
    await connectToDatabase();

    const { id } = params;
    const body = await req.json();

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid festival ID' },
        { status: 400 }
      );
    }

    // Process media images if provided
    if (body.media) {
      const images = [];
      for (let i = 0; i <= 10; i++) {
        const imageKey = `image_${i}`;
        if (body.media[imageKey]) {
          images.push(body.media[imageKey]);
        }
      }
      if (images.length > 0) {
        body.media.images = images;
      }
    }

    const festival = await Festival.findByIdAndUpdate(
      id,
      { ...body, updatedAt: new Date() },
      { new: true, runValidators: true }
    );

    if (!festival) {
      return NextResponse.json(
        { success: false, message: 'Festival not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Festival updated successfully',
      data: festival,
    });
  } catch (error) {
    console.error('Error updating festival:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update festival', error: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete festival by ID
export async function DELETE(req, { params }) {
  try {
    await connectToDatabase();

    const { id } = params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, message: 'Invalid festival ID' },
        { status: 400 }
      );
    }

    const festival = await Festival.findByIdAndDelete(id);

    if (!festival) {
      return NextResponse.json(
        { success: false, message: 'Festival not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Festival deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting festival:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete festival', error: error.message },
      { status: 500 }
    );
  }
}
