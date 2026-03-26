import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import cookieParser from "cookie-parser";
import authRoutes from "./routes/auth.routes.js";
import analysisRoutes from "./routes/analysis.routes.js";
import incidentRoutes from "./routes/incident.routes.js";
import mlRoutes from "./routes/ml.routes.js";
import securityRoutes from "./routes/security.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import { apiRateLimiter } from "./middleware/rateLimit.middleware.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import { csrfProtectionMiddleware, xssSanitizeMiddleware } from "./middleware/security.middleware.js";
import { apiPerformanceMiddleware } from "./middleware/apiPerformance.middleware.js";

const app = express();

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

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);
app.use(apiRateLimiter);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(xssSanitizeMiddleware);
app.use(
  mongoSanitize({
    allowDots: true,
    replaceWith: "_",
  })
);
app.use(hpp());
app.use(csrfProtectionMiddleware);
app.use(apiPerformanceMiddleware);
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

app.use("/api/v1/security", securityRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1", analysisRoutes);
app.use("/api/v1", incidentRoutes);
app.use("/api/v1", mlRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
