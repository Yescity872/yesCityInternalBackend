"/api/reviews"
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';
import Review from '@/models/Review';

import Accommodation from '@/models/CityRoutes/Accommodation';
import Activity from '@/models/CityRoutes/Activity';
import CityInfo from '@/models/CityRoutes/CityInfo';
import Connectivity from '@/models/CityRoutes/Connectivity';
import Food from '@/models/CityRoutes/Food';
import HiddenGem from '@/models/CityRoutes/HiddenGem';
import Itinerary from '@/models/CityRoutes/Itinerary';
import Misc from '@/models/CityRoutes/Misc';
import NearbySpot from '@/models/CityRoutes/NearbySpot';
import Place from '@/models/CityRoutes/Place';
import Shop from '@/models/CityRoutes/Shop';
import Transport from '@/models/CityRoutes/Transport';

import { withAuth } from '@/middleware/auth';

const MODELS = {
  Accommodation,
  Activity,
  CityInfo,
  Connectivity,
  Food,
  HiddenGem,
  Itinerary,
  Misc,
  NearbySpot,
  Place,
  Shop,
  Transport,
};

async function handler(req) {
  try {
    await connectToDatabase();

    const body = await req.json();
    const { rating, content, cityName, onModel, parentRef } = body;
    const date = new Date();

    // ✅ user comes from withAuth middleware
    const userId = req.user?.userId;
    if (!rating || !content || !userId || !cityName || !onModel || !parentRef) {
      return new Response(
        JSON.stringify({ message: "All fields are required.", success: false }),
        { status: 400 }
      );
    }

    // ✅ Ensure model exists
    const Model = MODELS[onModel];
    if (!Model) {
      return new Response(
        JSON.stringify({ message: "Invalid model type.", success: false }),
        { status: 400 }
      );
    }

    // ✅ Validate parentRef
    let parentObjectId;
    try {
      parentObjectId = new mongoose.Types.ObjectId(parentRef);
    } catch {
      return new Response(
        JSON.stringify({ message: "Invalid parentRef ID.", success: false }),
        { status: 400 }
      );
    }

    // ✅ Create review with userId
    const newReview = await Review.create({
      rating,
      content,
      createdBy: userId,
      date,
      cityName: decodeURIComponent(cityName),
      parentRef: parentObjectId,
      onModel,
    });

    // ✅ Populate createdBy so frontend gets username/email immediately
    const populatedReview = await newReview.populate("createdBy", "username email");

    // ✅ Attach review to parent document
    const updatedDoc = await Model.findByIdAndUpdate(
      parentObjectId,
      { $push: { reviews: newReview._id } },
      { new: true }
    );

    if (!updatedDoc) {
      return new Response(
        JSON.stringify({ message: "Parent document not found.", success: false }),
        { status: 404 }
      );
    }

    return new Response(
      JSON.stringify({
        message: "Review added successfully!",
        success: true,
        review: populatedReview,   // <-- send populated version
      }),
      { status: 201 }
    );
  } catch (error) {
    console.error("Error saving review:", error);
    return new Response(
      JSON.stringify({ message: "Internal Server Error", success: false }),
      { status: 500 }
    );
  }
}

export const POST = withAuth(handler);
