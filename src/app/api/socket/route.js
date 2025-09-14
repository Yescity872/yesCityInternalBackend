import { NextResponse } from 'next/server';
import { Server as SocketIOServer } from 'socket.io';
import { connectToDatabase } from '@/lib/db';
import ChatMessage from '@/models/ChatMessage';
import City from '@/models/City';
import User from '@/models/User';
import { verifyToken } from '@/lib/jwt';

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
  });

  io.use(async (socket, next) => {
    try {
      let token = socket.handshake.auth.token;
      if (!token && socket.handshake.headers.cookie) {
        const match = /(?:^|; )token=([^;]+)/.exec(socket.handshake.headers.cookie);
        if (match) token = match[1];
      }

      if (!token) return next();

      const decoded = verifyToken(token);
      if (!decoded) return next();

      const user = await User.findById(decoded.userId).lean();
      if (user) {
        socket.user = { userId: user._id.toString(), username: user.username };
      }
      next();
    } catch (err) {
      console.error('Auth middleware error:', err);
      next(err);
    }
  });

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id, 'user:', socket.user?.userId);

    socket.on('joinRoom', ({ city, groupName }) => {
      const room = `${city}::${groupName}`;
      socket.join(room);
    });

    socket.on('sendMessage', async (payload, ack) => {
      try {
        const { city, groupName, text, media } = payload;
        const cityDoc = await City.findOne({ cityName: city });
        if (!cityDoc) return ack({ success: false, message: 'City not found' });

        const userId = socket.user?.userId;
        if (!userId) return ack({ success: false, message: 'Unauthenticated' });

        const msg = new ChatMessage({
          city: cityDoc._id,
          groupName,
          sender: userId,
          text,
          media: media || [],
        });
        await msg.save();
        const populated = await ChatMessage.findById(msg._id).populate('sender', 'username');

        const room = `${city}::${groupName}`;
        io.to(room).emit('message', populated);

        ack({ success: true, data: populated });
      } catch (err) {
        ack({ success: false, message: err.message });
      }
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected:', socket.id);
    });
  });

  console.log('[Socket] Initialized successfully');
  return NextResponse.json({ message: 'Socket server initialized' });
}