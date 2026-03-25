import { Router } from "express";
import { login, logout, refresh } from "../controllers/auth.controller.js";
import { validate, schemas } from "../middleware/validate.middleware.js";

const router = Router();

router.post("/login", validate(schemas.login), login);
router.post("/refresh", validate(schemas.refresh), refresh);
router.post("/logout", validate(schemas.refresh), logout);

export default router;
