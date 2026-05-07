import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { validate, schemas } from "../middleware/validate.middleware.js";
import {
  generateReportController,
  getBlockedAttemptsStatsController,
  getDashboardController,
  getThreatFeedController,
  reportSuspiciousLinkController,
} from "../controllers/monitoring.controller.js";

const router = Router();

router.get("/dashboard", authenticate, authorize("admin"), getDashboardController);
router.get("/threat-feed", authenticate, authorize("admin", "end_user", "ml_engineer"), getThreatFeedController);
router.post(
  "/report-link",
  authenticate,
  authorize("admin", "end_user", "ml_engineer"),
  validate(schemas.reportLink),
  reportSuspiciousLinkController
);
router.get(
  "/stats/blocked-attempts",
  authenticate,
  authorize("admin", "end_user", "ml_engineer"),
  getBlockedAttemptsStatsController
);
router.post(
  "/reports/generate",
  authenticate,
  authorize("admin"),
  validate(schemas.reportGenerate),
  generateReportController
);

export default router;
