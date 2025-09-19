// /api/chat/messages/route.js
import { connectToDatabase } from '@/lib/db';
import ChatMessage from '@/models/ChatMessage';
import GroupMember from '@/models/GroupMember';
import ChatGroup from '@/models/ChatGroup';
import User from '@/models/User';
import { withAuth } from '@/middleware/auth';

// GET - Fetch messages for a group
export const GET = withAuth(async (req) => {
  try {
    const userId = req.user.userId;
    const url = new URL(req.url);
    const groupId = url.searchParams.get('groupId');
    const limit = parseInt(url.searchParams.get('limit')) || 50;
    const before = url.searchParams.get('before'); // For pagination

    if (!groupId) {
      return new Response(JSON.stringify({ error: 'Group ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    await connectToDatabase();

    // Find group
    const group = await ChatGroup.findById(groupId);
    if (!group) {
      return new Response(JSON.stringify({ error: 'Group not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 🔒 Check access if group is private
    if (group.isPrivate) {
      const membership = await GroupMember.findOne({
        groupId,
        userId,
        isActive: true,
      });

      if (!membership) {
        return new Response(JSON.stringify({ error: 'You must join this private group to view messages' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    }

    // Build query for messages
    const query = { 
      groupId, 
      isDeleted: false 
    };

    if (before) {
      query._id = { $lt: before };
    }

    // Fetch messages
    const messages = await ChatMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Reverse to get chronological order
    messages.reverse();

    return new Response(JSON.stringify({ 
      messages,
      hasMore: messages.length === limit 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching messages:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});


// POST - Send message or upload media
import { pusher } from "@/lib/pusher"; // ✅ your pusher client

// /api/chat/messages/route.js - Updated POST handler

export const POST = withAuth(async (req) => {
  try {
    const userId = req.user.userId;
    await connectToDatabase();

    // Get user info
    const user = await User.findById(userId).select("username");
    if (!user) {
      return new Response(JSON.stringify({ error: "User not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Parse JSON body (now we expect JSON instead of FormData)
    const body = await req.json();
    const { groupId, messageType, content, mediaUrl, mediaFileName, mediaSize, mediaType } = body;

    if (!groupId) {
      return new Response(JSON.stringify({ error: "Group ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate message content
    if (messageType === 'text' && !content?.trim()) {
      return new Response(JSON.stringify({ error: "Message content cannot be empty" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if ((messageType === 'image' || messageType === 'video') && !mediaUrl) {
      return new Response(JSON.stringify({ error: "Media URL is required for media messages" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Ensure user is a member of the group
    const membership = await GroupMember.findOne({
      groupId,
      userId,
      isActive: true,
    });
    
    if (!membership) {
      return new Response(JSON.stringify({ error: "You must be a member to send messages" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Prepare message data
    const messageData = {
      groupId,
      userId,
      username: user.username,
      messageType: messageType || 'text',
      ...(messageType === 'text' && { content }),
      ...(messageType !== 'text' && {
        mediaUrl,
        mediaFileName,
        mediaSize,
        mediaType,
      }),
    };

    // Create and save message
    const newMessage = new ChatMessage(messageData);
    await newMessage.save();

    // Update group last activity
    await ChatGroup.findByIdAndUpdate(groupId, {
      lastActivity: new Date(),
    });

    // Trigger realtime event but don't crash if fails
    try {
      await pusher.trigger(`group-${groupId}`, "new-message", {
        _id: newMessage._id,
        groupId,
        userId,
        username: user.username,
        content: newMessage.content || null,
        messageType: newMessage.messageType,
        mediaUrl: newMessage.mediaUrl || null,
        mediaFileName: newMessage.mediaFileName || null,
        createdAt: newMessage.createdAt,
      });
    } catch (pusherErr) {
      console.error("Pusher error:", pusherErr);
      // Don't throw → just log
    }

    // Always return success if DB save worked
    return new Response(JSON.stringify({
      success: true,
      message: newMessage,
      messageText: "Message sent successfully",
    }), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Error sending message:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});