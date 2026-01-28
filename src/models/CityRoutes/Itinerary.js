import mongoose from "mongoose";

const { Schema } = mongoose;




// Itinerary Schema (Multiple Days)
const itinerarySchema = new Schema({
    cityId: { type: Schema.Types.ObjectId, ref: 'City', required: true },
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
    reviews: [{ type: Schema.Types.ObjectId, ref: 'Review' }],

  day1: { type: String},
  day2: { type: String},
  day3: { type: String},

    // ✅ New premium field with enum
  premium: {
    type: String,
    enum: ["FREE", "A", "B"],
    default: "FREE" // Optional: set default
  },
});

const Itinerary = mongoose.models.Itinerary || mongoose.model("Itinerary", itinerarySchema);
export default Itinerary;
