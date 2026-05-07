import "dotenv/config";
import http from "http";
import https from "https";
import fs from "fs";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import app from "./app.js";
import { connectDB } from "./config/db.js";
import { User } from "./models/User.js";
import { Session } from "./models/Session.js";
import { initSocket, stopSocketIntervals } from "./sockets/socket.js";
import { logger } from "./utils/logger.js";
import { startRetentionEngine, stopRetentionEngine } from "./services/retention.service.js";

const PORT = Number(process.env.PORT || 5000);
const REQUIRED_ENV_VARS = ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"];

const validateRequiredEnv = () => {
  const missing = REQUIRED_ENV_VARS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
};

const createHttpServer = () => {
  if (process.env.HTTPS_ENABLED !== "true") {
    return { server: http.createServer(app), mode: "http" };
  }

  const keyPath = process.env.TLS_KEY_PATH;
  const certPath = process.env.TLS_CERT_PATH;

  if (!keyPath || !certPath) {
    logger.warn("HTTPS requested but cert paths are missing. Falling back to HTTP");
    return { server: http.createServer(app), mode: "http" };
  }

  const key = fs.readFileSync(keyPath);
  const cert = fs.readFileSync(certPath);

  return {
    server: https.createServer(
      {
        key,
        cert,
        minVersion: "TLSv1.2",
      },
      app
    ),
    mode: "https",
  };
};

const ensureBootstrapAdmin = async () => {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    return;
  }

  const existingAdmin = await User.findOne({ email: adminEmail.toLowerCase() });
  if (existingAdmin) {
    await Session.deleteMany({ userId: existingAdmin._id });
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await User.create({
    email: adminEmail.toLowerCase(),
    password: passwordHash,
    role: "admin",
  });
  const createdAdmin = await User.findOne({ email: adminEmail.toLowerCase() }).select("_id");
  if (createdAdmin) {
    await Session.deleteMany({ userId: createdAdmin._id });
  }

  logger.info("Bootstrap admin user created", { email: adminEmail.toLowerCase() });
};

const bootstrap = async () => {
  try {
    validateRequiredEnv();
    await connectDB();
    await ensureBootstrapAdmin();

    const { server, mode } = createHttpServer();
    const io = initSocket(server);
    app.set("io", io);
    startRetentionEngine();

    server.listen(PORT, () => {
      logger.info("Backend server started", { port: PORT, env: process.env.NODE_ENV, mode });
    });

    const shutdown = async (signal) => {
      logger.warn("Shutdown signal received", { signal });
      server.close(async () => {
        stopRetentionEngine();
        stopSocketIntervals();
        await mongoose.connection.close();

        process.exit(0);
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    logger.error("Failed to start backend", { error: error.message });
    process.exit(1);
  }
};

bootstrap();
