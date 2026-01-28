import mongoose from 'mongoose';

const forgotPasswordOTPSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  otp: {
    type: String,
    required: true,
  },
  expiresAt: {
    type: Date,
    required: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 900, // Document will be automatically deleted after 15 minutes
  },
});

// Index for faster queries
forgotPasswordOTPSchema.index({ email: 1 });
forgotPasswordOTPSchema.index({ expiresAt: 1 });

const ForgotPasswordOTP = mongoose.models.ForgotPasswordOTP || mongoose.model('ForgotPasswordOTP', forgotPasswordOTPSchema);

export default ForgotPasswordOTP;