
import mongoose from "mongoose";

const salarySlipSchema = new mongoose.Schema({
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
  month: { type: Number, required: true },
  year: { type: Number, required: true },
  baseSalary: { type: Number, required: true },
  deduction: { type: Number, default: 0 },
  netSalary: { type: Number, required: true },
  remarks: { type: String },
  sentAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },
});

export default mongoose.model("SalarySlip", salarySlipSchema);