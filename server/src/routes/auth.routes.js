import { Router } from "express";
import { forgotPassword, login, logout, refresh, resetPassword, signup } from "../controllers/auth.controller.js";
import { validate, schemas } from "../middleware/validate.middleware.js";

const router = Router();

router.post("/signup", validate(schemas.signup), signup);
router.post("/login", validate(schemas.login), login);
router.post("/refresh", validate(schemas.refresh), refresh);
router.post("/logout", validate(schemas.logout), logout);
router.post("/forgot-password", validate(schemas.forgotPassword), forgotPassword);
router.post("/reset-password", validate(schemas.resetPassword), resetPassword);

export default router;
