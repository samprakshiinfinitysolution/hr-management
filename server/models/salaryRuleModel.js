// models/salaryRuleModel.js
import mongoose from "mongoose";

const salaryRuleSchema = new mongoose.Schema({
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },

  // payroll settings
  baseSalaryType: { type: String, enum: ["fixed", "daily", "hourly"], default: "fixed" },
  payDays: { type: Number, default: 30 }, // default pay days in month, admin can override

  // absent deduction
  absentDeductionType: { type: String, enum: ["full-day", "fixed"], default: "full-day" },
  absentFixedAmount: { type: Number, default: 0 },

  // percentages (applied to daily salary by default)
  halfDayDeduction: { type: Number, default: 50 }, // percent
  lateDeduction: { type: Number, default: 50 }, // percent (applies per late)
  earlyCheckoutDeduction: { type: Number, default: 50 }, // percent

  // allowances
  hraPercent: { type: Number, default: 25 }, // percent of basic
  conveyance: { type: Number, default: 2000 },
  childrenAllowance: { type: Number, default: 1000 },
  fixedAllowance: { type: Number, default: 1000 },
  paidLeaveType: { type: String, default: "paid" }, 
sickLeaveType: { type: String, default: "paid" }, 
casualLeaveType: { type: String, default: "paid" },
}, { timestamps: true });

export default mongoose.model("SalaryRule", salaryRuleSchema);
