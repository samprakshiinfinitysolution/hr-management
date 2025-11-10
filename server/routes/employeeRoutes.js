import express from "express";
import {
  getProfile,
  updateProfile,
  deleteProfileImg,
  loginEmployee,
  getEmployeeProfile,
  getEmployeeDashboard,
  changeEmployeePassword,
  getAllAdminsForChat,
  getAllEmployeesForChat,
  getAllEmployeesPublic,
} from "../controllers/employeeController.js";

import { verifyToken, employeeOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// 🔹 Public
router.post("/login", loginEmployee);

// 🔹 Protected (Employee features)
router.get("/dashboard", verifyToken, employeeOnly, getEmployeeDashboard);
router.get("/profile", verifyToken, employeeOnly, getProfile);
router.put("/profile", verifyToken, employeeOnly, updateProfile);
router.put("/profile/change-password", verifyToken, employeeOnly, changeEmployeePassword);
router.delete("/profile-img", verifyToken, employeeOnly, deleteProfileImg);
router.get("/profile/:id", verifyToken, employeeOnly, getEmployeeProfile);

// 🔹 Chat endpoints
// Chat endpoints (employee can view admins & employees for chat)
router.get("/admins", verifyToken, employeeOnly, getAllAdminsForChat);
router.get("/employees", verifyToken, employeeOnly, getAllEmployeesForChat);
export default router;
