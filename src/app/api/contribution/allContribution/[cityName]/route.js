// app/api/allContribution/[cityName]/route.js
import { connectToDatabase } from "@/lib/db";
import Contribution from "@/models/Contribution";

export async function GET(req, context) {
  try {
    const { cityName } = context.params; 
    if (!cityName) {
      return new Response(
        JSON.stringify({ error: "City name is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    await connectToDatabase();

    // ✅ Parse query params
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "12", 10);
    const category = searchParams.get("category");
    const sortBy = searchParams.get("sortBy") || "newest";

    // ✅ Build filters (always approved only)
    const filters = { 
      cityName: decodeURIComponent(cityName),
      status: "approved",
    };
    if (category) filters.category = category;

    // ✅ Sorting
    let sort = {};
    if (sortBy === "newest") sort = { submittedAt: -1 };
    else if (sortBy === "oldest") sort = { submittedAt: 1 };
    else if (sortBy === "title") sort = { title: 1 };

    // ✅ Pagination with total count
    const totalContributions = await Contribution.countDocuments(filters);
    const totalPages = Math.ceil(totalContributions / limit);
    const skip = (page - 1) * limit;

    const contributions = await Contribution.find(filters)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();

    return new Response(
      JSON.stringify({
        contributions,
        pagination: {
          currentPage: page,
          totalPages,
          totalContributions,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
        cityName: decodeURIComponent(cityName),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fetching city contributions:", error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
