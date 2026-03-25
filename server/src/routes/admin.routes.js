import { Router } from "express";
import {
  getPolicyController,
  getUsersController,
  updatePolicyController,
  updateUserRoleController,
} from "../controllers/admin.controller.js";
import { authenticate, authorize } from "../middleware/auth.middleware.js";
import { validate, schemas } from "../middleware/validate.middleware.js";

const router = Router();

router.get("/users", authenticate, authorize("admin"), validate(schemas.adminUsersQuery, "query"), getUsersController);
router.patch(
  "/users/:userId/role",
  authenticate,
  authorize("admin"),
  validate(schemas.adminUserRole),
  updateUserRoleController
);
router.get("/policies", authenticate, authorize("admin"), getPolicyController);
router.put("/policies", authenticate, authorize("admin"), validate(schemas.adminPolicyUpdate), updatePolicyController);

export default router;
