import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { findActiveSession } from "../services/session.service.js";
import { setLatestHealth } from "../services/realtime.service.js";

let healthInterval = null;

const buildAllowedOrigins = () => {
  const configured = (process.env.CLIENT_ORIGIN || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  const defaults = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
  ];

  return new Set([...defaults, ...configured]);
};

const allowedOrigins = buildAllowedOrigins();

const buildHealthSnapshot = () => {
  const memory = process.memoryUsage();
  return {
    uptime: process.uptime(),
    memory: {
      rss: memory.rss,
      heapTotal: memory.heapTotal,
      heapUsed: memory.heapUsed,
      external: memory.external,
    },
    timestamp: new Date().toISOString(),
  };
};

export const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.has(origin)) {
          return callback(null, true);
        }

        return callback(new Error(`Socket CORS blocked for origin: ${origin}`));
      },
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error("Unauthorized socket connection"));
      }
      const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
      if (!decoded?.sid || !decoded?.sub) {
        return next(new Error("Unauthorized socket connection"));
      }
      const session = await findActiveSession(decoded.sid);
      if (!session || String(session.userId) !== String(decoded.sub)) {
        return next(new Error("Unauthorized socket connection"));
      }
      const user = await User.findById(decoded.sub).select("role");
      if (!user || !["admin", "end_user", "ml_engineer"].includes(user.role)) {
        return next(new Error("Forbidden socket role"));
      }
      return next();
    } catch {
      return next(new Error("Unauthorized socket connection"));
    }
  });

  io.on("connection", (socket) => {
    const snapshot = buildHealthSnapshot();
    setLatestHealth(snapshot);
    socket.emit("system:health", snapshot);
  });

  const intervalMs = Number(process.env.HEALTH_EMIT_INTERVAL_MS || 30000);
  setLatestHealth(buildHealthSnapshot());
  healthInterval = setInterval(() => {
    const snapshot = buildHealthSnapshot();
    setLatestHealth(snapshot);
    io.emit("system:health", snapshot);
  }, intervalMs);

  return io;
};

export const stopSocketIntervals = () => {
  if (healthInterval) {
    clearInterval(healthInterval);
    healthInterval = null;
  }
};
