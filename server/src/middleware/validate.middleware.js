import Joi from "joi";

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
  login: Joi.object({
    email: Joi.string().email({ tlds: { allow: false } }).required(),
    password: Joi.string().min(8).required(),
  }),
  refresh: Joi.object({
    refreshToken: Joi.string().required(),
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
  mlFeedback: Joi.object({
    incidentId: Joi.string().required(),
    groundTruthStatus: Joi.string().valid("safe", "suspicious", "phishing").required(),
    notes: Joi.string().max(2000).allow(""),
  }),
};
