import Redis from 'ioredis';

// This module exports a singleton Redis client instance.
// It reads the Redis connection URL from the REDIS_URL environment variable.
//
// Make sure to set the REDIS_URL environment variable in your .env file.
// Example: REDIS_URL="redis://localhost:6379"

let redis: Redis;

if (process.env.NODE_ENV === 'production') {
  redis = new Redis(process.env.REDIS_URL as string);
} else {
  // In development, use a global variable to preserve the connection
  // across hot reloads.
  if (!global.redis) {
    global.redis = new Redis(process.env.REDIS_URL as string);
  }
  redis = global.redis;
}

export default redis;
