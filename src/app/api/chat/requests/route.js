// api/chat/messages/route.js

import { connectToDatabase } from '@/lib/db';
import JoinRequest from '@/models/JoinRequest';
import GroupMember from '@/models/GroupMember';
import ChatGroup from '@/models/ChatGroup';
import User from '@/models/User';
import { withAuth } from '@/middleware/auth';

// GET - Fetch pending join requests for a group (admin only)
export const GET = withAuth(async (req) => {
  try {
    const userId = req.user.userId;
    const url = new URL(req.url);
    const groupId = url.searchParams.get('groupId');

    if (!groupId) {
      return new Response(JSON.stringify({ error: 'Group ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await connectToDatabase();

    // Check if user is admin of the group
    const adminMember = await GroupMember.findOne({
      groupId,
      userId,
      role: 'admin',
      isActive: true
    });

    if (!adminMember) {
      return new Response(JSON.stringify({ error: 'Only group admins can view join requests' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch pending requests
    const requests = await JoinRequest.find({
      groupId,
      status: 'pending'
    }).sort({ requestedAt: 1 }).lean();

    return new Response(JSON.stringify({ requests }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching join requests:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

// POST - Create join request or respond to join request
export const POST = withAuth(async (req) => {
  try {
    const userId = req.user.userId;
    const body = await req.json();

    await connectToDatabase();

    if (body.action === 'approve' || body.action === 'reject') {
      // Admin responding to join request
      const { requestId, action, responseMessage } = body;

      const request = await JoinRequest.findById(requestId);
      if (!request) {
        return new Response(JSON.stringify({ error: 'Request not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Check if current user is admin of the group
      const adminMember = await GroupMember.findOne({
        groupId: request.groupId,
        userId,
        role: 'admin',
        isActive: true
      });

      if (!adminMember) {
        return new Response(JSON.stringify({ error: 'Only group admins can respond to requests' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (action === 'approve') {
        // Check if user is already a member
        const existingMember = await GroupMember.findOne({
          groupId: request.groupId,
          userId: request.userId,
          isActive: true
        });

        if (!existingMember) {
          // Add user as member
          const newMember = new GroupMember({
            groupId: request.groupId,
            userId: request.userId,
            username: request.username,
            role: 'member'
          });

          await newMember.save();

          // Update group member count
          await ChatGroup.findByIdAndUpdate(request.groupId, {
            $inc: { memberCount: 1 },
            lastActivity: new Date()
          });
        }

        // Update request status
        await request.approve(userId, responseMessage);

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Request approved and user added to group' 
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });

      } else if (action === 'reject') {
        // Update request status
        await request.reject(userId, responseMessage);

        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Request rejected' 
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }

    } else {
      // User creating a join request
      const { groupId, message } = body;

      if (!groupId) {
        return new Response(JSON.stringify({ error: 'Group ID is required' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Check if group exists and is private
      const group = await ChatGroup.findById(groupId);
      if (!group) {
        return new Response(JSON.stringify({ error: 'Group not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (!group.isPrivate) {
        return new Response(JSON.stringify({ error: 'This group is public, you can join directly' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Check if user is already a member
      const existingMember = await GroupMember.findOne({
        groupId,
        userId,
        isActive: true
      });

      if (existingMember) {
        return new Response(JSON.stringify({ error: 'You are already a member of this group' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Check if user already has a pending request
      const existingRequest = await JoinRequest.findOne({
        groupId,
        userId,
        status: 'pending'
      });

      if (existingRequest) {
        return new Response(JSON.stringify({ error: 'You already have a pending request for this group' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Get user info
      const user = await User.findById(userId).select('username');
      if (!user) {
        return new Response(JSON.stringify({ error: 'User not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Create join request
      const joinRequest = new JoinRequest({
        groupId,
        userId,
        username: user.username,
        message: message || ''
      });

      await joinRequest.save();

      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Join request sent successfully' 
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Error in requests API:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
