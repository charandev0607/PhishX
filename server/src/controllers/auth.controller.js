import bcrypt from "bcryptjs";
import crypto from "crypto";
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
  jwt.sign({ sub: user._id.toString(), tokenType: "refresh", sid: sessionId.toString(), jti: crypto.randomUUID() }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES || "7d",
  });

const issueSessionTokens = async ({ user, req, action }) => {
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
    action,
    ip: req.ip,
    metadata: {
      sessionId: session._id,
      role: user.role,
    },
  });

  return {
    user: { id: user._id, email: user.email, role: user.role },
    accessToken,
    refreshToken,
  };
};

export const signup = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      const err = new Error("An account with this email already exists");
      err.statusCode = 409;
      throw err;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: normalizedEmail,
      password: passwordHash,
      role: "analyst",
    });

    const authData = await issueSessionTokens({ user, req, action: "auth:signup" });

    return res.status(201).json({
      success: true,
      message: "Signup successful",
      data: authData,
    });
  } catch (error) {
    return next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select("+password +refreshTokenHash failedAttempts lockUntil role email");

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
    await user.save();

    const authData = await issueSessionTokens({ user, req, action: "auth:login" });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: authData,
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
    try {
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
    } catch {
      // Keep logout idempotent: invalid/expired tokens should still return success.
    }

    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    return next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email.toLowerCase();
    const user = await User.findOne({ email: normalizedEmail }).select("+passwordResetTokenHash +passwordResetExpiresAt");

    // Do not reveal if the user exists.
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If the email exists, a reset token has been issued",
      });
    }

    const rawToken = crypto.randomBytes(24).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    user.passwordResetTokenHash = tokenHash;
    user.passwordResetExpiresAt = expiresAt;
    await user.save();

    await AuditLog.create({
      userId: user._id,
      action: "auth:forgot-password",
      ip: req.ip,
      metadata: { expiresAt },
    });

    const data = {};
    if (process.env.NODE_ENV !== "production") {
      data.resetToken = rawToken;
      data.expiresAt = expiresAt;
    }

    return res.status(200).json({
      success: true,
      message: "If the email exists, a reset token has been issued",
      data,
    });
  } catch (error) {
    return next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
    }).select("+password +passwordResetTokenHash +passwordResetExpiresAt");

    if (!user) {
      const err = new Error("Invalid or expired reset token");
      err.statusCode = 400;
      throw err;
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.failedAttempts = 0;
    user.lockUntil = null;
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    user.refreshTokenHash = null;
    await user.save();

    await AuditLog.create({
      userId: user._id,
      action: "auth:reset-password",
      ip: req.ip,
    });

    return res.status(200).json({
      success: true,
      message: "Password reset successful. Please login with new password.",
    });
  } catch (error) {
    return next(error);
  }
};
