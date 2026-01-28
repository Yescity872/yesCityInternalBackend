// app/api/contribution/userContribution/[cityName]/route.js
import { connectToDatabase } from "@/lib/db";
import Contribution from "@/models/Contribution";
import { withAuth } from "@/middleware/auth";

export const GET = withAuth(async (req, context) => {
  try {
    const userId = req.user.userId; // from withAuth
    const { cityName } = context.params; // 👈 param from URL
    const url = new URL(req.url);

    const page = parseInt(url.searchParams.get("page") || "1");
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    console.log("GET userContribution by cityName:", {
      userId,
      cityName,
      page,
      limit,
      skip,
    });

    if (!cityName) {
      return new Response(
        JSON.stringify({ error: "cityName param is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    await connectToDatabase(); // ✅ ensure DB is connected

    // Fetch contributions of this user in a given city
    const contributions = await Contribution.find({
      userId,
      cityName: decodeURIComponent(cityName),
    })
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-reviews") // exclude reviews for performance
      .lean();

    const totalContributions = await Contribution.countDocuments({
      userId,
      cityName: decodeURIComponent(cityName),
    });

    const totalPages = Math.ceil(totalContributions / limit);

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
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fetching contributions:", error);
    return new Response(
      JSON.stringify({ error: "Internal Server Error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
