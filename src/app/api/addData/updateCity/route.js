import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/db";
import City from "@/models/City";

export async function PATCH() {
  try {
    await connectToDatabase();

    const result = await City.updateMany(
      { onSite: { $exists: false } },
      { $set: { onSite: true } },
      { strict: false } // this line allows adding undeclared fields
    );

    return NextResponse.json(
      {
        message: "onSite: true added to cities",
        modifiedCount: result.modifiedCount,
        matchedCount: result.matchedCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating cities:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
