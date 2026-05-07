import { Router } from "express";
import { getIncidents } from "../controllers/incident.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { validate, schemas } from "../middleware/validate.middleware.js";

const router = Router();

router.get("/incidents", authenticate, authorize("admin", "end_user"), validate(schemas.incidentsQuery, "query"), getIncidents);

export default router;
