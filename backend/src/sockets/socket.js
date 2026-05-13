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

  // SECURITY FIX: Only match YOUR Vercel preview URLs
  const VERCEL_PREVIEW_REGEX = /^https:\/\/sales-management-system[a-z0-9-]*\.vercel\.app$/;

  const io = new Server(server, {
    cors: {
      origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
        if (VERCEL_PREVIEW_REGEX.test(origin)) return callback(null, true);
        return callback(new Error('CORS not allowed'), false);
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // SECURITY FIX: Reject unauthenticated socket connections.
  // Previously, unauthenticated sockets were allowed to connect AND could join
  // arbitrary rooms via the 'join_room' handler, potentially receiving sensitive
  // real-time data (order updates, expense approvals, etc.)
  io.use((socket, next) => {
    try {
      const cookies = cookie.parse(socket.handshake.headers.cookie || '');
      const token = cookies.accessToken || socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) {
        return next(new Error('Authentication required for socket connection'));
      }
      const decoded = verifyAccessToken(token);
      socket.user = decoded;
      next();
    } catch (err) {
      return next(new Error('Invalid or expired authentication token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    logger.info(`Socket connected: ${user.role} - ${user.id}`);

    // Join role-based rooms (server-controlled, not client-requested)
    if (user.role === 'SuperAdmin' || user.role === 'Admin') {
      socket.join('admin');
      socket.join(`admin_${user.id}`);
    } else if (user.role === 'Salesperson') {
      socket.join(`salesperson_${user.id}`);
      if (user.region) socket.join(`region_${user.region}`);
    }

    // REMOVED: The generic 'join_room' handler was a security risk.
    // Clients should never be able to self-select which rooms they join.
    // Room assignment is now strictly server-controlled based on JWT claims.

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${user.role} - ${user.id}`);
    });
  });

  return io;
};

module.exports = { setupSocket };
