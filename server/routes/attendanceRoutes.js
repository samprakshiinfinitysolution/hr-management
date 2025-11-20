
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
  adminBreakStart,
  adminBreakEnd,
  startBreak,
  endBreak,
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

// Employee Lunch
router.post("/start-break", verifyToken, employeeOnly, startBreak);
router.post("/end-break", verifyToken, employeeOnly, endBreak);

// Admin/HR/Manager Lunch
router.post("/admin/break-start", verifyToken, allowAdminHrManager, adminBreakStart);
router.post("/admin/break-end", verifyToken, allowAdminHrManager, adminBreakEnd);

export default router;