import mongoose from "mongoose";

const { Schema } = mongoose;

const hiddenGemsSchema = new Schema({
  cityId: { type: Schema.Types.ObjectId, ref: "City", required: true },
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
  reviews: [{ type: Schema.Types.ObjectId, ref: "Review" }],

  hiddenGem: { type: String, required: true },
  category: { type: String },
  lat: { type: Number, required: true },
  lon: { type: Number, required: true },
  address: { type: String },
  locationLink: { type: String },
  openDay: { type: String },
  openTime: { type: String },
  guideAvailability: { type: String },
  establishYear: { type: String },
  fee: { type: String },
  description: { type: String },
  essential: { type: String },
  story: { type: String },

  images: [{ type: String }],
  videos: [{ type: String }],

  premium: {
    type: String,
    enum: ["FREE", "A", "B"],
    default: "FREE"
  }
});

const HiddenGem =
  mongoose.models.HiddenGem || mongoose.model("HiddenGem", hiddenGemsSchema);

export default HiddenGem;
