import mongoose from "mongoose";

const { Schema } = mongoose;

// Local Transport Schema
const localTransportSchema = new Schema({
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

  from: { type: String },
  to: { type: String },

  autoPrice: { type: String},
  cabPrice: { type: String },
  bikePrice: { type: String },

  premium: {
    type: String,
    enum: ["FREE", "A", "B"],
    default: "FREE",
  },
});

const LocalTransport =
  mongoose.models.LocalTransport ||
  mongoose.model("LocalTransport", localTransportSchema);

export default LocalTransport;
