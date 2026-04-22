const { Server } = require('socket.io');
const { verifyAccessToken } = require('../utils/jwt');
const cookie = require('cookie');
const logger = require('../utils/logger');

const setupSocket = (server) => {
  const allowedOrigins = [
    'http://localhost:5173',
    'https://sales-management-system-ten.vercel.app',
  ];
  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
  }

  const io = new Server(server, {
    cors: {
      origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
        if (origin.endsWith('.vercel.app')) return callback(null, true);
        return callback(new Error('CORS not allowed'), false);
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Auth middleware — extract JWT from HttpOnly cookie
  io.use((socket, next) => {
    try {
      const cookies = cookie.parse(socket.handshake.headers.cookie || '');
      const token = cookies.accessToken || socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        // Allow connection without auth — just mark as unauthenticated
        socket.user = null;
        return next();
      }
      const decoded = verifyAccessToken(token);
      socket.user = decoded;
      next();
    } catch (err) {
      // Still allow connection but without user context
      socket.user = null;
      next();
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    if (user) {
      logger.info(`Socket connected: ${user.role} - ${user.id}`);

      // Join role-based rooms
      if (user.role === 'SuperAdmin' || user.role === 'Admin') {
        socket.join('admin');
        socket.join(`admin_${user.id}`);
      } else if (user.role === 'Salesperson') {
        socket.join(`salesperson_${user.id}`);
        if (user.region) socket.join(`region_${user.region}`);
      }
    } else {
      logger.info('Socket connected: unauthenticated client');
    }

    socket.on('join_room', (room) => {
      socket.join(room);
    });

    socket.on('disconnect', () => {
      if (user) {
        logger.info(`Socket disconnected: ${user.role} - ${user.id}`);
      }
    });
  });

  return io;
};

module.exports = { setupSocket };
