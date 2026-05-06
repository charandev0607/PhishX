import { analyzeUrl } from "../services/analysis.service.js";
import { analyzeEmail } from "../services/emailAnalysis.service.js";
import { analyzeWebpage } from "../services/webpageAnalysis.service.js";
import { Incident } from "../models/Incident.js";
import { validateIncident } from "../models/schemas.js";
import { AuditLog } from "../models/AuditLog.js";
import { Policy } from "../models/Policy.js";
import { getLatestHealth, getIncidentEventsSince, pushIncidentEvent } from "../services/realtime.service.js";
import { getApiMetricsSnapshot } from "../services/apiMetrics.service.js";
import { observeInput } from "../services/adversarialMonitoring.service.js";

const mapSeverityFromScore = (score) => {
  if (score >= 85) return "critical";
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
};

const mapThreatType = ({ status, reasons = [] }) => {
  const joined = reasons.join(" ").toLowerCase();
  if (joined.includes("credential")) return "credential_harvesting";
  if (joined.includes("malware")) return "malware";
  if (status === "suspicious") return "spam";
  return "phishing";
};

const applyPolicyToResult = async (result) => {
  const policy = await Policy.findOne({ key: "default" }).select("autoBlockThreshold").lean();
  const threshold = Number(policy?.autoBlockThreshold);
  if (!Number.isFinite(threshold)) return result;
  if (Number(result.score) < threshold) return result;
  if (result.status === "phishing") return result;
  return {
    ...result,
    status: "phishing",
    reasons: [...new Set([...(result.reasons || []), `Policy auto-block threshold reached (${threshold})`])],
    metadata: {
      ...(result.metadata || {}),
      policy: {
        autoBlockThreshold: threshold,
        autoBlocked: true,
      },
    },
  };
};

export const analyzeUrlController = async (req, res, next) => {
  try {
    const { url, pageHtml = "", scriptContent = "" } = req.body;
    observeInput({ ip: req.ip, type: "url", rawInput: url });
    const baseResult = await analyzeUrl({ url, pageHtml, scriptContent });
    const result = await applyPolicyToResult(baseResult);

    const incidentValidationPayload = {
      type: mapThreatType(result),
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
    const baseResult = await analyzeEmail({ subject, body });
    const result = await applyPolicyToResult(baseResult);

    const incidentValidationPayload = {
      type: mapThreatType(result),
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

export const analyzeWebpageController = async (req, res, next) => {
  try {
    const { text, sourceUrl = "" } = req.body;
    observeInput({ ip: req.ip, type: "webpage", rawInput: text.slice(0, 4000) });
    const baseResult = await analyzeWebpage({ text });
    const result = await applyPolicyToResult(baseResult);

    const incidentValidationPayload = {
      type: mapThreatType(result),
      severity: mapSeverityFromScore(result.score),
      threatScore: result.score,
      targetUrl: sourceUrl || "webpage://content",
    };

    const schemaErrors = validateIncident(incidentValidationPayload);
    if (schemaErrors.length > 0) {
      const err = new Error(schemaErrors.join(", "));
      err.statusCode = 400;
      return next(err);
    }

    const incident = await Incident.create({
      type: "webpage",
      input: sourceUrl || "Webpage content",
      score: result.score,
      status: result.status,
      reasons: result.reasons,
      metadata: {
        ...result.metadata,
        sourceUrl,
        text: text.slice(0, 40000),
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
      action: "analysis:webpage",
      ip: req.ip,
      metadata: { status: result.status, score: result.score, sourceUrl },
    });

    return res.status(201).json({
      success: true,
      message: "Webpage analyzed successfully",
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
        memory: process.env.NODE_ENV === "production" ? undefined : {
          rss: memory.rss,
          heapTotal: memory.heapTotal,
          heapUsed: memory.heapUsed,
          external: memory.external,
        },
        responseTime: Number(elapsedMs.toFixed(2)),
        apiPerformance: process.env.NODE_ENV === "production" ? undefined : getApiMetricsSnapshot(),
      },
    });
  } catch (error) {
    return next(error);
  }
};
