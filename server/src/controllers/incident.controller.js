import { Incident } from "../models/Incident.js";
import { AuditLog } from "../models/AuditLog.js";

export const getIncidents = async (req, res, next) => {
  try {
    const {
      type,
      startDate,
      endDate,
      minScore,
      maxScore,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      order = "desc",
    } = req.query;

    const query = {};

    if (type) query.type = type;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (minScore !== undefined || maxScore !== undefined) {
      query.score = {};
      if (minScore !== undefined) query.score.$gte = Number(minScore);
      if (maxScore !== undefined) query.score.$lte = Number(maxScore);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const sortOrder = order === "asc" ? 1 : -1;

    const [items, total] = await Promise.all([
      Incident.find(query)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      Incident.countDocuments(query),
    ]);

    await AuditLog.create({
      userId: req.user.id,
      action: "incidents:list",
      ip: req.ip,
      metadata: {
        filters: {
          type,
          startDate,
          endDate,
          minScore,
          maxScore,
        },
        page: Number(page),
        limit: Number(limit),
      },
    });

    return res.status(200).json({
      success: true,
      message: "Incidents fetched successfully",
      data: {
        items,
        pagination: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};
