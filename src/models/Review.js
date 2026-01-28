import mongoose from 'mongoose';

const { Schema } = mongoose;

const ReviewSchema = new Schema({

  // Optional name for display purposes
  cityName: {type: String},

  parentRef: {
    type: Schema.Types.ObjectId,
    required: true,
    refPath: 'onModel' // dynamic ref
  },

  onModel: {
    type: String,
    required: true,
enum: ['Accommodation', 'Activity', 'CityInfo', 'Connectivity', 'Contribution', 'Food', 'HiddenGem', 'Itinerary', 'Misc', 'NearbySpot', 'Place', 'Shop', 'Transport']
  },

rating: {
  type: Number,
  required: true,
  min: 1,
  max: 5
},
  content: {
    type: String,
    required: true,
  },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  date: {
    type: Date,
    default: Date.now,
  },

});

const Review = mongoose.models.Review || mongoose.model('Review', ReviewSchema);

export default Review;
