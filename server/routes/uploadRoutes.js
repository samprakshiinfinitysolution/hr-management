
// import express from "express";
// import upload from "../middleware/uploadCloudinary.js";
// import { verifyToken } from "../middleware/authMiddleware.js";

// const router = express.Router();

// router.post("/profile", verifyToken, upload.single("profileImage"), async (req, res) => {
//   try {
//     if (!req.file) return res.status(400).json({ message: "No file uploaded" });

//     // Multer + Cloudinary returns the file URL in req.file.path
//     const fileUrl = req.file.path;

//     // Optional: Save this URL to user's profile in DB
//     // await User.findByIdAndUpdate(req.user._id, { profileImage: fileUrl });

//     return res.status(200).json({ message: "Uploaded successfully", fileUrl });
//   } catch (err) {
//     console.error("Upload route error:", err);
//     return res.status(500).json({ message: "Internal Server Error" });
//   }
// });

// export default router;
import express from "express";
import upload from "../middleware/uploadCloudinary.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @route   POST /api/chat/upload
 * @desc    Upload chat images/documents to Cloudinary
 * @access  Private
 */
router.post("/upload", verifyToken, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    // Cloudinary returns file URL in req.file.path
    const fileUrl = req.file.path;

    // You can also include metadata (sender, receiver, etc.) if needed
    return res.status(200).json({
      success: true,
      message: "File uploaded successfully",
      file: {
        url: fileUrl,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      },
    });
  } catch (err) {
    console.error("❌ Chat upload error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to upload file",
      error: err.message,
    });
  }
});

export default router;
