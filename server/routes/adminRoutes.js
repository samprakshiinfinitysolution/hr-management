import express from "express";
import {
  verifyToken,
  adminOnly,
  allowAdminHrManager,
} from "../middleware/authMiddleware.js";

import {
  registerAdmin,
  loginAdmin,
  createEmployee,
  getAdminDashboardData,
  getBirthdays,
  sendBirthdayWish,
  getAdminProfile,
  getAllAdmins,
  approveEmployeeUpdate,
  rejectEmployeeUpdate,
  updateAdminProfile,
  createHRorManager,
  getAllSubAdmins,
  deleteSubAdmin,
  updateSubAdmin,
  getAdminSettings,
  updateAdminSettings,
} from "../controllers/adminController.js";

import {
  updateEmployee,
  deleteEmployee,
  getEmployeeById,
  getEmployees,
} from "../controllers/employeeController.js";

const router = express.Router();

// Public
router.post("/register", registerAdmin);
router.post("/login", loginAdmin);

// Protected (any logged-in user)
router.get("/me", verifyToken, getAdminProfile);
// Employee CRUD (admin/hr manager)
router.post("/employee", verifyToken, allowAdminHrManager, createEmployee);
router.get("/employee/:id", verifyToken, allowAdminHrManager, getEmployeeById);
router.put("/employee/:id", verifyToken, allowAdminHrManager, updateEmployee);
router.delete("/employee/:id", verifyToken, adminOnly, deleteEmployee);

// Approval
router.put("/employee/:id/approve", verifyToken, adminOnly, approveEmployeeUpdate);
router.put("/employee/:id/reject", verifyToken, adminOnly, rejectEmployeeUpdate);

// Dashboard + birthdays
router.get("/dashboard", verifyToken, allowAdminHrManager, getAdminDashboardData);
router.get("/birthdays", verifyToken, allowAdminHrManager, getBirthdays);
router.post("/birthday-wish/:employeeId", verifyToken, allowAdminHrManager, sendBirthdayWish);

// CHAT: employees list (for admins)
router.get("/employees", verifyToken, allowAdminHrManager, getEmployees);
// CHAT: admins for chat - allow filtering by createdBy (HR/manager should pass createdBy=<theirId>)
router.get("/getAdmins", verifyToken, allowAdminHrManager, getAllAdmins);
// Profile + settings
router.put("/profile", verifyToken, allowAdminHrManager, updateAdminProfile);
router.get("/profile", verifyToken, getAdminProfile);
router.get("/settings", verifyToken, adminOnly, getAdminSettings);
router.put("/settings", verifyToken, adminOnly, updateAdminSettings);

// Sub-admin (only main admin)
router.post("/create-hr-manager", verifyToken, adminOnly, createHRorManager);
router.get("/sub-admins", verifyToken, adminOnly, getAllSubAdmins);
router.delete("/sub-admin/:id", verifyToken, adminOnly, deleteSubAdmin);
router.put("/sub-admin/:id", verifyToken, adminOnly, updateSubAdmin);

export default router;
