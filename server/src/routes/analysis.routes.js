import { Router } from "express";
import {
	analyzeEmailController,
	analyzeUrlController,
	pollingEventsController,
	systemHealthController,
} from "../controllers/analysis.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { validate, schemas } from "../middleware/validate.middleware.js";

const router = Router();

router.post("/url-analyze", authenticate, authorize("admin", "analyst"), validate(schemas.analyzeUrl), analyzeUrlController);
router.post("/email-analyze", authenticate, authorize("admin", "analyst"), validate(schemas.analyzeEmail), analyzeEmailController);
router.get("/events/poll", authenticate, authorize("admin", "analyst"), validate(schemas.pollingQuery, "query"), pollingEventsController);
router.get("/system/health", systemHealthController);

export default router;
