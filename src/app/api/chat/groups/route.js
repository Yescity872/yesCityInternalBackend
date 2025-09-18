// api/chat/groups/route.js - FIXED VERSION

import { connectToDatabase } from '@/lib/db';
import ChatGroup from '@/models/ChatGroup';
import GroupMember from '@/models/GroupMember';
import JoinRequest from '@/models/JoinRequest';
import User from '@/models/User';
import { withAuth } from '@/middleware/auth';

// GET - Fetch groups for a city with user membership status
export const GET = withAuth(async (req) => {
  try {
    const userId = req.user.userId;
    const url = new URL(req.url);
    const cityId = url.searchParams.get('cityId');

    if (!cityId) {
      return new Response(JSON.stringify({ error: 'City ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await connectToDatabase();

    // Fetch all groups for the city
    const groups = await ChatGroup.find({ cityId })
      .sort({ lastActivity: -1 })
      .lean();

    // Get user's memberships and pending requests
    const userMemberships = await GroupMember.find({ 
      userId, 
      isActive: true 
    }).select('groupId role').lean();

    const userRequests = await JoinRequest.find({ 
      userId, 
      status: 'pending' 
    }).select('groupId').lean();

    const membershipMap = {};
    const requestMap = {};

    userMemberships.forEach(member => {
      membershipMap[member.groupId] = member.role;
    });

    userRequests.forEach(request => {
      requestMap[request.groupId] = true;
    });

    // Add membership status to groups
    const groupsWithStatus = groups.map(group => ({
      ...group,
      isMember: !!membershipMap[group._id],
      isAdmin: membershipMap[group._id] === 'admin',
      hasPendingRequest: !!requestMap[group._id]
    }));

    return new Response(JSON.stringify({ groups: groupsWithStatus }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching groups:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

// POST - Create group, join group, or leave group
export const POST = withAuth(async (req) => {
  try {
    const userId = req.user.userId;
    const body = await req.json();
    const { action, groupId, cityId, name, description, isPrivate } = body;

    await connectToDatabase();

    if (action === 'create') {
      // Check contribution points
      const user = await User.findById(userId).select('contributionPoints username');
      if (!user) {
        return new Response(JSON.stringify({ error: 'User not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (user.contributionPoints < 200) {
        return new Response(JSON.stringify({ error: 'Insufficient contribution points. Need 200 points to create a group.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Create new group
      const newGroup = new ChatGroup({
        name,
        description,
        cityId,
        isPrivate: !!isPrivate,
        adminId: userId,
        memberCount: 1
      });

      await newGroup.save();

      // Add creator as admin member
      const adminMember = new GroupMember({
        groupId: newGroup._id,
        userId: userId,
        username: user.username,
        role: 'admin'
      });

      await adminMember.save();

      return new Response(JSON.stringify({ 
        success: true, 
        group: newGroup,
        message: 'Group created successfully' 
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });

    } else if (action === 'join') {
      // Join public group
      const group = await ChatGroup.findById(groupId);
      if (!group) {
        return new Response(JSON.stringify({ error: 'Group not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (group.isPrivate) {
        return new Response(JSON.stringify({ error: 'Cannot directly join private group' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Check if already an active member
      const existingActiveMember = await GroupMember.findOne({
        groupId,
        userId,
        isActive: true
      });

      if (existingActiveMember) {
        return new Response(JSON.stringify({ error: 'Already a member of this group' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const user = await User.findById(userId).select('username');
      
      // 🔧 FIX: Check if there's an inactive membership to reactivate
      const existingInactiveMember = await GroupMember.findOne({
        groupId,
        userId,
        isActive: false
      });

      if (existingInactiveMember) {
        // Reactivate existing membership
        existingInactiveMember.isActive = true;
        existingInactiveMember.joinedAt = new Date(); // Update join time
        await existingInactiveMember.save();
      } else {
        // Create new membership
        const newMember = new GroupMember({
          groupId,
          userId,
          username: user.username,
          role: 'member'
        });
        await newMember.save();
      }

      // Update group member count
      await ChatGroup.findByIdAndUpdate(groupId, {
        $inc: { memberCount: 1 },
        lastActivity: new Date()
      });

      return new Response(JSON.stringify({ 
        success: true,
        message: 'Successfully joined group' 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    } else if (action === 'leave') {
      // Leave group
      const member = await GroupMember.findOne({
        groupId,
        userId,
        isActive: true
      });

      if (!member) {
        return new Response(JSON.stringify({ error: 'Not a member of this group' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Deactivate membership
      member.isActive = false;
      member.leftAt = new Date(); // Optional: track when they left
      await member.save();

      // Update group member count
      await ChatGroup.findByIdAndUpdate(groupId, {
        $inc: { memberCount: -1 },
        lastActivity: new Date()
      });

      return new Response(JSON.stringify({ 
        success: true,
        message: 'Successfully left group' 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

    } else {
      return new Response(JSON.stringify({ error: 'Invalid action' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error in groups API:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});