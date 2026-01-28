import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import Festival from "@/models/Festivals";
import slugify from "slugify";

export async function POST(req) {
  try {
    await connectToDatabase();

    const data = await req.json();

    if (!data || !Array.isArray(data.festivals) || data.festivals.length === 0) {
      return NextResponse.json(
        { success: false, message: "No festival data provided" },
        { status: 400 }
      );
    }

    const festivalData = data.festivals[0];
    const locations = data.locations || [];
    const budgetEstimate = data.budget_estimate?.[0] || {};
    const media = data.media?.[0] || {};

    // Prepare images array
    const images = Object.values(media)
      .filter((val, i) => val && i.toString().includes("image_")); // filter only image_* keys

    // Generate slug (for unique stable URLs)
    const slug = slugify(festivalData.name, { lower: true, strict: true });

    // Build festival object as per schema
    const festivalDoc = {
      name: festivalData.name,
      city: festivalData.city,
      state: festivalData.state,
      country: festivalData.country || "India",
      date: new Date(festivalData.date),
      duration_days: festivalData.duration_days,
      category: festivalData.category || "Cultural",
      about: festivalData.about,
      importance: festivalData.importance,
      travel_tips: festivalData.travel_tips,
      best_experience_time: festivalData.best_experience_time,
      locations,
      budget_estimate: budgetEstimate,
      media: {
        images: [
          media.image_0,
          media.image_1,
          media.image_2,
          media.image_3,
          media.image_4,
        ].filter(Boolean),
        videos: {
          full_video: media.full_video || "",
          short_video: media.short_video || "",
          drone_clip: media.drone_clip || "",
        },
      },
      slug,
      updatedAt: new Date(),
    };

    // Create or update the festival
    const savedFestival = await Festival.findOneAndUpdate(
      { slug },
      { $set: festivalDoc },
      { upsert: true, new: true }
    );

    return NextResponse.json({
      success: true,
      message: "Festival data saved successfully",
      data: savedFestival,
    });
  } catch (err) {
    console.error("Error saving festival:", err);
    return NextResponse.json(
      { success: false, message: "Upload failed", error: err.message },
      { status: 500 }
    );
  }
}
