
import express from "express";
import { verifyToken, allowAdminHrManager, employeeOnly, adminOnly } from "../middleware/authMiddleware.js";
import {
  checkIn,
  checkOut,
  getMyAttendance,
  getAllAttendance,
  getAttendanceSummary,
  getAttendance,
  adminCheckIn,
  adminCheckOut,
  getSubAdminAttendance,
} from "../controllers/attendanceController.js";

const router = express.Router();

// Employee
router.post("/checkin", verifyToken, employeeOnly, checkIn);
router.post("/checkout", verifyToken, employeeOnly, checkOut);
router.get("/me", verifyToken, employeeOnly, getMyAttendance);

// Admin/HR/Manager
router.get("/all", verifyToken, allowAdminHrManager, getAllAttendance);
router.get("/summary", verifyToken, allowAdminHrManager, getAttendanceSummary);
router.get("/", verifyToken, allowAdminHrManager, getAttendance);

// New Routes for Admin/HR/Manager Attendance
router.post("/admin/checkin", verifyToken, allowAdminHrManager, adminCheckIn);
router.post("/admin/checkout", verifyToken, allowAdminHrManager, adminCheckOut);
router.get("/admin/me", verifyToken, allowAdminHrManager, getMyAttendance); // For HR/Manager to get their own attendance
router.get("/admin/all", verifyToken, adminOnly, getSubAdminAttendance);

export default router;