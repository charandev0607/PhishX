import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { AuditLog } from "../models/AuditLog.js";
import { createSession, findActiveSession, revokeSession, rotateSession, verifyRefreshToken } from "../services/session.service.js";

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

const signAccessToken = (user, sessionId) =>
  jwt.sign({ sub: user._id.toString(), role: user.role, sid: sessionId.toString() }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRES || "15m",
  });

const signRefreshToken = (user, sessionId) =>
  jwt.sign({ sub: user._id.toString(), tokenType: "refresh", sid: sessionId.toString() }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES || "7d",
  });

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select("+password +refreshTokenHash failedAttempts lockUntil role email");

    if (!user) {
      const err = new Error("Invalid credentials");
      err.statusCode = 401;
      throw err;
    }

    if (user.isLocked()) {
      const err = new Error("Account is temporarily locked due to failed login attempts");
      err.statusCode = 423;
      throw err;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      user.failedAttempts += 1;
      if (user.failedAttempts >= MAX_FAILED_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
      }
      await user.save();

      const err = new Error("Invalid credentials");
      err.statusCode = 401;
      throw err;
    }

    user.failedAttempts = 0;
    user.lockUntil = null;

    const bootstrapRefreshToken = jwt.sign(
      { sub: user._id.toString(), tokenType: "refresh", sid: "bootstrap" },
      process.env.JWT_REFRESH_SECRET,
      {
        expiresIn: process.env.JWT_REFRESH_EXPIRES || "7d",
      }
    );

    const session = await createSession({
      userId: user._id,
      refreshToken: bootstrapRefreshToken,
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    const accessToken = signAccessToken(user, session._id);
    const refreshToken = signRefreshToken(user, session._id);

    await rotateSession({ session, refreshToken });
    user.refreshTokenHash = null;
    await user.save();

    await AuditLog.create({
      userId: user._id,
      action: "auth:login",
      ip: req.ip,
      metadata: {
        sessionId: session._id,
        role: user.role,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: {
        user: { id: user._id, email: user.email, role: user.role },
        accessToken,
        refreshToken,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    if (decoded.tokenType !== "refresh" || !decoded.sid) {
      const err = new Error("Invalid refresh token");
      err.statusCode = 401;
      throw err;
    }

    const user = await User.findById(decoded.sub).select("email role");
    const session = await findActiveSession(decoded.sid);

    if (!user || !session || String(session.userId) !== String(decoded.sub)) {
      const err = new Error("Refresh token not recognized");
      err.statusCode = 401;
      throw err;
    }

    const isMatch = await verifyRefreshToken({ session, refreshToken });
    if (!isMatch) {
      const err = new Error("Invalid refresh token");
      err.statusCode = 401;
      throw err;
    }

    const newAccessToken = signAccessToken(user, session._id);
    const newRefreshToken = signRefreshToken(user, session._id);
    await rotateSession({ session, refreshToken: newRefreshToken });

    await AuditLog.create({
      userId: user._id,
      action: "auth:refresh",
      ip: req.ip,
      metadata: {
        sessionId: session._id,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Token refreshed",
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    if (decoded.sid) {
      await revokeSession(decoded.sid);
    }

    await User.findByIdAndUpdate(decoded.sub, { $set: { refreshTokenHash: null } });

    await AuditLog.create({
      userId: decoded.sub,
      action: "auth:logout",
      ip: req.ip,
      metadata: {
        sessionId: decoded.sid,
      },
    });

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    return next(error);
  }
};
