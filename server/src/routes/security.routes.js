import { Router } from "express";

const router = Router();

router.get("/csrf-token", (_req, res) => {
  const enabled = process.env.CSRF_ENABLED === "true";
  const csrfToken = enabled ? process.env.CSRF_SHARED_TOKEN || null : null;
  return res.status(200).json({
    success: true,
    message: "CSRF token fetched",
    data: {
      enabled,
      csrfToken,
    },
  });
});

export default router;
