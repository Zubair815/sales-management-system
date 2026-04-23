const NodeCache = require('node-cache');
const logger = require('./logger');

// Cache with default 300s (5m) TTL
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

const getCache = (key) => {
  const value = cache.get(key);
  if (value) logger.debug(`Cache hit for key: ${key}`);
  return value;
};

const setCache = (key, value, ttl = 300) => {
  cache.set(key, value, ttl);
  logger.debug(`Cache set for key: ${key}`);
};

const clearCache = (keyPattern) => {
  const keys = cache.keys();
  const toDelete = keys.filter(k => k.includes(keyPattern));
  cache.del(toDelete);
  logger.debug(`Cache cleared for pattern: ${keyPattern}`);
};

module.exports = {
  getCache,
  setCache,
  clearCache,
};
