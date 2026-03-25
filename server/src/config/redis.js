import { createClient } from "redis";
import { logger } from "../utils/logger.js";

let redisClient;

export const connectRedis = async () => {
  if (!process.env.REDIS_URL) {
    logger.warn("REDIS_URL not set, skipping Redis connection");
    return null;
  }

  redisClient = createClient({
    url: process.env.REDIS_URL,
    socket: {
      reconnectStrategy: () => false,
      connectTimeout: 1500,
    },
  });
  redisClient.on("error", (err) => logger.error("Redis client error", { error: err.message }));

  try {
    await redisClient.connect();
    logger.info("Redis connected");
    return redisClient;
  } catch (error) {
    logger.warn("Redis unavailable, running without cache", { error: error.message });
    redisClient = null;
    return null;
  }
};

export const getRedisClient = () => redisClient;
