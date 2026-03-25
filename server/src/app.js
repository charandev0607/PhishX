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
import securityRoutes from "./routes/security.routes.js";
import { apiRateLimiter } from "./middleware/rateLimit.middleware.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import { csrfProtectionMiddleware, xssSanitizeMiddleware } from "./middleware/security.middleware.js";
import { apiPerformanceMiddleware } from "./middleware/apiPerformance.middleware.js";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN,
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
app.use("/api/v1", analysisRoutes);
app.use("/api/v1", incidentRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
