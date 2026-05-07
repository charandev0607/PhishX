import { Router } from "express";
import { forgotPassword, forgotPasswordOtp, login, logout, refresh, resetPassword, resetPasswordOtp, signup, verifyOtp } from "../controllers/auth.controller.js";
import { validate, schemas } from "../middleware/validate.middleware.js";

const router = Router();

router.post("/signup", validate(schemas.signup), signup);
router.post("/login", validate(schemas.login), login);
router.post("/refresh", validate(schemas.refresh), refresh);
router.post("/logout", validate(schemas.logout), logout);
router.post("/forgot-password", validate(schemas.forgotPassword), forgotPassword);
router.post("/reset-password", validate(schemas.resetPassword), resetPassword);
router.post("/forgot-password-otp", validate(schemas.forgotPassword), forgotPasswordOtp);
router.post("/verify-otp", validate(schemas.verifyOtp), verifyOtp);
router.post("/reset-password-otp", validate(schemas.resetPasswordOtp), resetPasswordOtp);

export default router;
