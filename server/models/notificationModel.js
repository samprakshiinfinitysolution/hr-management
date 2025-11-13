import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },

    type: {
      type: String,
      enum: ["system", "employee", "alert", "task", "birthday"],
      default: "system",
    },

    isRead: { type: Boolean, default: false },
    read: { type: Boolean, default: false },

    category: { type: String },

    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
      default: "Low",
    },

    taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },

    // Notification receiver (employee or admin)
    userId: { type: mongoose.Schema.Types.ObjectId, required: true },

    // Who created this notification? (Admin always)
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", default: null },
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);
