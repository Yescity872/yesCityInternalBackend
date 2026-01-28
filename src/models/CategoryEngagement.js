import mongoose from "mongoose";

const categoryEngagementSchema = new mongoose.Schema({
  cityName: { type: String, required: true }, // track per city
  category: { type: String, required: true }, // e.g. "Shop", "Place", "Transport"
  engagement: {
    views: { type: Number, default: 0 },
    viewedBy: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        timestamps: [{ type: Date }],
      },
    ],
  },
});

export default mongoose.models.CategoryEngagement ||
  mongoose.model("CategoryEngagement", categoryEngagementSchema);
