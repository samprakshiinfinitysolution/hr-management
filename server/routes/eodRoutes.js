
// routes/eodRoutes.js
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
  updateEodReportByAdmin,
  getEodTemplate,
  updateEodTemplate,
} from "../controllers/eodController.js";

const router = express.Router();

// Employee submit & view own
router.post("/", verifyToken, employeeOnly, createEodReport);
router.get("/my", verifyToken, employeeOnly, getMyEodReports);

// 🔥 EMPLOYEE + ADMIN both can READ template
router.get("/eod-template", verifyToken, getEodTemplate);

// 🔥 Only ADMIN can modify template
router.put("/eod-template", verifyToken, allowAdminHrManager, updateEodTemplate);

// Admin, HR, Manager — view all, update
router.get("/admin", verifyToken, allowAdminHrManager, getAllEodReports);
router.put("/admin/:id", verifyToken, allowAdminHrManager, updateEodReportByAdmin);

export default router;
