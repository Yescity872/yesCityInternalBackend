// models/TravelBuddy.js
import mongoose from "mongoose";

const travelBuddySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    travelType: {
      type: String,
      enum: ["solo", "group", "open"], // optional field
      default: "open",
    },
    
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

export default mongoose.models.TravelBuddy || mongoose.model("TravelBuddy", travelBuddySchema);
