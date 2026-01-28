Socket server deployment notes

This project includes a standalone Socket.IO server at `src/socket-server.js` intended to run as a long-lived Node process (not on Vercel serverless functions).

Why a standalone server?
- Socket.IO requires a persistent TCP connection for WebSocket upgrades. Vercel serverless functions are not suitable for long-lived socket servers.

Recommended deployment options
- A small node process on a VM (DigitalOcean, AWS EC2, Linode), or a container on a managed service (AWS ECS, Google Cloud Run with sticky sessions or a WebSocket-capable gateway), or a platform that supports websockets (Heroku, Railway, Render).

Environment variables
- MONGO_URI - your MongoDB connection string.
- JWT_SECRET - secret used to sign/verify JWT tokens.
- SOCKET_PORT - port for the socket server (default 4001).
- SOCKET_ALLOWED_ORIGINS - comma separated list of allowed origins (e.g. https://app.yourdomain.com, http://localhost:3000).

Start locally
- Install project dependencies in the backend package and start the socket server:

```bash
cd newYesCityBackend
# ensure NODE_OPTIONS/BABEL/ESM config if necessary
SOCKET_PORT=4001 MONGO_URI="<your Mongo URI>" JWT_SECRET="<your secret>" SOCKET_ALLOWED_ORIGINS="http://localhost:3000" node src/socket-server.js
```

Frontend configuration
- Set `NEXT_PUBLIC_SOCKET_URL` to the full websocket URL in production (e.g. `wss://sockets.yourdomain.com`) or `ws://localhost:4001` during local development. Example `.env.production`:

```
NEXT_PUBLIC_SOCKET_URL=wss://sockets.yourdomain.com
```

Notes and troubleshooting
- Ensure the socket host does not redirect `/socket.io/` to another path (no 308). The client must connect to the canonical socket host (protocol + host + optional port) that accepts upgrades.
- If you run behind proxies/load-balancers make sure they support WebSocket upgrades and forward the `Origin` header.
- If polling transport is required, ensure the HTTP endpoints for polling respond with proper CORS headers for the frontend origin.

Contact
- If you want I can provide a Dockerfile and a sample systemd unit file for running the socket server in production.
