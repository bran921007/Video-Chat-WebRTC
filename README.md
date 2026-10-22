# Video-Chat-WebRTC

Use Node.js 24.22.1 or a later patched 24.x release (`nvm use`).

Run `npm ci`, `npm test`, then `npm start` to listen on port 3000.
Tests exercise HTTP redirects, room rendering, static JavaScript and room-scoped
Socket.IO connection/disconnection messages using local synthetic clients.
Camera capture, the external PeerJS service and browser-to-browser media require
a separate browser integration check.
