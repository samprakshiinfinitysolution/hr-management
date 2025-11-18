import express from "express";
import { getMessages, sendMessage, deleteMessage, deleteChat } from "../controllers/chatController.js";
import uploadMiddleware from "../middleware/uploadCloudinary.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/:user1/:user2", verifyToken, getMessages);
router.post("/", verifyToken, sendMessage);
router.delete("/message/:messageId", verifyToken, deleteMessage);
router.delete("/:user1/:user2", verifyToken, deleteChat);

router.post(
  "/upload",
  verifyToken,
  uploadMiddleware,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
        });
      }

      // Cloudinary URL (middleware sets this)
      const fileUrl = req.file.path;  

      // Original file name
      const originalName = req.file.originalname;

      // File type detect
      const fileType = req.file.mimetype.startsWith("image")
        ? "image"
        : "file";

      return res.status(200).json({
        success: true,
        fileUrl,
        type: fileType,
        originalName,   // Send REAL name
      });
    } catch (err) {
      console.error("Chat Upload Error:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to upload file",
        error: err.message,
      });
    }
  }
);



export default router;

