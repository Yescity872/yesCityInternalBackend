import mongoose from "mongoose";

const { Schema } = mongoose;

// Shopping Schema
const shoppingSchema = new Schema({
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

  flagship: { type: Boolean, default: false },
  reviews: [{ type: Schema.Types.ObjectId, ref: "Review" }],

  shops: { type: String, required: true },

  lat: { type: Number, required: true },
  lon: { type: Number, required: true },

  address: { type: String, required: true },
  locationLink: { type: String },
  famousFor: { type: String },
  priceRange: { type: String },
  openDay: { type: String },
  openTime: { type: String },
  phone: { type: String },
  website: { type: String },

  images: [{ type: String }],

  premium: {
    type: String,
    enum: ["FREE", "A", "B"],
    default: "FREE",
  },
});

const Shopping =
  mongoose.models.Shopping || mongoose.model("Shopping", shoppingSchema);

export default Shopping;
