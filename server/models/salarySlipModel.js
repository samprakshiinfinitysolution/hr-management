
import mongoose from "mongoose";

const salarySlipSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
    },

    month: { type: Number, required: true }, // 1 - 12
    year: { type: Number, required: true },

    // Base Salary from employee table
    baseSalary: { type: Number, required: true },

    // Final net salary after deductions
    netSalary: { type: Number, required: true },

    // OLD field for compatibility
    deduction: { type: Number, default: 0 },

    remarks: { type: String },

    sentAt: { type: Date, default: Date.now },

    // =======================
    //     EARNINGS SECTION
    // =======================
    earnings: {
      base: Number,
      hra: Number,
      conveyance: Number,
      childrenAllowance: Number,
      fixedAllowance: Number,
      grossSalary: Number,
    },
    deductions: {
      pf: Number,
      professionalTax: Number,
      lateDeduction: Number,
      halfDayDeduction: Number,
      absentDeduction: Number,
      total: Number
    },
    attendance: {
      present: Number,
      absent: Number,
      halfDay: Number,
      late: Number,
      earlyCheckout: Number
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("SalarySlip", salarySlipSchema);
