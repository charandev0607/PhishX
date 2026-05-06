import { Router } from "express";

const router = Router();

router.get("/csrf-token", (_req, res) => {
  return res.status(200).json({
    success: true,
    message: "CSRF token fetched",
    data: {
      enabled: process.env.CSRF_ENABLED === "true",
    },
  });
});

export default router;
