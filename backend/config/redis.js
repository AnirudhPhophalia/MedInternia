const Redis = require('ioredis');

const redisHost = process.env.REDIS_HOST || '127.0.0.1';
const redisPort = process.env.REDIS_PORT || 6379;
const redisPassword = process.env.REDIS_PASSWORD || undefined;

const redisConfig = process.env.REDIS_URL || {
  host: redisHost,
  port: Number(redisPort),
  password: redisPassword,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
};

const redis = new Redis(redisConfig);

redis.on('connect', () => {
  console.log('[Redis] Successfully connected to Redis server.');
});

redis.on('error', (err) => {
  console.error('[Redis Error] Connection failed:', err.message);
});

module.exports = redis;
