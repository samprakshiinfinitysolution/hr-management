// import mongoose from "mongoose";

// const eodReportSchema = new mongoose.Schema(
//   {
//     employee: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "Employee",
//       required: true,
//     },
//     name: { type: String, required: true },
//     project: { type: String, required: true },
//     date: { type: Date, required: true },
//     reportingTime: { type: String },
//     eodTime: { type: String },
//     summary: { type: String },
//     nextDayPlan: {
//       type: String,
//       default: "",
//     },

//     rows: [
//       {
//         time: String,
//         task: String,
//         description: String,
//         status: String,
//         remarks: String,
//       },
//     ],
//   },
//   { timestamps: true }
// );

// const EodReport = mongoose.model("EodReport", eodReportSchema);
// export default EodReport;


// models/EodreportsModel.js
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

    reportingTime: String,
    eodTime: String,
    summary: String,

    nextDayPlan: {
      type: String,
      default: "",
    },

    // Dynamic rows
    // rows: [
    //   {
    //     time: String,
    //     task: String,
    //     description: String,
    //     status: String,
    //     remarks: String,
    //   },
    // ],
    rows: [mongoose.Schema.Types.Mixed],

    // Optional columns field (keeps what template columns were when saved)
    columns: [String],
  },
  { timestamps: true }
);

export default mongoose.model("EodReport", eodReportSchema);
