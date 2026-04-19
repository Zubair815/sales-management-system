/**
 * Simple in-memory response cache middleware.
 * No Redis dependency — suitable for single-instance deployments.
 * Use for read-heavy endpoints like dashboard stats and reports.
 */
const cache = new Map();

const cacheMiddleware = (ttlSeconds = 60) => (req, res, next) => {
  // Only cache GET requests
  if (req.method !== 'GET') return next();

  const key = `${req.originalUrl}:${req.user?.id || 'anon'}`;
  const cached = cache.get(key);

  if (cached && Date.now() - cached.timestamp < ttlSeconds * 1000) {
    return res.json(cached.data);
  }

  const originalJson = res.json.bind(res);
  res.json = (data) => {
    cache.set(key, { data, timestamp: Date.now() });

    // Evict oldest entries if cache grows too large (prevent memory leak)
    if (cache.size > 500) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    return originalJson(data);
  };

  next();
};

/**
 * Invalidate cache entries matching a prefix (e.g., after a write operation)
 */
const invalidateCache = (prefix) => {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
    }
  }
};

module.exports = { cacheMiddleware, invalidateCache };
