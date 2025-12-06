// // import express from "express";
// // import { getMessages, sendMessage, deleteMessage, deleteChat,getAllAdminsForChat,getAllEmployeesForChat,allowAdminHrManager,employeeOnly} from "../controllers/chatController.js";
// // import uploadMiddleware from "../middleware/uploadCloudinary.js";
// // import { verifyToken } from "../middleware/authMiddleware.js";

// // const router = express.Router();

// // router.get("/:user1/:user2", verifyToken, getMessages);
// // router.post("/", verifyToken, sendMessage);
// // router.delete("/message/:messageId", verifyToken, deleteMessage);
// // router.delete("/:user1/:user2", verifyToken, deleteChat);
// // // adminRoutes (or where you defined)
// // router.get("/getAdmins", verifyToken, allowAdminHrManager, getAllAdminsForChat);
// // router.get("/employees", verifyToken, employeeOnly, getAllEmployeesForChat);
// // router.post(
// //   "/upload",
// //   verifyToken,
// //   uploadMiddleware,
// //   async (req, res) => {
// //     try {
// //       if (!req.file) {
// //         return res.status(400).json({
// //           success: false,
// //           message: "No file uploaded",
// //         });
// //       }

// //       // Cloudinary URL (middleware sets this)
// //       const fileUrl = req.file.path;  

// //       // Original file name
// //       const originalName = req.file.originalname;

// //       // File type detect
// //       const fileType = req.file.mimetype.startsWith("image")
// //         ? "image"
// //         : "file";

// //       return res.status(200).json({
// //         success: true,
// //         fileUrl,
// //         type: fileType,
// //         originalName,   // Send REAL name
// //       });
// //     } catch (err) {
// //       console.error("Chat Upload Error:", err);
// //       return res.status(500).json({
// //         success: false,
// //         message: "Failed to upload file",
// //         error: err.message,
// //       });
// //     }
// //   }
// // );



// // export default router;



// import express from "express";
// import { 
//   getMessages, 
//   sendMessage, 
//   deleteMessage, 
//   deleteChat,
//   getAllAdminsForChat,
//   getAllEmployeesForChat
// } from "../controllers/chatController.js";

// import uploadMiddleware from "../middleware/uploadCloudinary.js";
// import { verifyToken } from "../middleware/authMiddleware.js";

// const router = express.Router();

// // 🔥 NEW FIXED ROUTES (Employee & Admin lists)
// router.get("/admins-for-chat", verifyToken, getAllAdminsForChat);
// router.get("/employees-for-chat", verifyToken, getAllEmployeesForChat);

// // 🔥 Chat CRUD
// router.get("/:user1/:user2", verifyToken, getMessages);
// router.post("/", verifyToken, sendMessage);
// router.delete("/message/:messageId", verifyToken, deleteMessage);
// router.delete("/:user1/:user2", verifyToken, deleteChat);

// // 🔥 File Upload
// router.post(
//   "/upload",
//   verifyToken,
//   uploadMiddleware,
//   async (req, res) => {
//     try {
//       if (!req.file) {
//         return res.status(400).json({ success: false, message: "No file uploaded" });
//       }

//       const fileUrl = req.file.path;
//       const originalName = req.file.originalname;

//       const fileType = req.file.mimetype.startsWith("image") ? "image" : "file";

//       return res.status(200).json({
//         success: true,
//         fileUrl,
//         type: fileType,
//         originalName,
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

// export default router;

import express from "express";
import { 
  getMessages, 
  sendMessage, 
  deleteMessage, 
  deleteChat,
  getAllAdminsForChat,
  getAllEmployeesForChat,
  deleteMessagesForEveryone
} from "../controllers/chatController.js";

import uploadMiddleware from "../middleware/uploadCloudinary.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// -------------------------------
// 🔥 CHAT LIST APIs
// -------------------------------
router.get("/admins-for-chat", verifyToken, getAllAdminsForChat);
router.get("/employees-for-chat", verifyToken, getAllEmployeesForChat);

// -------------------------------
// 🔥 CHAT CRUD APIs
// -------------------------------
router.get("/:user1/:user2", verifyToken, getMessages);
router.post("/", verifyToken, sendMessage);

// ⭐ WHATSAPP STYLE DELETE (only remove from visibleTo)
router.delete("/message/:messageId", verifyToken, deleteMessage);

// Middleware to attach socket.io instance
const attachIo = (req, res, next) => {
  req.io = req.app.get("io");
  next();
};
router.post(
  "/messages/delete-for-everyone",
  verifyToken,
  attachIo,
  deleteMessagesForEveryone
);

// ⭐ Chat clear (delete for user only)
router.delete("/:user1/:user2", verifyToken, deleteChat);

// -------------------------------
// 🔥 FILE UPLOAD API
// -------------------------------
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
      const originalName = req.file.originalname;
      const fileType = req.file.mimetype.startsWith("image") ? "image" : "file";
 
      return res.status(200).json({
        success: true,
        fileUrl,
        type: fileType,
        originalName,
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
