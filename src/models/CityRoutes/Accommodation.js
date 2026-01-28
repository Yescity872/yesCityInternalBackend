import mongoose from "mongoose";

const { Schema } = mongoose;

const accommodationSchema = new Schema({
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

  flagship: { type: Boolean, default: false },
  reviews: [{ type: Schema.Types.ObjectId, ref: 'Review' }],

  hotels: { type: String, required: true },
  lat: { type: Number, required: true },
  lon: { type: Number, required: true },
  address: { type: String, required: true },
  locationLink: { type: String },
  category: { type: String },
  roomTypes: { type: String },
  facilities: { type: String },
  images: [{ type: String }],

  premium: {
    type: String,
    enum: ["FREE", "A", "B"],
    default: "FREE"
  },
});

const Accommodation =
  mongoose.models.Accommodation || mongoose.model("Accommodation", accommodationSchema);

export default Accommodation;
