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
import { pusher } from "@/lib/pusher"; // ✅ add your pusher client

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

    let messageData;
    let groupId;

    // Handle multipart form data (file upload) or JSON (text message)
    const contentType = req.headers.get("content-type");

    if (contentType?.includes("multipart/form-data")) {
      // Handle file upload
      const formData = await req.formData();
      const file = formData.get("file");
      const messageType = formData.get("messageType");
      groupId = formData.get("groupId");

      if (!file || !messageType || !groupId) {
        return new Response(
          JSON.stringify({ error: "Missing required fields for file upload" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Validate file type and size
      const maxSize =
        messageType === "image" ? 5 * 1024 * 1024 : 50 * 1024 * 1024;
      if (file.size > maxSize) {
        return new Response(
          JSON.stringify({
            error: `File too large. Max size: ${
              messageType === "image" ? "5MB" : "50MB"
            }`,
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Simulate file upload (replace with S3/Cloudinary later)
      const fileName = `${Date.now()}-${file.name}`;
      const mediaUrl = `/uploads/${fileName}`;

      messageData = {
        groupId,
        messageType,
        mediaUrl,
        mediaFileName: file.name,
        mediaSize: file.size,
        mediaType: file.type,
      };
    } else {
      // Handle text message
      const body = await req.json();
      groupId = body.groupId;
      messageData = {
        groupId: body.groupId,
        messageType: body.messageType || "text",
        content: body.content,
      };

      if (!messageData.content?.trim()) {
        return new Response(
          JSON.stringify({ error: "Message content cannot be empty" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    }

    // Check if user is a member of the group
    const membership = await GroupMember.findOne({
      groupId,
      userId,
      isActive: true,
    });

    if (!membership) {
      return new Response(
        JSON.stringify({ error: "You must be a member to send messages" }),
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create message
    const newMessage = new ChatMessage({
      ...messageData,
      userId,
      username: user.username,
    });

    await newMessage.save();

    // Update group last activity
    await ChatGroup.findByIdAndUpdate(groupId, {
      lastActivity: new Date(),
    });

    // ✅ Trigger realtime event
    await pusher.trigger(`group-${groupId}`, "new-message", {
      id: newMessage._id,
      groupId,
      sender: user.username,
      content: newMessage.content || null,
      messageType: newMessage.messageType,
      mediaUrl: newMessage.mediaUrl || null,
      createdAt: newMessage.createdAt,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: newMessage,
        messageText: "Message sent successfully",
      }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending message:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
