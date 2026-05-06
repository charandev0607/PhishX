import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { findActiveSession } from "../services/session.service.js";

export const authenticate = async (req, _res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      const err = new Error("Missing or invalid authorization header");
      err.statusCode = 401;
      throw err;
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    if (!decoded.sid) {
      const err = new Error("Token session missing");
      err.statusCode = 401;
      throw err;
    }

    const session = await findActiveSession(decoded.sid);
    if (!session || String(session.userId) !== String(decoded.sub)) {
      const err = new Error("Session expired or revoked");
      err.statusCode = 401;
      throw err;
    }

    const user = await User.findById(decoded.sub).select("email role");
    if (!user) {
      const err = new Error("User not found");
      err.statusCode = 401;
      throw err;
    }

    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      sessionId: decoded.sid,
    };

    next();
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 401;
    }
    next(error);
  }
};

export const authorize = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    const err = new Error("Forbidden");
    err.statusCode = 403;
    return next(err);
  }

  return next();
};
