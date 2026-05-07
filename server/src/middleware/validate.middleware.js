import Joi from "joi";

const signupPassword = Joi.string().min(8);
const loginPassword = Joi.string().min(1);

export const validate = (schema, property = "body") => (req, _res, next) => {
  const { error, value } = schema.validate(req[property], {
    abortEarly: false,
    stripUnknown: true,
    convert: true,
  });

  if (error) {
    const err = new Error(error.details.map((d) => d.message).join(", "));
    err.statusCode = 400;
    return next(err);
  }

  req[property] = value;
  return next();
};

export const schemas = {
  signup: Joi.object({
    email: Joi.string().email({ tlds: { allow: false } }).required(),
    password: signupPassword.required(),
  }),
  login: Joi.object({
    email: Joi.string().email({ tlds: { allow: false } }).required(),
    password: loginPassword.required(),
  }),
  refresh: Joi.object({
    refreshToken: Joi.string().required(),
  }),
  logout: Joi.object({
    refreshToken: Joi.string().optional(),
  }),
  forgotPassword: Joi.object({
    email: Joi.string().email({ tlds: { allow: false } }).required(),
  }),
  resetPassword: Joi.object({
    token: Joi.string().min(16).required(),
    newPassword: signupPassword.required(),
  }),
  analyzeUrl: Joi.object({
    url: Joi.string().uri({ scheme: ["http", "https"] }).required(),
    pageHtml: Joi.string().max(50000).allow(""),
    scriptContent: Joi.string().max(50000).allow(""),
  }),
  analyzeEmail: Joi.object({
    subject: Joi.string().max(500).required(),
    body: Joi.string().max(50000).required(),
  }),
  analyzeWebpage: Joi.object({
    text: Joi.string().max(40000).required(),
    sourceUrl: Joi.string().uri({ scheme: ["http", "https"] }).optional(),
  }),
  pollingQuery: Joi.object({
    since: Joi.date().iso().optional(),
  }),
  incidentsQuery: Joi.object({
    type: Joi.string().optional(),
    startDate: Joi.date().iso().optional(),
    endDate: Joi.date().iso().optional(),
    minScore: Joi.number().min(0).max(100).optional(),
    maxScore: Joi.number().min(0).max(100).optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    sortBy: Joi.string().valid("createdAt", "score", "type", "status").default("createdAt"),
    order: Joi.string().valid("asc", "desc").default("desc"),
  }),
  adminUsersQuery: Joi.object({
    role: Joi.string().valid("admin", "analyst", "ml_engineer").optional(),
    search: Joi.string().max(200).optional(),
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
  }),
  adminUserRole: Joi.object({
    role: Joi.string().valid("admin", "analyst", "ml_engineer").required(),
  }),
  adminPolicyUpdate: Joi.object({
    autoBlockThreshold: Joi.number().min(0).max(100),
    autoQuarantine: Joi.boolean(),
    requireMfaForAdmins: Joi.boolean(),
    notifyOnCritical: Joi.boolean(),
    maxAlertsPerMinute: Joi.number().integer().min(1).max(1000),
  }).min(1),
  mlFeedback: Joi.object({
    incidentId: Joi.string().hex().length(24).required(),
    groundTruthStatus: Joi.string().valid("safe", "suspicious", "phishing").required(),
    notes: Joi.string().max(2000).allow(""),
  }),
  mlMetricsQuery: Joi.object({
    days: Joi.number().integer().min(1).max(365).default(14),
  }),
  reportLink: Joi.object({
    url: Joi.string().uri({ scheme: ["http", "https"] }).required(),
    description: Joi.string().max(2000).allow(""),
  }),
  reportGenerate: Joi.object({
    startDate: Joi.date().iso().required(),
    endDate: Joi.date().iso().required(),
    type: Joi.string().valid("phishing", "suspicious", "safe").required(),
  }),
};
