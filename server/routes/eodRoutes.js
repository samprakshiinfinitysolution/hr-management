import express from "express";
import {
  verifyToken,
  employeeOnly,
  allowAdminHrManager,
} from "../middleware/authMiddleware.js";
import {
  createEodReport,
  getAllEodReports,
  getMyEodReports,
} from "../controllers/eodController.js";

const router = express.Router();

// Employee submit & view own
router.post("/", verifyToken, employeeOnly, createEodReport);
router.get("/my", verifyToken, employeeOnly, getMyEodReports);

// Admin, HR, Manager — view all
router.get("/admin", verifyToken, allowAdminHrManager, getAllEodReports);

export default router;
