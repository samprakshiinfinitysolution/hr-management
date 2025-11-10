

import mongoose from "mongoose";

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  assignedTo: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Employee", 
    required: true 
  },
  assignedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Admin", 
    required: true 
  },
  status: { 
    type: String, 
    enum: ["Pending", "In Progress", "Completed", "Rejected"], 
    default: "Pending" 
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },
  dueDate: { type: Date, required: true },
  priority: { 
    type: String, 
    enum: ["Low", "Medium", "High", "Urgent"], 
    default: "Medium" 
  },
  notes: { type: String },
  rejectionReason: { type: String },
  attachments: [{ type: String }],
  completionDate: { type: Date },
}, { timestamps: true });

taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ assignedBy: 1 });

export default mongoose.model("Task", taskSchema);