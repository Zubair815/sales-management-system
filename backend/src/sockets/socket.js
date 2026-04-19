const { Server } = require('socket.io');
const { verifyAccessToken } = require('../utils/jwt');
const logger = require('../utils/logger');

const setupSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Auth middleware for socket
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('Authentication required'));
      const decoded = verifyAccessToken(token);
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    logger.info(`Socket connected: ${user.role} - ${user.id}`);

    // Join role-based rooms
    if (user.role === 'SuperAdmin' || user.role === 'Admin') {
      socket.join('admin');
      socket.join(`admin_${user.id}`);
    } else if (user.role === 'Salesperson') {
      socket.join(`salesperson_${user.id}`);
      if (user.region) socket.join(`region_${user.region}`);
    }

    socket.on('join_room', (room) => {
      socket.join(room);
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${user.role} - ${user.id}`);
    });
  });

  return io;
};

module.exports = { setupSocket };
