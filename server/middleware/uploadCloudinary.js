// import multer from "multer";
// import { CloudinaryStorage } from "multer-storage-cloudinary";
// import cloudinary from "../config/cloudinary.js";

// // ⬇️ Cloudinary storage
// // const storage = new CloudinaryStorage({
// //   cloudinary,
// //   params: (req, file) => {
// //     const base = req?.baseUrl || "";
// //     const url = req?.url || "";
// //     const fullPath = base + url;

// //     const isProfile = fullPath.includes("upload/profile");

// //     return {
// //       folder: isProfile
// //         ? "hr_management/profile_uploads"
// //         : "hr_management/chat_uploads",

// //       resource_type: "auto",
// //       allowed_formats: ["jpg", "jpeg", "png", "webp"],
// //       transformation: [{ width: 1000, height: 1000, crop: "limit" }],
// //     };
// //   },
// // });

// //new update chat file+image
// const storage = new CloudinaryStorage({
//   cloudinary,
//   params: (req, file) => {
//     const base = req?.baseUrl || "";
//     const url = req?.url || "";
//     const fullPath = base + url;

//     const isProfile = fullPath.includes("upload/profile");

//     // Allow all formats for chat
//     const chatFormats = ["jpg", "jpeg", "png", "webp", "gif", "pdf", "docx", "xlsx"];

//     return {
//       folder: isProfile
//         ? "hr_management/profile_uploads"
//         : "hr_management/chat_uploads",

//       resource_type: "auto",

//       // Profile → only images
//       // Chat → images + pdf + docs
//       allowed_formats: isProfile
//         ? ["jpg", "jpeg", "png", "webp"]
//         : chatFormats,

//       transformation: isProfile
//         ? [{ width: 1000, height: 1000, crop: "limit" }]
//         : undefined,
//     };
//   },
// });



// // ⬇️ Multer uploader
// const uploader = multer({ storage }).single("profileImage");

// // ⬇️ Export wrapper middleware
// export default function uploadMiddleware(req, res, next) {
//   uploader(req, res, (err) => {
//     if (err) {
//       console.error("❌ Multer Upload Error:", err);
//       return res.status(500).json({
//         success: false,
//         message: "Upload failed",
//         error: err.message,
//       });
//     }
//     next();
//   });
// }


import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "../config/cloudinary.js";

// const storage = new CloudinaryStorage({
//   cloudinary,
//   params: (req, file) => {
//     const fullPath = req.baseUrl + req.url;
//     const isProfile = fullPath.includes("/upload/profile");

//     return {
//       folder: isProfile
//         ? "hr_management/profile_uploads"
//         : "hr_management/chat_uploads",

//       resource_type: "auto",

//       allowed_formats: isProfile
//         ? ["jpg", "jpeg", "png", "webp"]
//         : ["jpg", "jpeg", "png", "webp", "pdf", "docx", "xlsx"],
//     };
//   },
// });
const storage = new CloudinaryStorage({
  cloudinary,
  params: (req, file) => {
    const fullPath = req.baseUrl + req.url;

    const isProfile = fullPath.includes("upload/profile");

    return {
      folder: isProfile
        ? "hr_management/profile_uploads"
        : "hr_management/chat_uploads",

      // RAW = pdf/docx/xlsx open होंगे
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
    next();
  });
}
