// models/EodTemplateModel.js
import mongoose from "mongoose";

const eodTemplateSchema = new mongoose.Schema(
  {
    columns: [String],
    rows: [
      {
        time: String,
        task: String,
        description: String,
        status: String,
        remarks: String,
      }
    ]
  },
  { timestamps: true }
);

export default mongoose.model("EodTemplate", eodTemplateSchema);
