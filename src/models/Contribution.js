import mongoose from "mongoose";

const { Schema } = mongoose;

// Contribution Schema
const contributionSchema = new Schema({
  userId: { type: String, required: true },
  cityName: { type: String , required: true}, // Optional, for quick access or display
  reviews: [{ type: Schema.Types.ObjectId, ref: 'Review' }],

  category: { type: String}, // e.g., "food", "placesToVisit"
  title: { type: String, required: true },
  description: { type: String },
  images: [String],
  video: { type: String },
  submittedAt: { type: Date, default: Date.now },
  status: { type: String, enum: ['pending', 'accepted', 'approved', 'rejected'], default: 'pending' },
  adminRemarks: { type: String },

});

const Contribution = mongoose.models.Contribution || mongoose.model("Contribution", contributionSchema);
export default Contribution;
