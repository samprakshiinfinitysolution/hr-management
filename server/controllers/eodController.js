import EodReport from "../models/EodreportsModel.js";
import Employee from "../models/employeeModel.js";
import Attendance from "../models/attendanceModel.js";
import moment from "moment-timezone";
export const createEodReport = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    const dateOnly = moment(req.body.date).format("YYYY-MM-DD");
    const today = moment().tz("Asia/Kolkata").format("YYYY-MM-DD");

    if (dateOnly !== today) {
      return res.status(403).json({ message: "Editing past EODs is not allowed" });
    }

    const att = await Attendance.findOne({
      user: employeeId,
      date: new Date(today),
    });

    if (!att || !att.checkIn) {
      return res.status(403).json({ message: "Please check-in before submitting EOD" });
    }

    let existing = await EodReport.findOne({ employee: employeeId, date: dateOnly });

    if (existing) {
      existing.project = req.body.project;
      existing.reportingTime = req.body.reportingTime;
      existing.eodTime = req.body.eodTime;
      existing.summary = req.body.summary;
      existing.nextDayPlan = req.body.nextDayPlan; 
      existing.rows = req.body.rows;
      await existing.save();
      return res.status(200).json(existing);
    }

    const newReport = await EodReport.create({
      employee: employee._id,
      name: employee.name,
      project: req.body.project,
      date: dateOnly,
      reportingTime: req.body.reportingTime,
      eodTime: req.body.eodTime,
      summary: req.body.summary,
      nextDayPlan: req.body.nextDayPlan,
      rows: req.body.rows,
    });

    res.status(201).json(newReport);
  } catch (err) {
    console.error("EOD Error:", err);
    res.status(500).json({ message: err.message });
  }
};


// 🧩 Admin gets all EOD reports
// In eodController.js
export const getAllEodReports = async (req, res) => {
  try {
    const filter = {};
    if (req.query.employeeId) {
      filter.employee = req.query.employeeId;
    }

    const reports = await EodReport.find(filter)
      .populate("employee", "name email position")
      .sort({ createdAt: -1 });

    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// 🧩 Employee views own EOD reports
export const getMyEodReports = async (req, res) => {
  try {
    const reports = await EodReport.find({ employee: req.user.id }).sort({ date: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
