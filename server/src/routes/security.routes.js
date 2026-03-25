import { Router } from "express";

const router = Router();

router.get("/csrf-token", (_req, res) => {
  return res.status(200).json({
    success: true,
    message: "CSRF token fetched",
    data: {
      csrfToken: process.env.CSRF_SHARED_TOKEN || null,
      enabled: process.env.CSRF_ENABLED === "true",
    },
  });
});

export default router;
