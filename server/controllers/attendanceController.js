
import Attendance from "../models/attendanceModel.js";
import Employee from "../models/employeeModel.js";
import Admin from "../models/adminModel.js";
import dayjs from "dayjs";
import moment from "moment-timezone";


// normalizeSettings
const normalizeSettings = (raw = {}) => {
  return {
    officeStartTime: raw.officeStartTime || "10:00",
    lateGraceMinutes: Number(raw.lateGraceMinutes ?? 15),

    // HALF DAY (LOGIN SIDE)
    halfDayLoginCutoff: raw.halfDayLoginCutoff || "10:15",

    // END TIME
    officeEndTime: raw.officeEndTime || "18:00",

    // HALF DAY (LOGOUT SIDE)
    halfDayCheckoutCutoff: raw.halfDayCheckoutCutoff || "17:00",

    // AUTO LOGOUT
    autoCheckoutTime: raw.autoCheckoutTime || "18:00",
    //break time
    breakDurationMinutes: Number(raw.breakDurationMinutes ?? 40),
  };
};

// UTIL: REMARK LOGIC
const getRemark = (login, logout, settings = {}) => {
  if (!login || !logout) return "Incomplete";

  const cfg = normalizeSettings(settings);
  const toMins = (hhmm) => {
    const [h, m] = String(hhmm).split(":").map(Number);
    return h * 60 + m;
  };

  const loginMins = toMins(login);
  const logoutMins = toMins(logout);

  const officeStart = toMins(cfg.officeStartTime);
  const lateGrace = cfg.lateGraceMinutes;
  const halfDayLoginCutoff = toMins(cfg.halfDayLoginCutoff);

  const halfDayCheckoutCutoff = toMins(cfg.halfDayCheckoutCutoff);
  const officeEnd = toMins(cfg.officeEndTime);

  // ✔ LOGIN LOGIC
  if (loginMins > halfDayLoginCutoff) return "Half Day";
  if (loginMins > officeStart + lateGrace) return "Late Login";

  // ✔ LOGOUT LOGIC
  if (logoutMins < halfDayCheckoutCutoff) return "Half Day";
  if (logoutMins < officeEnd) return "Early Checkout";

  return "Present";
};


