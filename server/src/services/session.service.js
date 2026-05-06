import bcrypt from "bcryptjs";
import crypto from "crypto";
import ms from "ms";
import { Session } from "../models/Session.js";

const getRefreshWindowMs = () => {
  const value = process.env.JWT_REFRESH_EXPIRES || "7d";
  const parsed = ms(value);
  if (!parsed || Number.isNaN(parsed)) {
    return ms("7d");
  }
  return parsed;
};

const digestRefreshToken = (refreshToken) => crypto.createHash("sha256").update(refreshToken).digest("hex");

export const createSession = async ({ userId, refreshToken, ip, userAgent }) => {
  const refreshWindowMs = getRefreshWindowMs();
  const refreshTokenHash = await bcrypt.hash(digestRefreshToken(refreshToken), 10);

  return Session.create({
    userId,
    refreshTokenHash,
    ip,
    userAgent,
    expiresAt: new Date(Date.now() + refreshWindowMs),
  });
};

export const findActiveSession = async (sessionId) => {
  const session = await Session.findById(sessionId).select("+refreshTokenHash");
  if (!session || !session.isActive()) {
    return null;
  }
  return session;
};

export const rotateSession = async ({ session, refreshToken }) => {
  session.refreshTokenHash = await bcrypt.hash(digestRefreshToken(refreshToken), 10);
  session.expiresAt = new Date(Date.now() + getRefreshWindowMs());
  session.lastUsedAt = new Date();
  await session.save();
  return session;
};

export const revokeSession = async (sessionId) => {
  await Session.findByIdAndUpdate(sessionId, {
    $set: {
      revokedAt: new Date(),
    },
  });
};

export const verifyRefreshToken = async ({ session, refreshToken }) => {
  const tokenDigest = digestRefreshToken(refreshToken);
  return bcrypt.compare(tokenDigest, session.refreshTokenHash);
};
