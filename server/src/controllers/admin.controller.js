import { User } from "../models/User.js";
import { Policy } from "../models/Policy.js";
import { AuditLog } from "../models/AuditLog.js";

const DEFAULT_POLICY = {
  key: "default",
  autoBlockThreshold: 70,
  autoQuarantine: true,
  requireMfaForAdmins: true,
  notifyOnCritical: true,
  maxAlertsPerMinute: 100,
};

export const getUsersController = async (req, res, next) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (role) {
      query.role = role;
    }

    if (search) {
      query.email = { $regex: search, $options: "i" };
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [items, total] = await Promise.all([
      User.find(query)
        .select("email role failedAttempts lockUntil createdAt updatedAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      User.countDocuments(query),
    ]);

    await AuditLog.create({
      userId: req.user.id,
      action: "admin:users:list",
      ip: req.ip,
      metadata: { role, search, page: Number(page), limit: Number(limit) },
    });

    return res.status(200).json({
      success: true,
      message: "Users fetched successfully",
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

export const updateUserRoleController = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;
    if (String(req.user?.id) === String(userId) && role !== "admin") {
      const err = new Error("Admins cannot remove their own admin role");
      err.statusCode = 400;
      throw err;
    }

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      const err = new Error("User not found");
      err.statusCode = 404;
      throw err;
    }

    targetUser.role = role;
    await targetUser.save();

    await AuditLog.create({
      userId: req.user.id,
      action: "admin:users:update-role",
      ip: req.ip,
      metadata: { targetUserId: targetUser._id, role },
    });

    return res.status(200).json({
      success: true,
      message: "User role updated",
      data: {
        id: targetUser._id,
        email: targetUser.email,
        role: targetUser.role,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const getPolicyController = async (req, res, next) => {
  try {
    let policy = await Policy.findOne({ key: "default" }).lean();
    if (!policy) {
      policy = await Policy.create(DEFAULT_POLICY);
    }

    await AuditLog.create({
      userId: req.user.id,
      action: "admin:policies:get",
      ip: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: "Policies fetched successfully",
      data: policy,
    });
  } catch (error) {
    return next(error);
  }
};

export const updatePolicyController = async (req, res, next) => {
  try {
    const updates = req.body;

    const policy = await Policy.findOneAndUpdate(
      { key: "default" },
      {
        $set: updates,
        $setOnInsert: { key: "default" },
      },
      { upsert: true, new: true, runValidators: true }
    ).lean();

    await AuditLog.create({
      userId: req.user.id,
      action: "admin:policies:update",
      ip: req.ip,
      metadata: updates,
    });

    return res.status(200).json({
      success: true,
      message: "Policies updated successfully",
      data: policy,
    });
  } catch (error) {
    return next(error);
  }
};
