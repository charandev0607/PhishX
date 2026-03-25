import xss from "xss";

const sanitizeValue = (value) => {
  if (typeof value === "string") {
    return xss(value, {
      whiteList: {},
      stripIgnoreTag: true,
      stripIgnoreTagBody: ["script"],
    });
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }

  if (value && typeof value === "object") {
    return Object.entries(value).reduce((acc, [key, nested]) => {
      acc[key] = sanitizeValue(nested);
      return acc;
    }, {});
  }

  return value;
};

export const xssSanitizeMiddleware = (req, _res, next) => {
  req.body = sanitizeValue(req.body);
  req.query = sanitizeValue(req.query);
  req.params = sanitizeValue(req.params);
  next();
};

export const csrfProtectionMiddleware = (req, _res, next) => {
  const csrfEnabled = process.env.CSRF_ENABLED === "true";
  if (!csrfEnabled) {
    return next();
  }

  const method = req.method.toUpperCase();
  const needsCsrf = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
  if (!needsCsrf) {
    return next();
  }

  const expectedToken = process.env.CSRF_SHARED_TOKEN;
  const receivedToken = req.headers["x-csrf-token"];

  if (!expectedToken || !receivedToken || receivedToken !== expectedToken) {
    const error = new Error("Invalid or missing CSRF token");
    error.statusCode = 403;
    return next(error);
  }

  return next();
};
