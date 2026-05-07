import { Incident } from "../models/Incident.js";
import { AuditLog } from "../models/AuditLog.js";
import { MLFeedback } from "../models/MLFeedback.js";
import { MLDailyMetrics } from "../models/MLDailyMetrics.js";
import { logger } from "../utils/logger.js";

let retentionTimer = null;

const getRetentionDays = () => Number(process.env.RETENTION_DAYS || 90);
const getIntervalMs = () => Number(process.env.RETENTION_CLEANUP_INTERVAL_HOURS || 24) * 60 * 60 * 1000;

const runRetentionCleanup = async () => {
  const retentionDays = getRetentionDays();
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

  const [incidentResult, auditResult, mlFeedbackResult, mlDailyMetricsResult] = await Promise.all([
    Incident.deleteMany({ createdAt: { $lt: cutoff } }),
    AuditLog.deleteMany({ timestamp: { $lt: cutoff } }),
    MLFeedback.deleteMany({ createdAt: { $lt: cutoff } }),
    MLDailyMetrics.deleteMany({ updatedAt: { $lt: cutoff } }),
  ]);

  logger.info("Retention cleanup completed", {
    retentionDays,
    incidentsRemoved: incidentResult.deletedCount || 0,
    auditLogsRemoved: auditResult.deletedCount || 0,
    mlFeedbackRemoved: mlFeedbackResult.deletedCount || 0,
    mlDailyMetricsRemoved: mlDailyMetricsResult.deletedCount || 0,
  });
};

export const startRetentionEngine = () => {
  runRetentionCleanup().catch((error) => {
    logger.error("Initial retention cleanup failed", { error: error.message });
  });

  const intervalMs = getIntervalMs();
  retentionTimer = setInterval(() => {
    runRetentionCleanup().catch((error) => {
      logger.error("Retention cleanup failed", { error: error.message });
    });
  }, intervalMs);

  logger.info("Retention engine started", {
    retentionDays: getRetentionDays(),
    intervalMs,
  });
};

export const stopRetentionEngine = () => {
  if (retentionTimer) {
    clearInterval(retentionTimer);
    retentionTimer = null;
  }
};
