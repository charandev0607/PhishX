import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { logger } from "../utils/logger.js";

let memoryServer = null;

const isMemoryFallbackEnabled = () => process.env.MONGO_MEMORY_FALLBACK === "true";

export const connectDB = async () => {
  try {
    mongoose.set("strictQuery", true);
    await mongoose.connect(process.env.MONGO_URI);
    logger.info("MongoDB connected", { host: mongoose.connection.host, db: mongoose.connection.name });
  } catch (error) {
    logger.error("MongoDB connection failed", { error: error.message });

    if (!isMemoryFallbackEnabled()) {
      throw error;
    }

    if (!memoryServer) {
      memoryServer = await MongoMemoryServer.create({
        instance: {
          dbName: process.env.MONGO_MEMORY_DB_NAME || "phishx",
        },
      });
    }

    const memoryUri = memoryServer.getUri();
    await mongoose.connect(memoryUri);
    logger.warn("Using in-memory MongoDB fallback", {
      uri: memoryUri,
      db: mongoose.connection.name,
    });
  }
};
