
import express from "express";
import { 
  createTask, 
  getAdminTasks, 
  getEmployeeTasks, 
  updateTaskStatus, 
  getTaskNotifications, 
  markNotificationAsRead,
  deleteTask
} from "../controllers/taskController.js";
import { verifyToken, allowAdminHrManager } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", verifyToken, allowAdminHrManager, createTask); // ALLOW HR/Manager
router.get("/admin", verifyToken, allowAdminHrManager, getAdminTasks);
router.get("/employee", verifyToken, getEmployeeTasks);
router.put("/:id/status", verifyToken, updateTaskStatus);
router.get("/notifications", verifyToken, getTaskNotifications);
router.put("/notifications/:id/read", verifyToken, markNotificationAsRead);
router.delete("/:id", verifyToken, allowAdminHrManager, deleteTask);

export default router;