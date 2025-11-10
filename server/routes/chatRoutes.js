import express from "express";
import { getMessages, sendMessage, deleteMessage, deleteChat } from "../controllers/chatController.js";
import upload from "../middleware/uploadCloudinary.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/:user1/:user2", verifyToken, getMessages);
router.post("/", verifyToken, sendMessage);
router.delete("/message/:messageId", verifyToken, deleteMessage);
router.delete("/:user1/:user2", verifyToken, deleteChat);

// upload route
router.post("/upload", verifyToken, upload.single("file"), async (req, res) => { "" });

export default router;
