

// import multer from "multer";
// import { CloudinaryStorage } from "multer-storage-cloudinary";
// import cloudinary from "../config/cloudinary.js";

// const storage = new CloudinaryStorage({
//   cloudinary,
//   params: {
//     folder: "hr_management/profile_images",
//     allowed_formats: ["jpg", "jpeg", "png", "webp"],
//     transformation: [{ width: 800, height: 800, crop: "limit" }],
//   },
// });

// const upload = multer({ storage });
// // 
// export default upload;

import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

// ✅ Create Cloudinary Storage for chat + general uploads
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    // Detect the folder dynamically if you want (optional)
    const folder = "hr_management/chat_uploads";

    // Allow images, docs, pdfs — Cloudinary auto-detects resource type
    const allowedFormats = ["jpg", "jpeg", "png", "webp", "pdf", "docx", "xlsx"];

    // Optional: apply transformations only to images
    const isImage = file.mimetype.startsWith("image/");
    const transformation = isImage
      ? [{ width: 1000, height: 1000, crop: "limit" }]
      : [];

    return {
      folder,
      resource_type: "auto", // auto-detect (image, raw, video)
      allowed_formats: allowedFormats,
      transformation,
    };
  },
});

// ✅ Multer upload middleware
const upload = multer({ storage });

export default upload;
