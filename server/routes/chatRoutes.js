import express from "express";
import { getMessages, sendMessage, deleteMessage, deleteChat } from "../controllers/chatController.js";
import uploadMiddleware from "../middleware/uploadCloudinary.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/:user1/:user2", verifyToken, getMessages);
router.post("/", verifyToken, sendMessage);
router.delete("/message/:messageId", verifyToken, deleteMessage);
router.delete("/:user1/:user2", verifyToken, deleteChat);

// upload route

// router.post(
//   "/upload",
//   verifyToken,
//   uploadMiddleware,
//   async (req, res) => {
//     try {
//       if (!req.file) {
//         return res.status(400).json({ success: false, message: "No file uploaded" });
//       }

//       return res.status(200).json({
//         success: true,
//         fileUrl: req.file.path,
//       });
//     } catch (err) {
//       console.error("Chat Upload Error:", err);
//       return res.status(500).json({
//         success: false,
//         message: "Failed to upload file",
//         error: err.message,
//       });
//     }
//   }
// );

router.post(
  "/upload",
  verifyToken,
  uploadMiddleware,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
      }

      const fileUrl = req.file.path;
      const originalName = req.file.originalname; // 🔥 REAL FILE NAME (IMPORTANT)

      const fileType = req.file.mimetype.startsWith("image")
        ? "image"
        : "file";

      return res.status(200).json({
        success: true,
        fileUrl,
        originalName,   // 🔥 SEND REAL FILE NAME
        type: fileType, // image / file
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

