import express from "express";
import uploadMiddleware from "../middleware/uploadCloudinary.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post(
  "/profile",
  verifyToken,
  uploadMiddleware,  
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
      }
      return res.status(200).json({
        success: true,
        fileUrl: req.file.path,
      });

    } catch (err) {
      console.error("❌ Profile upload error:", err);
      return res.status(500).json({
        success: false,
        message: "Failed to upload file",
        error: err.message,
      });
    }
  }
);

export default router;
