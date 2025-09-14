<<<<<<< HEAD
import { Server } from 'socket.io';
=======
import { NextResponse } from 'next/server';
import { Server as SocketIOServer } from 'socket.io';
>>>>>>> d192308d82f57a9a46b73b319fad9e2ff81809ce
import { connectToDatabase } from '@/lib/db';
import ChatMessage from '@/models/ChatMessage';
import City from '@/models/City';
import User from '@/models/User';
import { verifyToken } from '@/lib/jwt';

<<<<<<< HEAD
let io;

export const config = {
  api: {
    bodyParser: false, // Important: Disable body parsing
  },
};

export default async function handler(req, res) {
  if (res.socket.server.io) {
    console.log('⚡ Socket.io already running');
    res.end();
    return;
  }

  console.log('🧱 Setting up Socket.io server');

  await connectToDatabase();

  io = new Server(res.socket.server, {
    path: '/api/socket/io',
    cors: {
      origin: process.env.SOCKET_ALLOWED_ORIGINS || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
=======
// Avoid initializing multiple times
let io;

export async function GET(req) {
  if (io) {
    console.log('[Socket] Already initialized.');
    return NextResponse.json({ message: 'Socket already running' });
  }

  await connectToDatabase();
  console.log('[Socket] Database connected');

  const allowedOrigins = (process.env.SOCKET_ALLOWED_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  io = new SocketIOServer(req.nextUrl.origin, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    path: '/api/socket',
>>>>>>> d192308d82f57a9a46b73b319fad9e2ff81809ce
  });

  io.use(async (socket, next) => {
    try {
      let token = socket.handshake.auth.token;
<<<<<<< HEAD

      if (!token && socket.handshake.headers.cookie) {
        const m = /(?:^|; )token=([^;]+)/.exec(socket.handshake.headers.cookie);
        if (m) token = m[1];
=======
      if (!token && socket.handshake.headers.cookie) {
        const match = /(?:^|; )token=([^;]+)/.exec(socket.handshake.headers.cookie);
        if (match) token = match[1];
>>>>>>> d192308d82f57a9a46b73b319fad9e2ff81809ce
      }

      if (!token) return next();

      const decoded = verifyToken(token);
      if (!decoded) return next();

      const user = await User.findById(decoded.userId).lean();
      if (user) {
        socket.user = { userId: user._id.toString(), username: user.username };
      }
<<<<<<< HEAD
      return next();
    } catch (err) {
      console.error('Socket auth error:', err);
      return next();
=======
      next();
    } catch (err) {
      console.error('Auth middleware error:', err);
      next(err);
>>>>>>> d192308d82f57a9a46b73b319fad9e2ff81809ce
    }
  });

  io.on('connection', (socket) => {
<<<<<<< HEAD
    console.log('🟢 New socket connection:', socket.id);
=======
    console.log('Socket connected:', socket.id, 'user:', socket.user?.userId);
>>>>>>> d192308d82f57a9a46b73b319fad9e2ff81809ce

    socket.on('joinRoom', ({ city, groupName }) => {
      const room = `${city}::${groupName}`;
      socket.join(room);
    });

    socket.on('sendMessage', async (payload, ack) => {
      try {
        const { city, groupName, text, media } = payload;
<<<<<<< HEAD

        if (!city || !groupName) return ack({ success: false, message: 'Missing fields' });

        const cityDoc = await City.findOne({ cityName: city });
        if (!cityDoc) return ack({ success: false, message: 'City not found' });

        const userId = socket.user ? socket.user.userId : null;
=======
        const cityDoc = await City.findOne({ cityName: city });
        if (!cityDoc) return ack({ success: false, message: 'City not found' });

        const userId = socket.user?.userId;
>>>>>>> d192308d82f57a9a46b73b319fad9e2ff81809ce
        if (!userId) return ack({ success: false, message: 'Unauthenticated' });

        const msg = new ChatMessage({
          city: cityDoc._id,
          groupName,
          sender: userId,
          text,
          media: media || [],
        });
<<<<<<< HEAD

        await msg.save();
        const populated = await ChatMessage.findById(msg._id).populate('sender', 'username profileImage');

        const out = populated.toObject();
        out.senderId = out.sender._id.toString();
        out.cityName = city;
        out.groupName = groupName;

        const room = `${city}::${groupName}`;
        io.to(room).emit('message', out);

        ack({ success: true, data: out });
      } catch (err) {
        console.error(err);
=======
        await msg.save();
        const populated = await ChatMessage.findById(msg._id).populate('sender', 'username');

        const room = `${city}::${groupName}`;
        io.to(room).emit('message', populated);

        ack({ success: true, data: populated });
      } catch (err) {
>>>>>>> d192308d82f57a9a46b73b319fad9e2ff81809ce
        ack({ success: false, message: err.message });
      }
    });

    socket.on('disconnect', () => {
<<<<<<< HEAD
      console.log('🔴 Socket disconnected:', socket.id);
    });
  });

  res.socket.server.io = io;
  res.end();
}
=======
      console.log('Socket disconnected:', socket.id);
    });
  });

  console.log('[Socket] Initialized successfully');
  return NextResponse.json({ message: 'Socket server initialized' });
}
>>>>>>> d192308d82f57a9a46b73b319fad9e2ff81809ce
