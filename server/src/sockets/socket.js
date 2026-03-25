import { Server } from "socket.io";
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
