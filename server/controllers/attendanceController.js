
import Attendance from "../models/attendanceModel.js";
import Employee from "../models/employeeModel.js";
import Admin from "../models/adminModel.js";
import dayjs from "dayjs";
import moment from "moment-timezone";

// UTIL: REMARK LOGIC
const getRemark = (login, logout, settings = {}) => {
  if (!login || !logout) return "Incomplete";

  const [loginHour, loginMin] = login.split(":").map(Number);
  const [logoutHour, logoutMin] = logout.split(":").map(Number);
  const loginMins = loginHour * 60 + loginMin;
  const logoutMins = logoutHour * 60 + logoutMin;

  // Default values if settings are not provided
  const officeStartTime = settings.officeStartTime || "10:00";
  const lateGraceMinutes = settings.lateGraceMinutes || 10;
  const halfDayCutoff = settings.halfDayCutoff || "16:00"; // 4 PM
  const officeEndTime = settings.officeEndTime || "18:00"; // 6 PM

  const [startHour, startMin] = officeStartTime.split(":").map(Number);
  const officeStartMins = startHour * 60 + startMin;

  const [halfDayHour, halfDayMin] = halfDayCutoff.split(":").map(Number);
  const halfDayMins = halfDayHour * 60 + halfDayMin;

  const [endHour, endMin] = officeEndTime.split(":").map(Number);
  const officeEndMins = endHour * 60 + endMin;

  // Logic using settings
  if (loginMins > officeStartMins + lateGraceMinutes) return "Late Login";
  if (logoutMins < halfDayMins) return "Half Day";
  if (logoutMins < officeEndMins) return "Early Checkout";

  return "Present";
};

// CHECK-IN
export const checkIn = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    const adminSettings = await Admin.findById(employee.createdBy).select('attendanceSettings');
    const adminId = employee.createdBy;

    const now = moment().tz("Asia/Kolkata");
    const dateOnly = new Date(now.format("YYYY-MM-DD"));
    const timeStr = now.format("HH:mm");

    let att = await Attendance.findOne({ user: employeeId, date: dateOnly });

    if (att && att.checkIn) {
      return res.status(400).json({ message: "Already checked in today" });
    }

    if (!att) {
      att = new Attendance({
        user: employeeId,
        createdBy: adminId,
        date: dateOnly,
        checkIn: now.toDate(),
        login: timeStr,
      });
    } else {
      att.checkIn = now.toDate();
      att.login = timeStr;
    }

    const settings = adminSettings?.attendanceSettings || {};
    const officeStartTime = settings.officeStartTime || "10:00";
    const lateGraceMinutes = settings.lateGraceMinutes || 10;
    const halfDayLoginCutoff = settings.halfDayLoginCutoff || "11:00";

    const loginTime = now.hour() * 60 + now.minute();
    const [halfDayLoginHour, halfDayLoginMin] = halfDayLoginCutoff.split(':').map(Number);
    const [startHour, startMin] = officeStartTime.split(':').map(Number);

    if (loginTime > halfDayLoginHour * 60 + halfDayLoginMin) att.status = "Half Day";
    else if (loginTime > startHour * 60 + startMin + lateGraceMinutes) att.status = "Late";
    else att.status = "Present";

    att.remark = att.status;
    await att.save();

    res.json({ message: "Checked in successfully", att });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// CHECK-OUT
export const checkOut = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const dateOnly = new Date(moment().tz("Asia/Kolkata").format("YYYY-MM-DD"));

    const att = await Attendance.findOne({ user: employeeId, date: dateOnly });
    if (!att || !att.checkIn) {
      return res.status(400).json({ message: "No check-in found for today" });
    }
    if (att.checkOut) {
      return res.status(400).json({ message: "Already checked out today" });
    }

    const employee = await Employee.findById(employeeId);
    const adminSettings = await Admin.findById(employee.createdBy).select('attendanceSettings');
    const settings = adminSettings?.attendanceSettings || {};

    const now = moment().tz("Asia/Kolkata");
    const timeStr = now.format("HH:mm");

    att.checkOut = now.toDate();
    att.logout = timeStr;

    const diffMs = att.checkOut.getTime() - att.checkIn.getTime();
    att.totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;

    att.remark = getRemark(att.login, att.logout, settings);
    att.status = att.remark;

    await att.save();
    res.json({ message: "Checked out successfully", att });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// AUTO CHECKOUT
