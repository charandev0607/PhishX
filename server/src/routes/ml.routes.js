import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { validate, schemas } from "../middleware/validate.middleware.js";
import { mlMetricsController, submitMlFeedbackController } from "../controllers/ml.controller.js";

const router = Router();

router.post("/ml/feedback", authenticate, authorize("admin", "analyst"), validate(schemas.mlFeedback), submitMlFeedbackController);
router.get("/ml/metrics", authenticate, authorize("admin", "analyst"), mlMetricsController);

export default router;

