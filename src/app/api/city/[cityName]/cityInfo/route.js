import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import CityInfo from "@/models/CityRoutes/CityInfo";
import { withAuth, getUserFromCookies } from "@/middleware/auth";

// ✅ Premium access helper
function getAccessiblePremiums(userPremium) {
  if (userPremium === "B") return ["FREE", "A", "B"];
  if (userPremium === "A") return ["FREE", "A"];
  return ["FREE"];
}

// ✅ Core handler — now also handles engagement like Accommodation route
async function coreHandler(req, context, user = null) {
  try {
    await connectToDatabase();

    const userPremium = user?.isPremium || "FREE";
    const { cityName } = await context.params;
    const formattedCityName = decodeURIComponent(cityName).toLowerCase();

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = 5;
    const skip = (page - 1) * limit;

    // ✅ Query the city infos
    const cityInfos = await CityInfo.find({
      cityName: { $regex: new RegExp(`^${formattedCityName}$`, "i") },
    })
      .select("_id cityName stateOrUT alternateNames coverImage premium engagement")
      .skip(skip)
      .limit(limit);

    if (!cityInfos.length) {
      return NextResponse.json({ error: "No city info found" }, { status: 404 });
    }

    // ✅ Total count
    const total = await CityInfo.countDocuments({
      cityName: { $regex: new RegExp(`^${formattedCityName}$`, "i") },
    });

    // ✅ Engagement logic (only if user logged in)
    if (user && page === 1) {
      for (const cityInfo of cityInfos) {
        if (!cityInfo.engagement) {
          cityInfo.engagement = { views: 0, viewedBy: [] };
        }

        cityInfo.engagement.views += 1;

        const viewedEntry = cityInfo.engagement.viewedBy.find(
          (v) => v.userId.toString() === user._id.toString()
        );

        if (viewedEntry) {
          viewedEntry.timestamps.push(new Date());
        } else {
          cityInfo.engagement.viewedBy.push({
            userId: user._id,
            timestamps: [new Date()],
          });
        }

        await cityInfo.save();
      }
    }

    return NextResponse.json({
      data: cityInfos,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching city info:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ✅ Public (page 1) + Auth (page > 1)
export async function GET(req, context) {
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1", 10);

  if (page === 1) {
    const user = await getUserFromCookies();
    return coreHandler(req, context, user);
  }

  return withAuth(async (reqWithAuth, contextWithAuth) => {
    return coreHandler(reqWithAuth, contextWithAuth, reqWithAuth.user);
  })(req, context);
}
