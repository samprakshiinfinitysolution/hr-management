// import mongoose from "mongoose";

// const chatSchema = new mongoose.Schema(
//   {
//     senderId: { 
//       type: mongoose.Schema.Types.ObjectId, 
//       ref: "User", 
//       required: true 
//     },
//     receiverId: { 
//       type: mongoose.Schema.Types.ObjectId, 
//       ref: "User", 
//       required: true 
//     },
    
//     // For text or file message content
//     message: { type: String },

//     // To identify message type (helps frontend render properly)
//     type: { 
//       type: String, 
//       enum: ["text", "image", "file"], 
//       default: "text" 
//     },

//     // Optional: store file metadata (for downloads or previews)
//     fileInfo: {
//       url: String,
//       originalname: String,
//       mimetype: String,
//       size: Number,
//     },

//     // Optional: read/unread tracking
//     isRead: { type: Boolean, default: false },
//   },
//   { timestamps: true }
// );

// // ✅ Index for faster lookup & sorting
// chatSchema.index({ senderId: 1, receiverId: 1, createdAt: 1 });

// export default mongoose.model("Chat", chatSchema);


import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    receiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ["text", "image", "file"], default: "text" },
    room: { type: String, required: true }, // ✅ added for socket room tracking
    fileInfo: {
      url: String,
      originalname: String,
      mimetype: String,
      size: Number,
    },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

chatSchema.index({ senderId: 1, receiverId: 1, createdAt: 1 });

export default mongoose.model("Chat", chatSchema);
