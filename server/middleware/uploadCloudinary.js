import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

// ⬇️ Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    const base = req?.baseUrl || "";
    const url = req?.url || "";
    const fullPath = base + url;

    const isProfile = fullPath.includes("upload/profile");

    return {
      folder: isProfile
        ? "hr_management/profile_uploads"
        : "hr_management/chat_uploads",

      resource_type: "auto",
      allowed_formats: ["jpg", "jpeg", "png", "webp"],
      transformation: [{ width: 1000, height: 1000, crop: "limit" }],
    };
  },
});

// ⬇️ Multer uploader
const uploader = multer({ storage }).single("profileImage");

// ⬇️ Export wrapper middleware
export default function uploadMiddleware(req, res, next) {
  uploader(req, res, (err) => {
    if (err) {
      console.error("❌ Multer Upload Error:", err);
      return res.status(500).json({
        success: false,
        message: "Upload failed",
        error: err.message,
      });
    }
    next();
  });
}
