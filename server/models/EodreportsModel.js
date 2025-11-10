import mongoose from "mongoose";

const eodReportSchema = new mongoose.Schema(
  {
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },
    name: { type: String, required: true },
    project: { type: String, required: true },
    date: { type: Date, required: true },
    reportingTime: { type: String },
    eodTime: { type: String },
    summary: { type: String },

    rows: [
      {
        time: String,
        task: String,
        description: String,
        status: String,
        remarks: String,
      },
    ],
  },
  { timestamps: true }
);

const EodReport = mongoose.model("EodReport", eodReportSchema);
export default EodReport;
