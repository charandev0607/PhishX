import rateLimit from "express-rate-limit";

export const apiRateLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MIN || 15) * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX || 100),
  skip: (req) => req.path === "/api/v1/system/health" || req.path === "/system/health",
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests, please try again later",
    error: "RATE_LIMIT_EXCEEDED",
  },
});
