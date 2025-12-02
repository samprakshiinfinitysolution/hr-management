
import express from "express";
import { 
  calculateSalary, 
  sendSalarySlip, 
  getSalarySlips, 
  getEmployeeSalarySlips,
  deleteSalarySlip
} from "../controllers/salaryController.js";
import { verifyToken, allowAdminHrManager } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/calculate", verifyToken, allowAdminHrManager, calculateSalary);
router.post("/send", verifyToken, allowAdminHrManager, sendSalarySlip);
router.get("/", verifyToken, allowAdminHrManager, getSalarySlips);
router.get("/my-slips", verifyToken, getEmployeeSalarySlips);

// 👇 ADD THIS ROUTE FOR DELETING A SLIP
router.delete("/:id", verifyToken, allowAdminHrManager, deleteSalarySlip);

export default router;