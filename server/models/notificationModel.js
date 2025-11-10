import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ["system", "employee", "alert", "task"], default: "system" },
    isRead: { type: Boolean, default: false },
    category: { type: String },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task" },
    userId: { type: mongoose.Schema.Types.ObjectId, refPath: "userModel" },
    userModel: { type: String, enum: ["Employee", "Admin"] },
    priority: { type: String, enum: ["Low", "Medium", "High", "Urgent"] },
    read: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },
  },
  { timestamps: true }
);

const Notification = mongoose.models.Notification || mongoose.model("Notification", notificationSchema);
export default Notification;