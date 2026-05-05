import { analyzeUrl } from "../services/analysis.service.js";
import { analyzeEmail } from "../services/emailAnalysis.service.js";
import { Incident } from "../models/Incident.js";
import { validateIncident } from "../models/schemas.js";
import { AuditLog } from "../models/AuditLog.js";
import { getLatestHealth, getIncidentEventsSince, pushIncidentEvent } from "../services/realtime.service.js";
import { getApiMetricsSnapshot } from "../services/apiMetrics.service.js";
import { observeInput } from "../services/adversarialMonitoring.service.js";

const mapSeverityFromScore = (score) => {
  if (score >= 85) return "critical";
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
};

export const analyzeUrlController = async (req, res, next) => {
  try {
    const { url, pageHtml = "", scriptContent = "" } = req.body;
    observeInput({ ip: req.ip, type: "url", rawInput: url });
    const result = await analyzeUrl({ url, pageHtml, scriptContent });

    const incidentValidationPayload = {
      type: "phishing",
      severity: mapSeverityFromScore(result.score),
      threatScore: result.score,
      targetUrl: url,
    };

    const schemaErrors = validateIncident(incidentValidationPayload);
    if (schemaErrors.length > 0) {
      const err = new Error(schemaErrors.join(", "));
      err.statusCode = 400;
      return next(err);
    }

    const incident = await Incident.create({
      type: "url",
      input: url,
      score: result.score,
      status: result.status,
      reasons: result.reasons,
      metadata: result.metadata,
    });

    const io = req.app.get("io");
    if (io) {
      const incidentEvent = {
        id: incident._id,
        type: incident.type,
        input: incident.input,
        score: incident.score,
        status: incident.status,
        reasons: incident.reasons,
        createdAt: incident.createdAt,
      };
      io.emit("incident:new", incidentEvent);
      pushIncidentEvent(incidentEvent);
    }

    await AuditLog.create({
      userId: req.user.id,
      action: "analysis:url",
      ip: req.ip,
      metadata: {
        status: result.status,
        score: result.score,
      },
    });

    return res.status(201).json({
      success: true,
      message: "URL analyzed successfully",
      data: {
        ...result,
        incidentId: incident._id,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const analyzeEmailController = async (req, res, next) => {
  try {
    const { subject, body } = req.body;
    observeInput({ ip: req.ip, type: "email", rawInput: `${subject}\n${body}` });
    const result = await analyzeEmail({ subject, body });

    const incidentValidationPayload = {
      type: "phishing",
      severity: mapSeverityFromScore(result.score),
      threatScore: result.score,
      targetUrl: "email://content",
    };

    const schemaErrors = validateIncident(incidentValidationPayload);
    if (schemaErrors.length > 0) {
      const err = new Error(schemaErrors.join(", "));
      err.statusCode = 400;
      return next(err);
    }

    const incident = await Incident.create({
      type: "email",
      input: subject,
      score: result.score,
      status: result.status,
      reasons: result.reasons,
      metadata: {
        ...result.metadata,
        subject,
      },
    });

    const io = req.app.get("io");
    if (io) {
      const incidentEvent = {
        id: incident._id,
        type: incident.type,
        input: incident.input,
        score: incident.score,
        status: incident.status,
        reasons: incident.reasons,
        createdAt: incident.createdAt,
      };
      io.emit("incident:new", incidentEvent);
      pushIncidentEvent(incidentEvent);
    }

    await AuditLog.create({
      userId: req.user.id,
      action: "analysis:email",
      ip: req.ip,
      metadata: {
        status: result.status,
        score: result.score,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Email analyzed successfully",
      data: {
        ...result,
        incidentId: incident._id,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const pollingEventsController = async (req, res, next) => {
  try {
    const { since } = req.query;
    const incidents = getIncidentEventsSince(since);
    const health = getLatestHealth();

    return res.status(200).json({
      success: true,
      message: "Polling data fetched",
      data: {
        incidents,
        health,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const systemHealthController = async (req, res, next) => {
  const startedAt = process.hrtime.bigint();

  try {
    const uptime = process.uptime();
    const memory = process.memoryUsage();
    const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

    return res.status(200).json({
      success: true,
      message: "System healthy",
      data: {
        uptime,
        memory: {
          rss: memory.rss,
          heapTotal: memory.heapTotal,
          heapUsed: memory.heapUsed,
          external: memory.external,
        },
        responseTime: Number(elapsedMs.toFixed(2)),
        apiPerformance: getApiMetricsSnapshot(),
      },
    });
  } catch (error) {
    return next(error);
  }
};
