// /api/buddyConnect/chat/route.js (or wherever your actual route is)
import { connectToDatabase } from '@/lib/db';
import BuddyMessage from '@/models/BuddyMessage';
import User from '@/models/User';
import { withAuth } from '@/middleware/auth';
import { pusher } from '@/lib/pusher';

// Utility to generate conversationId
const getConversationId = (id1, id2) =>
  [id1.toString(), id2.toString()].sort().join("_");

// ---------------- GET ----------------
export const GET = withAuth(async (req) => {
  try {
    const userId = req.user.userId;
    const url = new URL(req.url);
    const buddyId = url.searchParams.get("buddyId");
    const limit = parseInt(url.searchParams.get("limit")) || 50;
    const before = url.searchParams.get("before");

    if (!buddyId) {
      return new Response(JSON.stringify({ error: "Buddy ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    await connectToDatabase();

    const conversationId = getConversationId(userId, buddyId);

    const query = { conversationId, isDeleted: false };
    if (before) {
      query._id = { $lt: before };
    }

    const messages = await BuddyMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    messages.reverse();

    return new Response(
      JSON.stringify({
        messages,
        hasMore: messages.length === limit,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error fetching buddy messages:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

// ---------------- POST ----------------
export const POST = withAuth(async (req) => {
  try {
    const senderId = req.user.userId;
    await connectToDatabase();

    const sender = await User.findById(senderId).select("username");
    if (!sender) {
      return new Response(JSON.stringify({ error: "Sender not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { receiverId, messageType, content, mediaUrl, mediaFileName, mediaSize, mediaType } = body;

    if (!receiverId) {
      return new Response(JSON.stringify({ error: "Receiver ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Validate content
    if (messageType === "text" && !content?.trim()) {
      return new Response(JSON.stringify({ error: "Message content cannot be empty" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    if ((messageType === "image" || messageType === "video") && !mediaUrl) {
      return new Response(JSON.stringify({ error: "Media URL is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const conversationId = getConversationId(senderId, receiverId);

    const messageData = {
      conversationId,
      senderId,
      receiverId,
      senderName: sender.username,
      messageType: messageType || "text",
      ...(messageType === "text" && { content }),
      ...(messageType !== "text" && {
        mediaUrl,
        mediaFileName,
        mediaSize,
        mediaType,
      }),
    };

    const newMessage = new BuddyMessage(messageData);
    await newMessage.save();

    // ✅ FIXED: Convert ObjectIds to strings for consistent frontend comparison
    const pusherPayload = {
      _id: newMessage._id.toString(),
      conversationId,
      senderId: newMessage.senderId.toString(), // ✅ Convert to string
      receiverId: newMessage.receiverId.toString(), // ✅ Convert to string
      senderName: sender.username,
      content: newMessage.content || null,
      messageType: newMessage.messageType,
      mediaUrl: newMessage.mediaUrl || null,
      mediaFileName: newMessage.mediaFileName || null,
      mediaSize: newMessage.mediaSize || null,
      mediaType: newMessage.mediaType || null,
      createdAt: newMessage.createdAt,
    };

    // Realtime event
    try {
      console.log('📤 Triggering Pusher event:', `buddy-${conversationId}`, pusherPayload);
      await pusher.trigger(`buddy-${conversationId}`, "new-message", pusherPayload);
      console.log('✅ Pusher event triggered successfully');
    } catch (err) {
      console.error("❌ Pusher error:", err);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: newMessage,
        messageText: "Message sent successfully",
      }),
      { status: 201, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending buddy message:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

// ---------------- DELETE ----------------
export const DELETE = withAuth(async (req) => {
  try {
    const userId = req.user.userId;
    await connectToDatabase();

    const url = new URL(req.url);
    const messageId = url.searchParams.get("messageId");

    if (!messageId) {
      return new Response(JSON.stringify({ error: "Message ID is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const message = await BuddyMessage.findById(messageId);
    if (!message) {
      return new Response(JSON.stringify({ error: "Message not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (message.senderId.toString() !== userId.toString()) {
      return new Response(JSON.stringify({ error: "You can only delete your own messages" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    await BuddyMessage.findByIdAndDelete(messageId);

    try {
      await pusher.trigger(`buddy-${message.conversationId}`, "delete-message", {
        messageId: messageId.toString(), // ✅ Ensure string
      });
    } catch (err) {
      console.error("Pusher error (delete):", err);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Message deleted successfully",
        messageId,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error deleting buddy message:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});