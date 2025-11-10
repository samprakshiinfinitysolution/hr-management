
import express from "express";
import {
  getAllLeaves,
  updateLeave,
  deleteLeave,
  createLeave,
  getLeaveSummary,
  getMyLeaves,
} from "../controllers/leaveController.js";
import { verifyToken, allowAdminHrManager, employeeOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// Employee
router.post("/", verifyToken, employeeOnly, createLeave);
router.get("/me", verifyToken, employeeOnly, getMyLeaves);
router.get("/summary", verifyToken, employeeOnly, getLeaveSummary);

// Admin/HR/Manager
router.get("/", verifyToken, allowAdminHrManager, getAllLeaves);
router.put("/:id", verifyToken, allowAdminHrManager, updateLeave);
router.delete("/:id", verifyToken, allowAdminHrManager, deleteLeave);

export default router;