import { Incident } from "../models/Incident.js";
import { ReportedLink } from "../models/ReportedLink.js";
import { AuditLog } from "../models/AuditLog.js";

const getDateRangeQuery = (startDate, endDate) => {
  const query = {};
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }
  return query;
};

export const getDashboardController = async (req, res, next) => {
  try {
    const [liveThreatCounts, recentIncidents, scoreDistribution, trend, totalThreats, blockedCount] = await Promise.all([
      Incident.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),
      Incident.find({}).sort({ createdAt: -1 }).limit(50).lean(),
      Incident.aggregate([
        {
          $bucket: {
            groupBy: "$score",
            boundaries: [0, 40, 70, 101],
            default: "other",
            output: { count: { $sum: 1 } },
          },
        },
      ]),
      Incident.aggregate([
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
              day: { $dayOfMonth: "$createdAt" },
              hour: { $hour: "$createdAt" },
            },
            count: { $sum: 1 },
          },
        },
        {
          $sort: {
            "_id.year": 1,
            "_id.month": 1,
            "_id.day": 1,
            "_id.hour": 1,
          },
        },
        { $limit: 24 },
      ]),
      Incident.countDocuments({}),
      Incident.countDocuments({ status: "phishing" }),
    ]);

    const statusCounts = Object.fromEntries(liveThreatCounts.map((item) => [item._id, item.count]));
    const scoreBuckets = scoreDistribution.reduce(
      (acc, bucket) => {
        if (bucket._id === 0) acc.low = bucket.count;
        if (bucket._id === 40) acc.medium = bucket.count;
        if (bucket._id === 70) acc.high = bucket.count;
        return acc;
      },
      { low: 0, medium: 0, high: 0 }
    );
    const trendPoints = trend.map((row) => ({
      label: `${String(row._id.hour).padStart(2, "0")}:00`,
      threats: row.count,
      timestamp: row._id,
    }));

    return res.status(200).json({
      success: true,
      message: "Dashboard data fetched",
      data: {
        summary: {
          totalThreats,
          phishingBlocked: blockedCount,
          safe: statusCounts.safe || 0,
          suspicious: statusCounts.suspicious || 0,
          phishing: statusCounts.phishing || 0,
        },
        liveThreatCounts,
        recentIncidents,
        scoreDistribution,
        trend: trendPoints,
        riskDistribution: [
          { name: "Low", value: scoreBuckets.low, color: "#00ff88" },
          { name: "Medium", value: scoreBuckets.medium, color: "#0066ff" },
          { name: "High", value: scoreBuckets.high, color: "#ffb800" },
          { name: "Critical", value: statusCounts.phishing || 0, color: "#ff0055" },
        ],
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const getThreatFeedController = async (req, res, next) => {
  try {
    const items = await Incident.find({ status: "phishing" }).sort({ createdAt: -1 }).limit(50).lean();
    return res.status(200).json({
      success: true,
      message: "Threat feed fetched",
      data: { items },
    });
  } catch (error) {
    return next(error);
  }
};

export const reportSuspiciousLinkController = async (req, res, next) => {
  try {
    const { url, description = "" } = req.body;
    const report = await ReportedLink.create({
      userId: req.user.id,
      url,
      description,
      status: "pending_review",
    });

    const incident = await Incident.create({
      type: "url",
      input: url,
      score: 50,
      status: "suspicious",
      reasons: ["User reported suspicious link"],
      metadata: {
        source: "user_report",
        reportId: report._id,
      },
    });

    await AuditLog.create({
      userId: req.user.id,
      action: "report-link:create",
      ip: req.ip,
      metadata: { reportId: report._id, incidentId: incident._id },
    });

    return res.status(201).json({
      success: true,
      message: "Suspicious link reported",
      data: {
        reportId: report._id,
        incidentId: incident._id,
        status: "pending_review",
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const getBlockedAttemptsStatsController = async (_req, res, next) => {
  try {
    const blockedAttempts = await ReportedLink.countDocuments({});
    return res.status(200).json({
      success: true,
      message: "Blocked attempts stats fetched",
      data: { blocked_attempts: blockedAttempts },
    });
  } catch (error) {
    return next(error);
  }
};

export const generateReportController = async (req, res, next) => {
  try {
    const { startDate, endDate, type } = req.body;
    const rangeQuery = getDateRangeQuery(startDate, endDate);
    const query = {
      ...rangeQuery,
      status: type,
    };

    const [incidentCount, topThreatsAgg, feedbackStats] = await Promise.all([
      Incident.countDocuments(query),
      Incident.aggregate([
        { $match: query },
        { $group: { _id: "$input", count: { $sum: 1 }, avgScore: { $avg: "$score" } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),
      Incident.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            lowConfidence: {
              $sum: {
                $cond: [{ $and: [{ $gte: ["$score", 40] }, { $lt: ["$score", 70] }] }, 1, 0],
              },
            },
          },
        },
      ]),
    ]);

    const total = feedbackStats[0]?.total || 0;
    const lowConfidence = feedbackStats[0]?.lowConfidence || 0;
    const falsePositiveRate = total === 0 ? 0 : Number(((lowConfidence / total) * 100).toFixed(2));

    return res.status(200).json({
      success: true,
      message: "Report generated",
      data: {
        startDate,
        endDate,
        type,
        incidentCount,
        topThreats: topThreatsAgg,
        falsePositiveRate,
      },
    });
  } catch (error) {
    return next(error);
  }
};
