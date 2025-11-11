
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
<<<<<<< HEAD
=======
  adminLunchStart,
  adminLunchEnd,
  lunchStart,
  lunchEnd,
>>>>>>> origin/main
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

<<<<<<< HEAD
=======
// Employee Lunch
router.post("/lunch-start", verifyToken, employeeOnly, lunchStart);
router.post("/lunch-end", verifyToken, employeeOnly, lunchEnd);

// Admin/HR/Manager Lunch
router.post("/admin/lunch-start", verifyToken, allowAdminHrManager, adminLunchStart);
router.post("/admin/lunch-end", verifyToken, allowAdminHrManager, adminLunchEnd);

>>>>>>> origin/main
export default router;