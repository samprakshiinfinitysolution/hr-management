
import SalarySlip from "../models/salarySlipModel.js";
import Employee from "../models/employeeModel.js";
import Notification from "../models/notificationModel.js";
import Attendance from "../models/attendanceModel.js";
import Admin from "../models/adminModel.js";
import dayjs from "dayjs";

// CALCULATE SALARY
export const calculateSalary = async (req, res) => {
  try {
    const { employeeId, month, year } = req.body;
    const { id: userId, role, isMainAdmin } = req.user;

    let empQuery;
    if (isMainAdmin) {
      const subAdmins = await Admin.find({ createdBy: userId }).select("_id");
      const adminIds = [userId, ...subAdmins.map(a => a._id)];
      empQuery = { _id: employeeId, createdBy: { $in: adminIds } };
    } else if (["hr", "manager"].includes(role)) {
      const mainAdminId = req.user.createdBy;
      const orgAdminIds = await Admin.find({ createdBy: mainAdminId }).select("_id");
      const allTeamIds = [mainAdminId, userId, ...orgAdminIds.map(a => a._id)];
      empQuery = { _id: employeeId, createdBy: { $in: allTeamIds } };
    } else {
      empQuery = { _id: employeeId, createdBy: userId };
    }

    const employee = await Employee.findOne(empQuery);
    if (!employee) return res.status(404).json({ message: "Employee not found or unauthorized" });

    const baseSalary = employee.salary || 0;
    const startDate = dayjs(`${year}-${month}-01`).startOf("month").toDate();
    const endDate = dayjs(startDate).endOf("month").toDate();

    const attendance = await Attendance.find({
      user: employeeId,
      date: { $gte: startDate, $lte: endDate },
    });

    let absentDays = 0;
    let lateDays = 0;
    attendance.forEach(record => {
      if (record.status === "Absent") absentDays++;
      if (record.status === "Late" || record.status === "Late Login") lateDays++;
    });

    const totalDays = dayjs(endDate).diff(startDate, "day") + 1;
    const dailySalary = baseSalary / totalDays;
    const deduction = (absentDays * dailySalary) + (lateDays * (dailySalary / 2));
    const netSalary = baseSalary - deduction;
    const remarks = `Absent: ${absentDays} days, Late: ${lateDays} days`;

    res.json({
      baseSalary,
      absentDays,
      lateDays,
      deduction: Math.round(deduction),
      netSalary: Math.round(netSalary),
      remarks: absentDays + lateDays > 0 ? remarks : "No deductions",
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// SEND SALARY SLIP
export const sendSalarySlip = async (req, res) => {
  try {
    const { employeeId, month, year, baseSalary, deduction, remarks } = req.body;
    const netSalary = baseSalary - deduction;
    const { id: userId, role, isMainAdmin } = req.user;

    let empQuery;
    if (isMainAdmin) {
      const subAdmins = await Admin.find({ createdBy: userId }).select("_id");
      const adminIds = [userId, ...subAdmins.map(a => a._id)];
      empQuery = { _id: employeeId, createdBy: { $in: adminIds } };
    } else if (["hr", "manager"].includes(role)) {
      const mainAdminId = req.user.createdBy;
      const orgAdminIds = await Admin.find({ createdBy: mainAdminId }).select("_id");
      const allTeamIds = [mainAdminId, userId, ...orgAdminIds.map(a => a._id)];
      empQuery = { _id: employeeId, createdBy: { $in: allTeamIds } };
    } else {
      empQuery = { _id: employeeId, createdBy: userId };
    }

    const employee = await Employee.findOne(empQuery);
    if (!employee) return res.status(404).json({ message: "Employee not found or unauthorized" });

    const slip = new SalarySlip({
      employeeId,
      month,
      year,
      baseSalary,
      deduction,
      netSalary,
      remarks,
      createdBy: userId,
    });
    await slip.save();

    const notification = new Notification({
      title: "Salary Slip Generated",
      message: `Your salary slip for ${month}-${year} has been generated.`,
      type: "employee",
      userId: employeeId,
      priority: "Medium",
      createdBy: userId,
      link: "/employee/dashboard/salary-slip",
    });
    await notification.save();

    res.status(201).json({ message: "Salary slip sent", slip });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// GET ALL SALARY SLIPS (Admin/HR/Manager)
export const getSalarySlips = async (req, res) => {
  try {
    const { id: userId, role, isMainAdmin } = req.user;

    let empQuery;
    if (isMainAdmin) {
      const subAdmins = await Admin.find({ createdBy: userId }).select("_id");
      const adminIds = [userId, ...subAdmins.map(a => a._id)];
      empQuery = { createdBy: { $in: adminIds } };
    } else if (["hr", "manager"].includes(role)) {
      const mainAdminId = req.user.createdBy;
      const orgAdminIds = await Admin.find({ createdBy: mainAdminId }).select("_id");
      const allTeamIds = [mainAdminId, userId, ...orgAdminIds.map(a => a._id)];
      empQuery = { createdBy: { $in: allTeamIds } };
    } else {
      empQuery = { createdBy: userId };
    }
    const employeeIds = await Employee.find(empQuery).distinct("_id");

    const slips = await SalarySlip.find({ employeeId: { $in: employeeIds } })
      .populate("employeeId", "name email")
      .sort({ year: -1, month: -1 });

    res.json(slips);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// GET MY SALARY SLIPS (Employee)
export const getEmployeeSalarySlips = async (req, res) => {
  try {
    const slips = await SalarySlip.find({ employeeId: req.user.id })
      .sort({ year: -1, month: -1 });
    res.json(slips);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};