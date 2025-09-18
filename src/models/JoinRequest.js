// models/JoinRequest.js
import mongoose from 'mongoose';

const joinRequestSchema = new mongoose.Schema({
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChatGroup',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  username: {
    type: String,
    required: true // denormalized for performance
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  message: {
    type: String,
    maxLength: 200,
    trim: true
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  respondedAt: {
    type: Date
  },
  respondedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  responseMessage: {
    type: String,
    maxLength: 200,
    trim: true
  }
});

// Compound index to ensure one pending request per user per group
joinRequestSchema.index({ groupId: 1, userId: 1, status: 1 });
joinRequestSchema.index({ groupId: 1, status: 1 });
joinRequestSchema.index({ userId: 1, status: 1 });
joinRequestSchema.index({ requestedAt: -1 });

// Static method to check if user has pending request
joinRequestSchema.statics.hasPendingRequest = async function(groupId, userId) {
  const request = await this.findOne({ 
    groupId, 
    userId, 
    status: 'pending' 
  });
  return !!request;
};

// Static method to get pending requests for a group
joinRequestSchema.statics.getPendingRequests = async function(groupId) {
  return await this.find({ 
    groupId, 
    status: 'pending' 
  }).sort({ requestedAt: 1 });
};

// Instance method to approve request
joinRequestSchema.methods.approve = function(adminId, responseMessage = '') {
  this.status = 'approved';
  this.respondedAt = new Date();
  this.respondedBy = adminId;
  this.responseMessage = responseMessage;
  return this.save();
};

// Instance method to reject request
joinRequestSchema.methods.reject = function(adminId, responseMessage = '') {
  this.status = 'rejected';
  this.respondedAt = new Date();
  this.respondedBy = adminId;
  this.responseMessage = responseMessage;
  return this.save();
};

const JoinRequest = mongoose.models.JoinRequest || mongoose.model('JoinRequest', joinRequestSchema);

export default JoinRequest;