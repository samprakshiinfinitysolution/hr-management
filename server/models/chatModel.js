import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    senderId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    receiverId: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },

    // message body (text or file URL)
    message: { type: String },

    // text / image / file
    type: { 
      type: String, 
      enum: ["text", "image", "file"], 
      default: "text" 
    },

    // file metadata (optional)
    fileInfo: {
      url: String,
      originalname: String,
      mimetype: String,
      size: Number,
    },

    // ✅ Message delivery states
    isDelivered: { type: Boolean, default: false }, // single tick
    deliveredAt: { type: Date },

    isRead: { type: Boolean, default: false },      // double tick
    readAt: { type: Date },
  },
  { timestamps: true }
);

// index for efficient queries
chatSchema.index({ senderId: 1, receiverId: 1, createdAt: 1 });

export default mongoose.model("Chat", chatSchema);
