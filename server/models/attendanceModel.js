import mongoose from "mongoose";

const { Schema } = mongoose;

const attendanceSchema = new Schema(
  {
    user: {
      type: Schema.Types.ObjectId,
      // dynamic ref: will refer to "Employee" or "Admin" depending on userModel
      refPath: "userModel",
      required: true,
    },
    userModel: {
      type: String,
      enum: ["Employee", "Admin"],
      default: "Employee",
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "Admin" }, // who created / owns this record
    date: { type: Date, required: true }, // day-only (store as YYYY-MM-DD at 00:00)
    checkIn: { type: Date },
    checkOut: { type: Date },
    login: { type: String }, // HH:mm
    logout: { type: String }, // HH:mm
    totalHours: { type: Number },
    status: { type: String }, // Present / Late / Absent / etc.
    remark: { type: String },
  },
  { timestamps: true }
);

export default mongoose.model("Attendance", attendanceSchema);