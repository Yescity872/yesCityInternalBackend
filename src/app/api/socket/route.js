import { Server } from 'socket.io';
import { connectToDatabase } from '@/lib/db';
import ChatMessage from '@/models/ChatMessage';
import City from '@/models/City';
import User from '@/models/User';
import { verifyToken } from '@/lib/jwt';

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
  });

  io.use(async (socket, next) => {
    try {
      let token = socket.handshake.auth.token;

      if (!token && socket.handshake.headers.cookie) {
        const m = /(?:^|; )token=([^;]+)/.exec(socket.handshake.headers.cookie);
        if (m) token = m[1];
      }

      if (!token) return next();

      const decoded = verifyToken(token);
      if (!decoded) return next();

      const user = await User.findById(decoded.userId).lean();
      if (user) {
        socket.user = { userId: user._id.toString(), username: user.username };
      }
      return next();
    } catch (err) {
      console.error('Socket auth error:', err);
      return next();
    }
  });

  io.on('connection', (socket) => {
    console.log('🟢 New socket connection:', socket.id);

    socket.on('joinRoom', ({ city, groupName }) => {
      const room = `${city}::${groupName}`;
      socket.join(room);
    });

    socket.on('sendMessage', async (payload, ack) => {
      try {
        const { city, groupName, text, media } = payload;

        if (!city || !groupName) return ack({ success: false, message: 'Missing fields' });

        const cityDoc = await City.findOne({ cityName: city });
        if (!cityDoc) return ack({ success: false, message: 'City not found' });

        const userId = socket.user ? socket.user.userId : null;
        if (!userId) return ack({ success: false, message: 'Unauthenticated' });

        const msg = new ChatMessage({
          city: cityDoc._id,
          groupName,
          sender: userId,
          text,
          media: media || [],
        });

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
        ack({ success: false, message: err.message });
      }
    });

    socket.on('disconnect', () => {
      console.log('🔴 Socket disconnected:', socket.id);
    });
  });

  res.socket.server.io = io;
  res.end();
}
