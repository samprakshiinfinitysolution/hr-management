
import express from "express";
import { 
  calculateSalary, 
  sendSalarySlip, 
  getSalarySlips, 
  getEmployeeSalarySlips 
} from "../controllers/salaryController.js";
import { verifyToken, allowAdminHrManager, employeeOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/calculate", verifyToken, allowAdminHrManager, calculateSalary);
router.post("/send", verifyToken, allowAdminHrManager, sendSalarySlip);
router.get("/", verifyToken, allowAdminHrManager, getSalarySlips);
router.get("/my-slips", verifyToken, getEmployeeSalarySlips);

export default router;