export const autoCheckOut = async () => {
  try {
    // Find all main admins to get their settings
    const mainAdmins = await Admin.find({ isMainAdmin: true }).select('attendanceSettings createdBy');
    const adminSettingsMap = new Map(mainAdmins.map(admin => [admin._id.toString(), admin.attendanceSettings]));

    const now = moment().tz("Asia/Kolkata");
    const sixPM = now.clone().hour(18).minute(0).second(0);
    if (now.isBefore(sixPM)) return;

    const today = new Date(now.format("YYYY-MM-DD"));

    const pending = await Attendance.find({
      date: today,
      checkIn: { $exists: true },
      checkOut: { $exists: false },
    }).populate('user', 'createdBy');

    for (const att of pending) {
      const userCreatedBy = att.user?.createdBy?.toString();
      const settings = adminSettingsMap.get(userCreatedBy) || {};
      const autoCheckoutTime = settings.autoCheckoutTime || "18:00";
      const [autoHour, autoMin] = autoCheckoutTime.split(':').map(Number);
      const autoCheckoutMoment = now.clone().hour(autoHour).minute(autoMin).second(0);

      att.checkOut = autoCheckoutMoment.toDate();
      att.logout = autoCheckoutMoment.format("HH:mm");

      const diffMs = att.checkOut.getTime() - att.checkIn.getTime();
      att.totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
      att.remark = getRemark(att.login, att.logout, settings);
      att.status = att.remark;
      await att.save();
    }

    console.log(`Auto checkout completed for ${pending.length} employees`);
  } catch (err) {
    console.error("Auto checkout error:", err);
  }
};