// CHECK-IN
export const checkIn = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    const adminSettingsRaw = await Admin.findById(employee.createdBy).select("attendanceSettings");
    const settings = normalizeSettings(adminSettingsRaw?.attendanceSettings || {});

    const now = moment().tz("Asia/Kolkata");
    const dateOnly = new Date(now.format("YYYY-MM-DD")); // date field saved as midnight local
    const timeStr = now.format("HH:mm");

    let att = await Attendance.findOne({ user: employeeId, date: dateOnly });

    if (att && att.checkIn) {
      return res.status(400).json({ message: "Already checked in today" });
    }

    if (!att) {
      att = new Attendance({
        user: employeeId,
        createdBy: employee.createdBy,
        date: dateOnly,
        checkIn: now.toDate(),
        login: timeStr,
      });
    } else {
      att.checkIn = now.toDate();
      att.login = timeStr;
    }

    // Determine status using halfDayLoginCutoff (login-side cutoff)
    const loginMins = now.hour() * 60 + now.minute();
    const halfDayLoginMins = (() => {
      const [h, m] = (settings.halfDayLoginCutoff || "11:00").split(":").map(Number);
      return h * 60 + m;
    })();
    const officeStartMins = (() => {
      const [h, m] = (settings.officeStartTime || "10:00").split(":").map(Number);
      return h * 60 + m;
    })();

    if (loginMins > halfDayLoginMins) att.status = "Half Day";
    else if (loginMins > officeStartMins + (settings.lateGraceMinutes || 0)) att.status = "Late";
    else att.status = "Present";

    att.remark = att.status;
    await att.save();
    return res.json({ message: "Checked in successfully", att });
  } catch (err) {
    console.error("checkIn error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// CHECK-OUT
// export const checkOut = async (req, res) => {
//   try {
//     const employeeId = req.user.id;
//     const dateOnly = new Date(moment().tz("Asia/Kolkata").format("YYYY-MM-DD"));

//     const att = await Attendance.findOne({ user: employeeId, date: dateOnly });
//     if (!att || !att.checkIn) {
//       return res.status(400).json({ message: "No check-in found for today" });
//     }
//     if (att.checkOut) {
//       return res.status(400).json({ message: "Already checked out today" });
//     }

//     const employee = await Employee.findById(employeeId);
//     const adminSettingsRaw = await Admin.findById(employee.createdBy).select("attendanceSettings");
//     const settings = normalizeSettings(adminSettingsRaw?.attendanceSettings || {});

//     const now = moment().tz("Asia/Kolkata");
//     att.checkOut = now.toDate();
//     att.logout = now.format("HH:mm");

//     const diffMs = att.checkOut.getTime() - att.checkIn.getTime();
//     att.totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;

//     att.remark = getRemark(att.login, att.logout, settings);
//     att.status = att.remark;

//     await att.save();
//     return res.json({ message: "Checked out successfully", att });
//   } catch (err) {
//     console.error("checkOut error:", err);
//     return res.status(500).json({ message: "Server error" });
//   }
// };
export const checkOut = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const now = moment().tz("Asia/Kolkata");
    const dateOnly = new Date(now.format("YYYY-MM-DD"));

    const att = await Attendance.findOne({ user: employeeId, date: dateOnly });

    if (!att || !att.checkIn) {
      return res.status(400).json({ message: "Please check-in first." });
    }
    if (att.checkOut) {
      return res.status(400).json({ message: "Already checked-out" });
    }

    const employee = await Employee.findById(employeeId);
    const adminSettingsRaw = await Admin.findById(employee.createdBy).select("attendanceSettings");
    const settings = normalizeSettings(adminSettingsRaw?.attendanceSettings || {});

    // if last break still active → auto end it
    let lastBreak = att.breaks[att.breaks.length - 1];
    if (lastBreak && !lastBreak.end) {
      lastBreak.end = now.toDate();
      // ensure countedEnd is set (respect admin's breakDurationMinutes)
      try {
        const diffMin = moment(lastBreak.end).diff(lastBreak.start, "minutes");
        if (settings.breakDurationMinutes && diffMin > settings.breakDurationMinutes) {
          const cappedEnd = new Date(new Date(lastBreak.start).getTime() + settings.breakDurationMinutes * 60 * 1000);
          lastBreak.countedEnd = cappedEnd;
          lastBreak.exceeded = true;
        } else {
          lastBreak.countedEnd = lastBreak.end;
          lastBreak.exceeded = false;
        }
      } catch (e) {
        // ignore any date parsing issues and fallback to using end
        lastBreak.countedEnd = lastBreak.end;
        lastBreak.exceeded = false;
      }
    }

    att.checkOut = now.toDate();
    att.logout = now.format("HH:mm");

    // calculate total working time
    const totalWorkMs = att.checkOut - att.checkIn;

    // calculate total break time
    let breakMs = 0;
    att.breaks.forEach(b => {
      if (!b.start) return;
      // prefer countedEnd (capped) if present, otherwise use actual end
      const end = b.countedEnd ? new Date(b.countedEnd) : (b.end ? new Date(b.end) : null);
      if (end) {
        breakMs += (end.getTime() - new Date(b.start).getTime());
      }
    });

    // final working hours
    const netWorkHours = (totalWorkMs - breakMs) / (1000 * 60 * 60);

    att.totalHours = Math.max(0, Math.round(netWorkHours * 100) / 100);

    // mark status
    att.remark = getRemark(att.login, att.logout, settings);
    att.status = att.remark;

    await att.save();
    return res.json({ message: "Checked-out successfully", att });

  } catch (err) {
    console.error("Checkout error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};



// AUTO CHECKOUT
export const autoCheckOut = async () => {
  try {
    // load all admins who may have settings (main admins or all admins depending on model)
    const admins = await Admin.find({}).select("_id attendanceSettings");

    // Build map of adminId -> normalized settings
    const adminSettingsMap = new Map();
    admins.forEach(a => adminSettingsMap.set(String(a._id), normalizeSettings(a.attendanceSettings || {})));

    const now = moment().tz("Asia/Kolkata");
    const todayStart = now.clone().startOf("day").toDate();
    const todayEnd = now.clone().endOf("day").toDate();

    // find pending attendance records for today where checkIn exists and checkOut missing
    const pending = await Attendance.find({
      date: { $gte: todayStart, $lte: todayEnd },
      checkIn: { $exists: true },
      checkOut: { $exists: false }
    }).populate("user", "createdBy");

    let processed = 0;

    for (const att of pending) {
      const adminId = String(att.user?.createdBy);
      const settings = adminSettingsMap.get(adminId) || normalizeSettings({});

      const [autoHour, autoMin] = (settings.autoCheckoutTime || "18:00").split(":").map(Number);
      // Build the expected auto-checkout moment *for today* in Asia/Kolkata
      const expected = moment().tz("Asia/Kolkata").startOf("day").hour(autoHour).minute(autoMin).second(0);

      // only do auto-checkout if current time is on/after expected auto checkout
      if (now.isBefore(expected)) {
        // skip for now
        continue;
      }

      // If last break is still active, end it at the auto-checkout time.
      const lastBreak = att.breaks[att.breaks.length - 1];
      if (lastBreak && !lastBreak.end) {
        lastBreak.end = expected.toDate();
        // cap countedEnd based on admin settings
        try {
          const diffMin = moment(lastBreak.end).diff(lastBreak.start, "minutes");
          if (settings.breakDurationMinutes && diffMin > settings.breakDurationMinutes) {
            const cappedEnd = new Date(new Date(lastBreak.start).getTime() + settings.breakDurationMinutes * 60 * 1000);
            lastBreak.countedEnd = cappedEnd;
            lastBreak.exceeded = true;
          } else {
            lastBreak.countedEnd = lastBreak.end;
            lastBreak.exceeded = false;
          }
        } catch (e) {
          lastBreak.countedEnd = lastBreak.end;
          lastBreak.exceeded = false;
        }
      }

      // set checkout to expected time (so hours reflect correct)
      att.checkOut = expected.toDate();
      att.logout = expected.format("HH:mm");

      const totalWorkMs = att.checkOut.getTime() - att.checkIn.getTime();

      let breakMs = 0;
      att.breaks.forEach((b) => {
        if (!b.start) return;
        const end = b.countedEnd ? new Date(b.countedEnd) : (b.end ? new Date(b.end) : null);
        if (end) breakMs += end.getTime() - new Date(b.start).getTime();
      });

      const netWorkMs = totalWorkMs - breakMs;
      att.totalHours = Math.max(0, Math.round((netWorkMs / (1000 * 60 * 60)) * 100) / 100);

      att.remark = getRemark(att.login, att.logout, settings);
      att.status = att.remark;

      await att.save();
      processed++;
    }

    console.log(`autoCheckOut: processed ${processed} attendance records (pending ${pending.length})`);
  } catch (err) {
    console.error("autoCheckOut error:", err);
  }
};


// GET MY ATTENDANCE (Employee)
export const getMyAttendance = async (req, res) => {
  try {
    const employeeId = req.user.id;

    // 1. Fetch attendance records for the employee
    const records = await Attendance.find({ user: employeeId }).sort({ date: -1 });

    // 2. Fetch the employee's admin's settings
    const employee = await Employee.findById(employeeId).select("createdBy");
    if (!employee) {
      // If employee not found, just return records without settings
      return res.json({ records, settings: {} });
    }

    const adminSettingsRaw = await Admin.findById(employee.createdBy).select("attendanceSettings");
    const settings = normalizeSettings(adminSettingsRaw?.attendanceSettings || {});

    // 3. Return both records and settings
    res.json({ records, settings });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// MANUAL ATTENDANCE ENTRY (by Admin)
export const manualAttendance = async (req, res) => {
  try {
    const { userId, date, status, checkIn, checkOut, remark, breaks } = req.body;

    // Basic validation
    if (!userId || !date || !status) {
      return res.status(400).json({ message: "User, date, and status are required." });
    }

    // Find the employee to get their creator admin ID
    const employee = await Employee.findById(userId).select("createdBy");
    if (!employee) {
      return res.status(404).json({ message: "Employee not found." });
    }

    const dateOnly = new Date(moment(date).tz("Asia/Kolkata").format("YYYY-MM-DD"));

    const updateData = {
      user: userId,
      userModel: 'Employee',
      createdBy: employee.createdBy,
      date: dateOnly,
      status: status,
      remark: remark || `Manually set to ${status} by admin.`,
      checkIn: checkIn ? new Date(checkIn) : null,
      checkOut: checkOut ? new Date(checkOut) : null,
      login: checkIn ? moment(checkIn).tz("Asia/Kolkata").format("HH:mm") : null,
      logout: checkOut ? moment(checkOut).tz("Asia/Kolkata").format("HH:mm") : null,
      breaks: (breaks || []).map(b => ({
        start: b.start ? new Date(b.start) : null,
        end: b.end ? new Date(b.end) : null,
        countedEnd: b.end ? new Date(b.end) : null, // For simplicity, countedEnd is same as end
        exceeded: false,
      })).filter(b => b.start && b.end), // Only add valid breaks
    };

    // Calculate totalHours if both checkIn and checkOut are provided
    if (updateData.checkIn && updateData.checkOut) {
      const totalWorkMs = updateData.checkOut.getTime() - updateData.checkIn.getTime();

      let breakMs = 0;
      if (updateData.breaks.length > 0) {
        breakMs = updateData.breaks.reduce((acc, b) => acc + (b.end.getTime() - b.start.getTime()), 0);
      }

      const netWorkMs = totalWorkMs - breakMs;
      updateData.totalHours = Math.max(0, Math.round((netWorkMs / (1000 * 60 * 60)) * 100) / 100);
    } else {
      updateData.totalHours = 0;
    }

    // Use findOneAndUpdate with upsert to create or update the record
    const attendanceRecord = await Attendance.findOneAndUpdate(
      { user: userId, date: dateOnly },
      { $set: updateData },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.json({ message: "Attendance updated successfully", record: attendanceRecord });

  } catch (err) {
    console.error("Manual attendance error:", err);
    res.status(500).json({ message: "Server error during manual attendance update." });
  }
};

// GET ALL ATTENDANCE (Admin/HR/Manager)
// export const getAllAttendance = async (req, res) => {
//   try {
//     const { id: userId, role, isMainAdmin } = req.user;

//     let empQuery;
//     if (isMainAdmin) {
//       const subAdmins = await Admin.find({ createdBy: userId }).select("_id");
//       const adminIds = [userId, ...subAdmins.map(a => a._id)];
//       empQuery = { createdBy: { $in: adminIds } };
//     } else if (["hr", "manager"].includes(role)) {
//       const creatorAdmin = await Admin.findById(req.user.createdBy);
//       const orgAdminIds = await Admin.find({ createdBy: creatorAdmin._id }).select("_id");
//       const allTeamIds = [creatorAdmin._id, ...orgAdminIds.map(a => a._id)];
//       empQuery = { createdBy: { $in: allTeamIds } };
//     } else {
//       empQuery = { createdBy: userId };
//     }
//     const employeeIds = await Employee.find(empQuery).distinct("_id");

//     const records = await Attendance.find({ user: { $in: employeeIds } })
//       .populate("user", "name email department position")
//       .sort({ date: -1 });

//     res.json(records);
//   } catch (err) {
//     res.status(500).json({ message: "Server error" });
//   }
// };
export const getAllAttendance = async (req, res) => {
  try {
    const { id: userId, role, isMainAdmin } = req.user;

    let adminIds = [];

    // ⭐ MAIN ADMIN → खुद + उसके sub-admins
    if (isMainAdmin) {
      const subAdmins = await Admin.find({ createdBy: userId }).select("_id");
      adminIds = [userId, ...subAdmins.map(a => a._id)];
    }

    // ⭐ HR / MANAGER → उनके parent admin + उसके team admins
    else if (["hr", "manager"].includes(role)) {
      const creatorAdmin = await Admin.findById(req.user.createdBy);
      const orgAdminIds = await Admin.find({ createdBy: creatorAdmin._id }).select("_id");
      adminIds = [creatorAdmin._id, ...orgAdminIds.map(a => a._id)];
    }

    // ⭐ Normal Admin → सिर्फ उसका खुद का created users
    else {
      adminIds = [userId];
    }

    // ⭐ GET ALL EMPLOYEES under these admins (including HR + MANAGER)
    const employeeIds = await Employee.find({
      createdBy: { $in: adminIds }
    }).distinct("_id");

    // ⭐ Include admins themselves (if they have attendance)
    const allUserIds = [...employeeIds, ...adminIds];

    // ⭐ Get attendance for ALL (Employees + HR + Manager + Admins)
    const records = await Attendance.find({
      user: { $in: allUserIds }
    })
      .populate("user", "name email department position role")
      .sort({ date: -1 });

    res.json(records);

  } catch (err) {
    console.error("getAllAttendance ERROR:", err);
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
// export const getAttendance = async (req, res) => {
//   try {
//     const { id: userId, role, isMainAdmin } = req.user;
  
//     let empQuery;
//     if (isMainAdmin) {
//       const subAdmins = await Admin.find({ createdBy: userId }).select("_id");
//       const adminIds = [userId, ...subAdmins.map(a => a._id)];
//       empQuery = { createdBy: { $in: adminIds } };
//     } else if (["hr", "manager"].includes(role)) {
//       const creatorAdmin = await Admin.findById(req.user.createdBy);
//       const orgAdminIds = await Admin.find({ createdBy: creatorAdmin._id }).select("_id");
//       const allTeamIds = [creatorAdmin._id, ...orgAdminIds.map(a => a._id)];
//       empQuery = { createdBy: { $in: allTeamIds } };
//     } else {
//       empQuery = { createdBy: userId };
//     }
//     const employeeIds = await Employee.find(empQuery).distinct("_id");

//     // date, startDate, endDate logic (timezone-aware)
//     const { date, startDate, endDate } = req.query;
//     let start, end;

//     if (startDate && endDate) {
//       start = moment(startDate).tz("Asia/Kolkata").startOf("day").toDate();
//       end = moment(endDate).tz("Asia/Kolkata").endOf("day").toDate();
//     } else if (date) {
//       const q = moment(date).tz("Asia/Kolkata");
//       start = q.startOf("day").toDate();
//       end = q.endOf("day").toDate();
//     } else {
//       const today = moment().tz("Asia/Kolkata");
//       start = today.startOf("day").toDate();
//       end = today.endOf("day").toDate();
//     }

//     const attendance = await Attendance.find({
//       user: { $in: employeeIds },
//       date: { $gte: start, $lte: end }
//     }).populate("user", "name email department position").sort({ date: -1 });

//       return res.json(attendance);
//     } catch (err) {
//       console.error("getAttendance error:", err);
//       return res.status(500).json({ message: "Server error" });
//     }
//   };
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

    // date range logic
    const { date, startDate, endDate } = req.query;
    let start, end;

    if (startDate && endDate) {
      start = moment(startDate).tz("Asia/Kolkata").startOf("day").toDate();
      end = moment(endDate).tz("Asia/Kolkata").endOf("day").toDate();
    } else if (date) {
      const q = moment(date).tz("Asia/Kolkata");
      start = q.startOf("day").toDate();
      end = q.endOf("day").toDate();
    } else {
      const today = moment().tz("Asia/Kolkata");
      start = today.startOf("day").toDate();
      end = today.endOf("day").toDate();
    }

    const attendance = await Attendance.find({
      user: { $in: employeeIds },
      date: { $gte: start, $lte: end }
    })
      .populate("user", "name email department position")
      .sort({ date: -1 });

    // ⭐ ADD THIS BLOCK ⭐
    const adminId = req.user.createdBy || req.user.id;
    const adminSettingsRaw = await Admin.findById(adminId).select("attendanceSettings");
    const settings = normalizeSettings(adminSettingsRaw?.attendanceSettings || {});

    return res.json({
      settings,      // <-- frontend will now receive dynamic breakDurationMinutes
      records: attendance
    });

  } catch (err) {
    console.error("getAttendance error:", err);
    return res.status(500).json({ message: "Server error" });
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
    // Accept either a single `date` or a `startDate`/`endDate` range (ISO strings).
    const { date, startDate, endDate } = req.query;
    let start, end;
    if (startDate && endDate) {
      start = moment(startDate).tz("Asia/Kolkata").startOf("day").toDate();
      end = moment(endDate).tz("Asia/Kolkata").endOf("day").toDate();
    } else if (date) {
      const queryDate = moment(date).tz("Asia/Kolkata");
      start = queryDate.startOf("day").toDate();
      end = queryDate.endOf("day").toDate();
    } else {
      const today = moment().tz("Asia/Kolkata");
      start = today.startOf("day").toDate();
      end = today.endOf("day").toDate();
    }

    // 1. Find all sub-admins created by the current main admin
    const subAdmins = await Admin.find({ createdBy: req.user.id }).select('_id');
    const subAdminIds = subAdmins.map(admin => admin._id);

    // 2. Find attendance records only for those sub-admins
    const records = await Attendance.find({
      user: { $in: subAdminIds },
      userModel: 'Admin',
      date: { $gte: start, $lte: end }
    })
      .populate("user", "name email role")
      .sort({ date: -1 });

    res.json(records);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

export const adminBreakStart = async (req, res) => {
  try {
    const adminId = req.user.id;
    const now = moment().tz("Asia/Kolkata");

    const dateOnly = new Date(now.format("YYYY-MM-DD"));
    const todayStart = now.clone().startOf("day").toDate();
    const todayEnd = now.clone().endOf("day").toDate();

    const att = await Attendance.findOne({
      user: adminId,
      userModel: "Admin",
      date: { $gte: todayStart, $lte: todayEnd },
    });

    if (!att || !att.checkIn) {
      return res.status(400).json({ message: "Please check-in first" });
    }

    const lastBreak = att.breaks[att.breaks.length - 1];
    if (lastBreak && !lastBreak.end) {
      return res.status(400).json({ message: "Break already started" });
    }

    att.breaks.push({
      start: now.toDate(),
      end: null
    });

    await att.save();

    return res.json({ message: "Break started successfully", att });

  } catch (err) {
    console.error("adminBreakStart error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const adminBreakEnd = async (req, res) => {
  try {
    const adminId = req.user.id;
    const now = moment().tz("Asia/Kolkata");
    const todayStart = now.clone().startOf("day").toDate();
    const todayEnd = now.clone().endOf("day").toDate();

    const att = await Attendance.findOne({
      user: adminId,
      userModel: "Admin",
      date: { $gte: todayStart, $lte: todayEnd },
    }).populate("user", "createdBy");

    if (!att || att.breaks.length === 0) {
      return res.status(400).json({ message: "No break started yet" });
    }

    const lastBreak = att.breaks[att.breaks.length - 1];
    if (lastBreak.end) {
      return res.status(400).json({ message: "Break already ended" });
    }

    // ⭐ Admin settings load karein
    const adminSettingsRaw = await Admin.findById(att.user.createdBy).select("attendanceSettings");
    const settings = normalizeSettings(adminSettingsRaw?.attendanceSettings || {});

    const diffMin = moment(now).diff(lastBreak.start, "minutes");

    // ⭐ Dynamic break validation
    if (diffMin > settings.breakDurationMinutes) {
      return res.status(400).json({
        message: `Break time exceeded! Allowed: ${settings.breakDurationMinutes} minutes`
      });
    }

    lastBreak.end = now.toDate();
    await att.save();

    return res.json({ message: "Back to work", breakUsed: diffMin, allowed: settings.breakDurationMinutes, att });
  } catch (err) {
    console.error("adminBreakEnd error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const startBreak = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = moment().tz("Asia/Kolkata");
    const dateOnly = new Date(now.format("YYYY-MM-DD"));

    const att = await Attendance.findOne({ user: userId, date: dateOnly });
    if (!att || !att.checkIn) {
      return res.status(400).json({ message: "Please check-in first" });
    }


    const lastBreak = att.breaks[att.breaks.length - 1];
    if (lastBreak && !lastBreak.end) {
      return res.status(400).json({ message: "Break already started" });
    }

    att.breaks.push({ start: now.toDate(), end: null });
    await att.save();

    return res.json({ message: "Break started", att });
  } catch (err) {
    console.error("startBreak error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
export const endBreak = async (req, res) => {
  try {
    const userId = req.user.id;
    const now = moment().tz("Asia/Kolkata");
    const dateOnly = new Date(now.format("YYYY-MM-DD"));

    const att = await Attendance.findOne({ user: userId, date: dateOnly });
    if (!att) {
      return res.status(400).json({ message: "No attendance found" });
    }

    const lastBreak = att.breaks[att.breaks.length - 1];
    if (!lastBreak || lastBreak.end) {
      return res.status(400).json({ message: "No break in progress" });
    }

    // load admin settings for this employee to enforce break duration
    const employee = await Employee.findById(userId).select("createdBy");
    const adminSettingsRaw = await Admin.findById(employee?.createdBy).select("attendanceSettings");
    const settings = normalizeSettings(adminSettingsRaw?.attendanceSettings || {});

    const diffMin = moment(now).diff(lastBreak.start, "minutes");
    // If employee exceeded allowed break time, allow ending but cap counted duration
    lastBreak.end = now.toDate();
    if (settings.breakDurationMinutes && diffMin > settings.breakDurationMinutes) {
      // store a capped end time to be used when calculating working hours
      const cappedEnd = new Date(lastBreak.start.getTime() + settings.breakDurationMinutes * 60 * 1000);
      lastBreak.countedEnd = cappedEnd;
      lastBreak.exceeded = true;
    } else {
      // normal end
      lastBreak.countedEnd = lastBreak.end;
      lastBreak.exceeded = false;
    }

    await att.save();

    return res.json({ message: "Back to work", att, breakUsed: diffMin, allowed: settings.breakDurationMinutes, exceeded: lastBreak.exceeded });
  } catch (err) {
    console.error("endBreak error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
