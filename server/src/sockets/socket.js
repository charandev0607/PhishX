import { Server } from "socket.io";
import { setLatestHealth } from "../services/realtime.service.js";

let healthInterval = null;

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
      origin: process.env.CLIENT_ORIGIN,
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
