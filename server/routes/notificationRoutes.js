import express from "express";
import {
  getNotifications,
  createNotification,
  markAllAsRead,
  deleteNotification,
} from "../controllers/notificationController.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", verifyToken, getNotifications); // Added verifyToken
router.post("/", verifyToken, createNotification); // Added verifyToken
router.put("/mark-read", verifyToken, markAllAsRead); // Added verifyToken
router.delete("/:id", verifyToken, deleteNotification); // Route to delete a notification


export default router;