// GET MY ATTENDANCE (Employee)
export const getMyAttendance = async (req, res) => {
  try {
    const records = await Attendance.find({ user: req.user.id }).sort({ date: -1 });
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// GET ALL ATTENDANCE (Admin/HR/Manager)
export const getAllAttendance = async (req, res) => {
  try {
    const { id: userId, role, isMainAdmin } = req.user;

    let empQuery;
    if (isMainAdmin) {
      const subAdmins = await Admin.find({ createdBy: userId }).select("_id");
      const adminIds = [userId, ...subAdmins.map(a => a._id)];
      empQuery = { createdBy: { $in: adminIds } };
    } else if (["hr", "manager"].includes(role)) {
      const creatorAdmin = await Admin.findById(req.user.createdBy);
      const orgAdminIds = await Admin.find({ createdBy: creatorAdmin._id }).select("_id");
      const allTeamIds = [creatorAdmin._id, ...orgAdminIds.map(a => a._id)];
      empQuery = { createdBy: { $in: allTeamIds } };
    } else {
      empQuery = { createdBy: userId };
    }
    const employeeIds = await Employee.find(empQuery).distinct("_id");

    const records = await Attendance.find({ user: { $in: employeeIds } })
      .populate("user", "name email department position")
      .sort({ date: -1 });

    res.json(records);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// GET ATTENDANCE SUMMARY
export const getAttendanceSummary = async (req, res) => {
  try {
    const { id: userId, role, isMainAdmin } = req.user;

    let empQuery;
    if (isMainAdmin) {
      const subAdmins = await Admin.find({ createdBy: userId }).select("_id");
      const adminIds = [userId, ...subAdmins.map(a => a._id)];
      empQuery = { createdBy: { $in: adminIds } };
    } else if (["hr", "manager"].includes(role)) {
      const creatorAdmin = await Admin.findById(req.user.createdBy);
      const orgAdminIds = await Admin.find({ createdBy: creatorAdmin._id }).select("_id");
      const allTeamIds = [creatorAdmin._id, ...orgAdminIds.map(a => a._id)];
      empQuery = { createdBy: { $in: allTeamIds } };
    } else {
      empQuery = { createdBy: userId };
    }
    const employeeIds = await Employee.find(empQuery).distinct("_id");

    const today = new Date(moment().tz("Asia/Kolkata").format("YYYY-MM-DD"));
    const attendance = await Attendance.find({ user: { $in: employeeIds }, date: today });

    const totalEmployees = employeeIds.length;
    const onTime = attendance.filter(a => a.status === "Present").length;
    const late = attendance.filter(a => a.status === "Late").length;
    const absent = totalEmployees - attendance.length;

    res.json({ total: totalEmployees, onTime, late, absent });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// GET ATTENDANCE BY DATE
export const getAttendance = async (req, res) => {
  try {
    const { id: userId, role, isMainAdmin } = req.user;

    let empQuery;
    if (isMainAdmin) {
      const subAdmins = await Admin.find({ createdBy: userId }).select("_id");
      const adminIds = [userId, ...subAdmins.map(a => a._id)];
      empQuery = { createdBy: { $in: adminIds } };
    } else if (["hr", "manager"].includes(role)) {
      const creatorAdmin = await Admin.findById(req.user.createdBy);
      const orgAdminIds = await Admin.find({ createdBy: creatorAdmin._id }).select("_id");
      const allTeamIds = [creatorAdmin._id, ...orgAdminIds.map(a => a._id)];
      empQuery = { createdBy: { $in: allTeamIds } };
    } else {
      empQuery = { createdBy: userId };
    }
    const employeeIds = await Employee.find(empQuery).distinct("_id");

    const { date } = req.query;
    const queryDate = date ? moment(date).tz("Asia/Kolkata") : moment().tz("Asia/Kolkata");
    const start = queryDate.startOf("day").toDate();
    const end = queryDate.endOf("day").toDate();

    const attendance = await Attendance.find({
      user: { $in: employeeIds },
      date: { $gte: start, $lte: end },
    }).populate("user", "name email department position");

    res.json(attendance);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ADMIN/HR/MANAGER CHECK-IN
export const adminCheckIn = async (req, res) => {
  try {
    const adminId = req.user.id; 
    const now = moment().tz("Asia/Kolkata");
    const dateOnly = new Date(now.format("YYYY-MM-DD"));
    const timeStr = now.format("HH:mm");

    let att = await Attendance.findOne({ user: adminId, date: dateOnly });
    
    if (att && att.checkIn) {
      return res.status(400).json({ message: "Already checked in today" });
    }

    if (!att) {
      att = new Attendance({
        user: adminId,
        userModel: 'Admin',
        date: dateOnly,
        checkIn: now.toDate(),
        login: timeStr,
      });
    } else {
      att.checkIn = now.toDate();
      att.login = timeStr;
    }

    const adminUser = await Admin.findById(adminId);
    const settings = adminUser?.attendanceSettings || {};
    const officeStartTime = settings.officeStartTime || "10:00";
    const lateGraceMinutes = settings.lateGraceMinutes || 10;
    const [startHour, startMin] = officeStartTime.split(':').map(Number);

    const loginTime = now.hour() * 60 + now.minute();
    if (loginTime > startHour * 60 + startMin + lateGraceMinutes) att.status = "Late";
    else att.status = "Present";

    await att.save();

    res.json({ message: "Checked in successfully", att });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// ADMIN/HR/MANAGER CHECK-OUT
export const adminCheckOut = async (req, res) => {
  try {
    const adminId = req.user.id;
    const dateOnly = new Date(moment().tz("Asia/Kolkata").format("YYYY-MM-DD"));

    const att = await Attendance.findOne({ user: adminId, date: dateOnly, userModel: 'Admin' });
    if (!att || !att.checkIn) {
      return res.status(400).json({ message: "No check-in found for today" });
    }
    if (att.checkOut) {
      return res.status(400).json({ message: "Already checked out today" });
    }

    const adminUser = await Admin.findById(adminId);
    const settings = adminUser?.attendanceSettings || {};

    const now = moment().tz("Asia/Kolkata");
    att.checkOut = now.toDate();
    att.logout = now.format("HH:mm");

    const diffMs = att.checkOut.getTime() - att.checkIn.getTime();
    att.totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
    att.status = getRemark(att.login, att.logout, settings);
    att.remark = att.status;

    await att.save();
    res.json({ message: "Checked out successfully", att });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// GET ALL SUB-ADMINS' ATTENDANCE (For Main Admin)
export const getSubAdminAttendance = async (req, res) => {
  try {
    const { date } = req.query;
    const queryDate = date ? moment(date).tz("Asia/Kolkata") : moment().tz("Asia/Kolkata");
    const start = queryDate.startOf("day").toDate();
    const end = queryDate.endOf("day").toDate();

    // 1. Find all sub-admins created by the current main admin
    const subAdmins = await Admin.find({ createdBy: req.user.id }).select('_id');
    const subAdminIds = subAdmins.map(admin => admin._id);

    // 2. Find attendance records only for those sub-admins
    const records = await Attendance.find({ user: { $in: subAdminIds }, userModel: 'Admin', date: { $gte: start, $lte: end } })
      .populate("user", "name email role")
      .sort({ date: -1 });

    res.json(records);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};