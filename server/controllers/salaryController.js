
import SalarySlip from "../models/salarySlipModel.js";
import Employee from "../models/employeeModel.js";
import Notification from "../models/notificationModel.js";
import Attendance from "../models/attendanceModel.js";
import Admin from "../models/adminModel.js";
import SalaryRule from "../models/salaryRuleModel.js";
import dayjs from "dayjs";
import mongoose from "mongoose";

export const calculateSalary = async (req, res) => {
  try {
    const { employeeId, month, year } = req.body;
    const { id: userId, role, isMainAdmin } = req.user;

    // ---------------- Authorization ----------------
    let empQuery;
    if (isMainAdmin) {
      const subAdmins = await Admin.find({ createdBy: userId }).select("_id");
      const adminIds = [userId, ...subAdmins.map(a => a._id)];
      empQuery = { _id: employeeId, createdBy: { $in: adminIds } };
    } else if (["hr", "manager"].includes(role)) {
      const mainAdminId = req.user.createdBy;
      const subAdmins = await Admin.find({ createdBy: mainAdminId }).select("_id");
      const adminIds = [mainAdminId, userId, ...subAdmins.map(a => a._id)];
      empQuery = { _id: employeeId, createdBy: { $in: adminIds } };
    } else {
      empQuery = { _id: employeeId, createdBy: userId };
    }

    const employee = await Employee.findOne(empQuery);
    if (!employee)
      return res.status(404).json({ message: "Employee not authorised" });

    // ---------------- Date Range ----------------
    const baseSalary = employee.salary;
    const startDate = dayjs(`${year}-${month}-01`).startOf("month");
    const endDate = dayjs(startDate).endOf("month");

    const attendance = await Attendance.find({
      user: employeeId,
      date: { $gte: startDate.toDate(), $lte: endDate.toDate() },
    });

    // ---------------- Read Salary Rules ----------------
    const r = await SalaryRule.findOne({ createdBy: employee.createdBy });

    const payDays = r?.payDays || endDate.diff(startDate, "day") + 1;
    const dailySalary = baseSalary / payDays;

    // Leave types
    const paidLeaveRule = r?.paidLeaveType || "paid";
    const sickLeaveRule = r?.sickLeaveType || "paid";
    const casualLeaveRule = r?.casualLeaveType || "paid";

    // ---------------- Monthly Attendance Calculation ----------------

    let presentDays = 0;
    let absentDays = 0;
    let halfDays = 0;
    let lateDays = 0;
    let earlyCheckout = 0;

    // Map for fast lookup
    const attMap = {};
    attendance.forEach(a => {
      attMap[dayjs(a.date).format("YYYY-MM-DD")] = a.status;
    });

    const totalDays = endDate.diff(startDate, "day") + 1;

    for (let i = 0; i < totalDays; i++) {
      const date = startDate.add(i, "day");
      const dateKey = date.format("YYYY-MM-DD");
      const dayOfWeek = date.day(); // 0 = Sunday

      const status = attMap[dateKey];

      // -------- Sunday Skip --------
      if (dayOfWeek === 0) continue;

      // -------- No attendance -> Absent --------
      if (!status) {
        absentDays++;
        continue;
      }

      // -------- Paid Leave --------
      if (status === "Paid Leave") {
        if (paidLeaveRule === "paid") presentDays++;
        else if (paidLeaveRule === "unpaid") absentDays++;
        else if (paidLeaveRule === "half-paid") {
          halfDays++;
          presentDays += 0.5;
        }
        continue;
      }

      // -------- Sick Leave --------
      if (status === "Sick Leave") {
        if (sickLeaveRule === "paid") presentDays++;
        else if (sickLeaveRule === "unpaid") absentDays++;
        else if (sickLeaveRule === "half-paid") {
          halfDays++;
          presentDays += 0.5;
        }
        continue;
      }

      // -------- Casual Leave --------
      if (status === "Casual Leave") {
        if (casualLeaveRule === "paid") presentDays++;
        else if (casualLeaveRule === "unpaid") absentDays++;
        else if (casualLeaveRule === "half-paid") {
          halfDays++;
          presentDays += 0.5;
        }
        continue;
      }

      // -------- Half Day --------
      if (status === "Half Day") {
        halfDays++;
        presentDays += 0.5;
        continue;
      }

      // -------- Absent --------
      if (status === "Absent" || status === "Unpaid Leave") {
        absentDays++;
        continue;
      }

      // -------- Late --------
      if (status === "Late" || status === "Late Login") {
        lateDays++;
        presentDays++;
        continue;
      }

      // -------- Early Checkout --------
      if (status === "Early Checkout") {
        earlyCheckout++;
        presentDays++;
        continue;
      }

      // -------- Present --------
      if (status === "Present") {
        presentDays++;
      }
    }

    // ---------------- Deductions ----------------
    const absentDeduction =
      r?.absentDeductionType === "fixed"
        ? absentDays * (r?.absentFixedAmount ?? 0)
        : absentDays * dailySalary;

    const halfDayDeduction =
      halfDays * (dailySalary * ((r?.halfDayDeduction ?? 50) / 100));

    const lateDeduction =
      lateDays * (dailySalary * ((r?.lateDeduction ?? 50) / 100));

    const earlyCheckoutDeduction =
      earlyCheckout * (dailySalary * ((r?.earlyCheckoutDeduction ?? 50) / 100));

    const totalDeduction = Math.round(
      absentDeduction +
      halfDayDeduction +
      lateDeduction +
      earlyCheckoutDeduction
    );

    // ---------------- Allowances ----------------
    const hra = Math.round(baseSalary * ((r?.hraPercent ?? 25) / 100));
    const conveyance = r?.conveyance ?? 2000;
    const childrenAllowance = r?.childrenAllowance ?? 1000;
    const fixedAllowance = r?.fixedAllowance ?? 1000;

    const totalAllowances =
      hra + conveyance + childrenAllowance + fixedAllowance;

    const grossSalary = baseSalary + totalAllowances;
    const netSalary = grossSalary - totalDeduction;

    return res.json({
      baseSalary,
      presentDays,
      absentDays,
      halfDays,
      lateDays,
      earlyCheckout,
      dailySalary,

      // Deductions
      absentDeduction,
      halfDayDeduction,
      lateDeduction,
      earlyCheckoutDeduction,
      deduction: totalDeduction,

      // Allowances
      hra,
      conveyance,
      childrenAllowance,
      fixedAllowance,
      totalAllowances,

      grossSalary,
      netSalary,

      remarks: `Present: ${presentDays}, Absent: ${absentDays}, Half Day: ${halfDays}, Late: ${lateDays}, Early Checkout: ${earlyCheckout}`

    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server Error" });
  }
};

// =============================================
// ✅ SEND SALARY SLIP  (uses dynamic net_salary)
// =============================================
export const sendSalarySlip = async (req, res) => {
  try {
    const {
      employeeId,
      month,
      year,
      baseSalary,
      remarks,
      attendance,
      earnings,
      deductions
    } = req.body;

    // Validation
    if (!employeeId || !month || !year) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // ------------------------
    // CORRECT GROSS SALARY
    // ------------------------
    const grossSalary =
      earnings?.grossSalary ??
      (
        baseSalary +
        (earnings?.hra ?? 0) +
        (earnings?.conveyance ?? 0) +
        (earnings?.childrenAllowance ?? 0) +
        (earnings?.fixedAllowance ?? 0)
      );

    // ------------------------
    // CORRECT TOTAL DEDUCTION
    // ------------------------
    const totalDeduction =
      deductions?.total ??
      (
        (deductions?.absentDeduction ?? 0) +
        (deductions?.halfDayDeduction ?? 0) +
        (deductions?.lateDeduction ?? 0) +
        (deductions?.earlyCheckoutDeduction ?? 0) +
        (deductions?.pf ?? 0) +
        (deductions?.professionalTax ?? 0)
      );

    // NET SALARY
    const netSalary = grossSalary - totalDeduction;

    // ------------------------------
    // SAVE FINAL SLIP TO DATABASE
    // ------------------------------
    const slip = new SalarySlip({
      employeeId,
      month,
      year,
      baseSalary,
      netSalary,
      deduction: totalDeduction,
      remarks,

      earnings: {
        base: earnings?.base ?? baseSalary,
        hra: earnings?.hra ?? 0,
        conveyance: earnings?.conveyance ?? 0,
        childrenAllowance: earnings?.childrenAllowance ?? 0,
        fixedAllowance: earnings?.fixedAllowance ?? 0,
        grossSalary: grossSalary
      },

      deductions: {
        absentDeduction: deductions?.absentDeduction ?? 0,
        halfDayDeduction: deductions?.halfDayDeduction ?? 0,
        lateDeduction: deductions?.lateDeduction ?? 0,
        earlyCheckoutDeduction: deductions?.earlyCheckoutDeduction ?? 0,
        pf: deductions?.pf ?? 0,
        professionalTax: deductions?.professionalTax ?? 0,
        total: totalDeduction
      },

      attendance: {
        present: attendance?.present ?? 0,
        absent: attendance?.absent ?? 0,
        halfDay: attendance?.halfDay ?? 0,
        late: attendance?.late ?? 0,
        earlyCheckout: attendance?.earlyCheckout ?? 0,
      },

      createdBy: req.user.id
    });

    await slip.save();

    return res.status(201).json({
      message: "Salary slip sent successfully",
      slip
    });

  } catch (error) {
    console.log("❌ sendSalarySlip ERROR:", error);
    return res.status(500).json({ message: "Server error" });
  }
};


// =============================================
// ✅ GET ALL SALARY SLIPS (ADMIN / HR / MANAGER)
// =============================================
export const getSalarySlips = async (req, res) => {
  try {
    const { id, role, isMainAdmin } = req.user;

    let adminIds = [];

    if (isMainAdmin) {
      const subs = await Admin.find({ createdBy: id }).select("_id");
      adminIds = [id, ...subs.map(a => a._id)];
    }
    else if (["hr", "manager"].includes(role)) {
      adminIds = [req.user.createdBy, id];
    }
    else {
      adminIds = [id];
    }

    const employeeIds = await Employee.find({
      createdBy: { $in: adminIds }
    }).distinct("_id");

    const slips = await SalarySlip.find({
      employeeId: { $in: employeeIds }
    })
      .populate("employeeId", "name email")
      .sort({ year: -1, month: -1 });

    res.json(slips);

  } catch (err) {
    return res.status(500).json({ message: "Server error" });
  }
};


// =============================================
// ✅ GET MY SALARY SLIPS (EMPLOYEE)
// =============================================
export const getEmployeeSalarySlips = async (req, res) => {
  try {
    const slips = await SalarySlip.find({
      employeeId: req.user.id
    }).sort({ year: -1, month: -1 });

    res.json(slips);

  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// =============================================
// ✅ DELETE SALARY SLIP (ADMIN)
// =============================================
export const deleteSalarySlip = async (req, res) => {
  try {
    const { id: slipId } = req.params;
    const { id: adminId, role, isMainAdmin } = req.user;

    const slip = await SalarySlip.findById(slipId);

    if (!slip) {
      return res.status(404).json({ message: "Salary slip not found" });
    }

    // Authorization: Check if the admin has the right to delete this slip.
    // This is a simplified check. For full security, verify against the employee's `createdBy` chain.
    if (!isMainAdmin && slip.createdBy?.toString() !== adminId) {
      return res.status(403).json({ message: "You are not authorized to delete this slip." });
    }

    await SalarySlip.findByIdAndDelete(slipId);

    res.json({ message: "Salary slip deleted successfully" });
  } catch (err) {
    console.error("❌ deleteSalarySlip ERROR:", err);
    res.status(500).json({ message: "Server error while deleting slip" });
  }
};
