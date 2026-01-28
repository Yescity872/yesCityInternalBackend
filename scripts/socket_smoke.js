// Small smoke test to verify socket server connection using socket.io-client
import { io } from 'socket.io-client';

(async () => {
  const url = process.env.SOCKET_URL || 'ws://localhost:4001';
  console.log('Connecting to', url);
  const socket = io(url, { transports: ['websocket'] });
  socket.on('connect', () => {
    console.log('connected', socket.id);
    socket.disconnect();
    process.exit(0);
  });
  socket.on('connect_error', (err) => {
    console.error('connect_error', err.message || err);
    process.exit(2);
  });
})();
