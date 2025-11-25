// models/EodReportHistoryModel.js
import mongoose from "mongoose";

const historySchema = new mongoose.Schema({
  reportId: { type: mongoose.Schema.Types.ObjectId, ref: "EodReport", required: true },
  snapshot: { type: Object, required: true }, // full doc before change
  reason: { type: String, default: "admin-update" },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

export default mongoose.model("EodReportHistory", historySchema);
