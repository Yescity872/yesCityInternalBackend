import mongoose from "mongoose";

const { Schema } = mongoose;

const activitiesSchema = new Schema({
  cityId: { type: Schema.Types.ObjectId, ref: 'City', required: true },
  cityName: { type: String },

  engagement: {
    views: { type: Number, default: 0 },
    viewedBy: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        timestamps: [{ type: Date, default: Date.now }]
      }
    ]
  },

  reviews: [{ type: Schema.Types.ObjectId, ref: 'Review' }],

  topActivities: { type: String, required: true },
  bestPlaces: { type: String, required: true },
  description: { type: String, required: true },
  essentials: [{ type: String, required: true }],
  fee: { type: String, required: true },
  images: [{ type: String, required: true }],
  videos: [{ type: String }],

  premium: {
    type: String,
    enum: ["FREE", "A", "B"],
    default: "FREE"
  },
});

const Activity =
  mongoose.models.Activity || mongoose.model("Activity", activitiesSchema);

export default Activity;
