// models/GroupMember.js
import mongoose from 'mongoose';

const groupMemberSchema = new mongoose.Schema({
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
  role: {
    type: String,
    enum: ['admin', 'member'],
    default: 'member'
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

// Compound index to ensure one membership per user per group
groupMemberSchema.index({ groupId: 1, userId: 1 }, { unique: true });
groupMemberSchema.index({ userId: 1 });
groupMemberSchema.index({ groupId: 1, role: 1 });

// Static method to check if user is member of group
groupMemberSchema.statics.isMember = async function(groupId, userId) {
  const member = await this.findOne({ 
    groupId, 
    userId, 
    isActive: true 
  });
  return !!member;
};

// Static method to check if user is admin of group
groupMemberSchema.statics.isAdmin = async function(groupId, userId) {
  const admin = await this.findOne({ 
    groupId, 
    userId, 
    role: 'admin', 
    isActive: true 
  });
  return !!admin;
};

// Static method to get group member count
groupMemberSchema.statics.getMemberCount = async function(groupId) {
  return await this.countDocuments({ 
    groupId, 
    isActive: true 
  });
};

const GroupMember = mongoose.models.GroupMember || mongoose.model('GroupMember', groupMemberSchema);

export default GroupMember;