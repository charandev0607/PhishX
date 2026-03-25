import mongoose from "mongoose";
import { logger } from "../utils/logger.js";

export const connectDB = async () => {
  try {
    mongoose.set("strictQuery", true);
    await mongoose.connect(process.env.MONGO_URI);
    logger.info("MongoDB connected", { host: mongoose.connection.host, db: mongoose.connection.name });
  } catch (error) {
    logger.error("MongoDB connection failed", { error: error.message });
    throw error;
  }
};
