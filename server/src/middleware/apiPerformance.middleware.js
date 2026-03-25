import { recordLatency } from "../services/apiMetrics.service.js";

export const apiPerformanceMiddleware = (req, res, next) => {
  const startedAt = process.hrtime.bigint();

  res.on("finish", () => {
    const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    recordLatency(Number(elapsedMs.toFixed(2)));
  });

  next();
};
