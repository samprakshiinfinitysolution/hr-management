
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
    }

    att.checkOut = now.toDate();
    att.logout = now.format("HH:mm");

    // calculate total working time
    const totalWorkMs = att.checkOut - att.checkIn;

    // calculate total break time
    let breakMs = 0;
    att.breaks.forEach(b => {
      if (b.start && b.end) breakMs += (b.end - b.start);
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
      }

      // set checkout to expected time (so hours reflect correct)
      att.checkOut = expected.toDate();
      att.logout = expected.format("HH:mm");

      const totalWorkMs = att.checkOut.getTime() - att.checkIn.getTime();

      let breakMs = 0;
      att.breaks.forEach((b) => {
        if (b.start && b.end) {
          breakMs += b.end.getTime() - b.start.getTime();
        }
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

    // date, startDate, endDate logic (timezone-aware)
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
    }).populate("user", "name email department position").sort({ date: -1 });

    return res.json(attendance);
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

// ADMIN/HR/MANAGER — LUNCH START
// export const adminLunchStart = async (req, res) => {
//   try {
//     const adminId = req.user.id;
//     const now = moment().tz("Asia/Kolkata");
//     const dateOnly = new Date(now.format("YYYY-MM-DD"));
//     const timeStr = now.format("HH:mm");

//     const att = await Attendance.findOne({ user: adminId, date: dateOnly, userModel: "Admin" });
//     if (!att || !att.checkIn) {
//       return res.status(400).json({ message: "Please check-in first" });
//     }
//     if (att.lunchStartTime) {
//       return res.status(400).json({ message: "Lunch break already started" });
//     }

//     att.lunchStartTime = now.toDate();
//     await att.save();
//     res.json({ message: `Lunch break started at ${timeStr}`, att });
//   } catch (err) {
//     console.error("adminLunchStart error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };
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




// ADMIN/HR/MANAGER — LUNCH END
// export const adminLunchEnd = async (req, res) => {
//   try {
//     const adminId = req.user.id;
//     const now = moment().tz("Asia/Kolkata");
//     const dateOnly = new Date(now.format("YYYY-MM-DD"));
//     const timeStr = now.format("HH:mm");

//     const att = await Attendance.findOne({ user: adminId, date: dateOnly, userModel: "Admin" });
//     if (!att || !att.lunchStartTime) {
//       return res.status(400).json({ message: "No lunch break started yet" });
//     }
//     if (att.lunchEndTime) {
//       return res.status(400).json({ message: "Lunch break already ended" });
//     }

//     att.lunchEndTime = now.toDate();
//     await att.save();
//     res.json({ message: `Back to work at ${timeStr}`, att });
//   } catch (err) {
//     console.error("adminLunchEnd error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };
export const adminBreakEnd = async (req, res) => {
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

    if (!att || att.breaks.length === 0) {
      return res.status(400).json({ message: "No break started yet" });
    }

    const lastBreak = att.breaks[att.breaks.length - 1];
    if (lastBreak.end) {
      return res.status(400).json({ message: "Break already ended" });
    }

    lastBreak.end = now.toDate();

    await att.save();

    return res.json({ message: "Back to work", att });

  } catch (err) {
    console.error("adminBreakEnd error:", err);
    res.status(500).json({ message: "Server error" });
  }
};





// EMPLOYEE — LUNCH START
// export const lunchStart = async (req, res) => {
//   try {
//     const employeeId = req.user.id;
//     const now = moment().tz("Asia/Kolkata");
//     const dateOnly = new Date(now.format("YYYY-MM-DD"));
//     const timeStr = now.format("HH:mm");

//     const att = await Attendance.findOne({ user: employeeId, date: dateOnly });
//     if (!att || !att.checkIn) {
//       return res.status(400).json({ message: "Please check-in before lunch break" });
//     }
//     if (att.lunchStartTime) {
//       return res.status(400).json({ message: "Lunch break already started" });
//     }

//     att.lunchStartTime = now.toDate();
//     await att.save();
//     res.json({ message: `Lunch break started at ${timeStr}`, att });
//   } catch (err) {
//     console.error("lunchStart error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };
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


// EMPLOYEE — LUNCH END
// export const lunchEnd = async (req, res) => {
//   try {
//     const employeeId = req.user.id;
//     const now = moment().tz("Asia/Kolkata");
//     const dateOnly = new Date(now.format("YYYY-MM-DD"));
//     const timeStr = now.format("HH:mm");

//     const att = await Attendance.findOne({ user: employeeId, date: dateOnly });
//     if (!att || !att.lunchStartTime) {
//       return res.status(400).json({ message: "No lunch break started yet" });
//     }
//     if (att.lunchEndTime) {
//       return res.status(400).json({ message: "Lunch break already ended" });
//     }

//     att.lunchEndTime = now.toDate();
//     await att.save();
//     res.json({ message: `Back to work at ${timeStr}`, att });
//   } catch (err) {
//     console.error("lunchEnd error:", err);
//     res.status(500).json({ message: "Server error" });
//   }
// };

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

    lastBreak.end = now.toDate();
    await att.save();

    return res.json({ message: "Back to work", att });
  } catch (err) {
    console.error("endBreak error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
