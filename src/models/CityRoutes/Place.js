import mongoose from "mongoose";

const { Schema } = mongoose;

// Places to Visit Schema
const placesToVisitSchema = new Schema({
  cityId: { type: Schema.Types.ObjectId, ref: "City", required: true },
  cityName: { type: String }, // Optional, for quick access or display

  engagement: {
    views: { type: Number, default: 0 },
    viewedBy: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        timestamps: [{ type: Date, default: Date.now }]
      }
    ]
  },

  reviews: [{ type: Schema.Types.ObjectId, ref: "Review" }],

  places: { type: String, required: true },
  category: { type: String, required: true },

  lat: { type: Number, required: true },
  lon: { type: Number, required: true },

  address: { type: String, required: true },
  locationLink: { type: String, required: true },
  openDay: { type: String, required: true },
  openTime: { type: String, required: true },
  establishYear: { type: String },
  fee: { type: String, required: true },
  description: { type: String, required: true },
  essential: { type: String, required: true },
  story: { type: String },

  images: [{ type: String, required: true }],
  videos: [{ type: String, required: true }],

  premium: {
    type: String,
    enum: ["FREE", "A", "B"],
    default: "FREE",
  },
});

const PlacesToVisit =
  mongoose.models.PlacesToVisit ||
  mongoose.model("PlacesToVisit", placesToVisitSchema);

export default PlacesToVisit;
