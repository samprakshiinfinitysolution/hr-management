// routes/salaryRuleRoutes.js
import express from "express";
import { getSalaryRule, saveSalaryRule, deleteSalaryRule } from "../controllers/salaryRuleController.js";
import { verifyToken, allowAdminHrManager } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", verifyToken, allowAdminHrManager, getSalaryRule);
router.post("/", verifyToken, allowAdminHrManager, saveSalaryRule);
router.delete("/", verifyToken, allowAdminHrManager, deleteSalaryRule);

export default router;
