import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  isPhoneVerified: { type: Boolean, default: false },

    unique: true,
  },
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
  },

  acceptConnectTandC:{
    type: Boolean,
    default: false,
  },
  allowToConnect: {
    type: Boolean,
    default: false,
  },
  
  favouriteCities: [
    { type: String },
  ],
  connectedUsers: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // friends
  ],
  pendingRequests: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // received requests
  ],
  followingUsers: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // sent requests
  ],

  googleId: {
    type: String,
  },
  profileImage: {
    type: String,
    default:
      'https://i.pinimg.com/736x/57/00/c0/5700c04197ee9a4372a35ef16eb78f4e.jpg',
  },
  
  firstProfile: { type: Boolean, default: false },

  phone: {
    type: String,
    required: true,
    unique: true,
  },
  isPhoneVerified: { type: Boolean, default: false },

  wishlist: [
    {
      cityName: { type: String, required: true },
      parentRef: { type: mongoose.Schema.Types.ObjectId, required: true },
      onModel: {
        type: String,
        required: true,
        enum: [
          'Accommodation',
          'Activity',
          'Food',
          'HiddenGem',
          'NearbySpot',
          'Place',
          'Shop',
          'festivals'
        ],
      },
    },
  ],

  isPremium: {
    type: String,
    enum: ['FREE', 'A', 'B'],
    default: 'FREE',
  },
  premiumStartDate: {
    type: Date,
    default: null,
  },
  premiumExpiryDate: {
    type: Date,
    default: null,
  },
  referralCode: {
    type: String,
    unique: true,
    sparse: true,
  },
  referredBy: {
    type: String,
  },
  contributionPoints: {
    type: Number,
    default: 0,
  },
  monthlyPoints: {
    type: Number,
    default: 0,
  },
  pointsMonth: {
    type: Date,
    default: Date.now,
  },
  referralCount: {
    type: Number,
    default: 0,
  },
  signupDate: {
    type: Date,
    default: Date.now,
  },
  lastActive: {
    type: Date,
    default: Date.now,
  },
  resetToken: String,
  resetTokenExpiry: Date,
});

userSchema.index(
  { _id: 1, 'wishlist.parentRef': 1, 'wishlist.onModel': 1 },
  { unique: true, sparse: true }
);

const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
