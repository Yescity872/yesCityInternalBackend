import mongoose from 'mongoose'

const YesCityReviewSchema = new mongoose.Schema({
  rating: {
    type: Number,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

const YesCityReview =
  mongoose.models.YesCityReview || mongoose.model('YesCityReview', YesCityReviewSchema);

export default YesCityReview;
