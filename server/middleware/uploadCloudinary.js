
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    const fullPath = req.baseUrl + req.url;
    const isProfile = fullPath.includes("upload/profile");

    return {
      folder: isProfile
        ? "hr_management/profile_uploads"
        : "hr_management/chat_uploads",

      // ⭐ SAVE ORIGINAL FILE NAME IN CLOUDINARY
      public_id: file.originalname.split(".")[0],  

      resource_type: isProfile ? "image" : "raw",

      allowed_formats: isProfile
        ? ["jpg", "jpeg", "png", "webp"]
        : ["jpg", "jpeg", "png", "webp", "pdf", "docx", "xlsx"],

      transformation: isProfile
        ? [{ width: 1000, height: 1000, crop: "limit" }]
        : undefined,
    };
  },
});

export default function uploadMiddleware(req, res, next) {
  const fieldName = req.url.includes("/profile")
    ? "profileImage"
    : "file";

  multer({ storage }).single(fieldName)(req, res, (err) => {
    if (err) {
      console.error("❌ Upload Error:", err);
      return res.status(500).json({
        success: false,
        message: "Upload failed",
        error: err.message,
      });
    }

    // ⭐ RESTORE FILENAME SAFELY
    if (req.file) {
      req.file.originalname =
        req.file.originalname ||
        req.file.original_name ||
        req.file.filename;
    }

    next();
  });
}
