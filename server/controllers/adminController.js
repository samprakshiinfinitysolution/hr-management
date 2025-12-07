
// server/controllers/adminController.js
import Admin from "../models/adminModel.js";
import Employee from "../models/employeeModel.js";
import Attendance from "../models/attendanceModel.js";
import Leave from "../models/leaveModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Notification from "../models/notificationModel.js"
import { jwtSecret } from "../config/config.js"; // Assuming you have this file

// Register Main Admin
export const registerAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const existing = await Admin.findOne({ email });
    if (existing) return res.status(400).json({ message: "Admin already exists" });

    const admin = await Admin.create({
      name,
      email,
      password: password, // Pass plain password, the model will hash it
      role: "admin", // The role for the main admin
      isMainAdmin: true, // First admin is main admin
    });

    res.status(201).json({ message: "Main admin registered", admin });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ message: "User not found" });
    }

    const match = await bcrypt.compare(password, admin.password);
    if (!match) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // -----------------------------------
    // ACCESS TOKEN (Short Expiry)
    // -----------------------------------
    const accessToken = jwt.sign(
      {
        id: admin._id,
        role: admin.role,
        isMainAdmin: admin.isMainAdmin,
        createdBy: admin.createdBy,
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    // -----------------------------------
    // REFRESH TOKEN (Long Expiry)
    // -----------------------------------
    const refreshToken = jwt.sign(
      {
        id: admin._id,
      },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    // (Optional) Save refresh token in DB for extra security
    // admin.refreshToken = refreshToken;
    // await admin.save();

    res.json({
      accessToken,
      refreshToken,
      role: admin.role,
      name: admin.name,
      id: admin._id,
      isMainAdmin: admin.isMainAdmin,
    });
  } catch (error) {
    console.error("admin login error:", error);
    res.status(500).json({ message: "Login error", error: error.message });
  }
};

export const refreshAdminAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ message: "Refresh token missing" });
    }

    // Verify refresh token
    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Invalid refresh token" });
    }

    // Create new access token
    const newAccessToken = jwt.sign(
      {
        id: decoded.id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" }
    );

    res.json({ accessToken: newAccessToken });
  } catch (error) {
    console.error("refreshAdminAccessToken error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * ✅ Get Admin Profile
 */
export const getAdminProfile = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id).select("-password");
    if (!admin) return res.status(404).json({ message: "Admin not found" });
    return res.json({ ...admin.toObject(), role: admin.role });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
};

/**
 * ✅ Update Admin Profile
 */
export const updateAdminProfile = async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const admin = await Admin.findById(req.user.id);

    if (!admin) {
      return res.status(404).json({ message: "User not found" });
    }

    if (name) admin.name = name;
    if (email) admin.email = email; // Note: You might want to restrict email changes for non-main-admins
    if (password) admin.password = password; // Pass the plain password

    const updatedAdmin = await admin.save();
    res.json(updatedAdmin);
  } catch (error) {
    res.status(500).json({ message: "Update failed", error: error.message });
  }
};

/**
 * ✅ Create HR or Manager
 */
export const createHRorManager = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!["hr", "manager"].includes(role))
      return res.status(400).json({ message: "Invalid role" });

    const existing = await Admin.findOne({ email });
    if (existing) return res.status(400).json({ message: "User already exists" });

    const newUser = await Admin.create({
      name,
      email,
      password: password, // Pass the plain password, the model will hash it. This is correct.
      role,
      isMainAdmin: false,
      createdBy: req.user.id,
    });

    res.status(201).json({ message: `${role} created successfully`, newUser });
  } catch (error) {
    res.status(500).json({ message: "Creation failed", error: error.message });
  }
};

/**
 * ✅ Create Employee
 */
export const createEmployee = async (req, res) => {
  try {
    const { name, email, password, ...rest } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const exists = await Employee.findOne({ email: email.toLowerCase() });
    if (exists) return res.status(400).json({ message: "Employee with this email already exists" });

    const employee = new Employee({
      name,
      email: email.toLowerCase(),
      password: password, // Pass plain password, the model will hash it
      ...rest,
      createdBy: req.user.id, // The admin creating this employee
    });

    await employee.save();
    res.status(201).json({ message: "Employee created successfully", employee });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};
/**
 * ✅ Get All HR/Managers (For Main Admin)
 */
export const getAllSubAdmins = async (req, res) => {
  try {
    // Only show sub-admins created by the current main admin
    const subAdmins = await Admin.find({
      role: { $in: ["hr", "manager"] },
      createdBy: req.user.id,
    }).select("-password");
    res.json(subAdmins);
  } catch (error) {
    res.status(500).json({ message: "Error fetching sub admins", error: error.message });
  }
};

/**
 * ✅ Delete Sub Admin
 */
export const deleteSubAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    await Admin.findByIdAndDelete(id);
    res.json({ message: "Sub-admin deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting sub admin", error: error.message });
  }
};

/**
 * ✅ Update Sub Admin (HR/Manager)
 */
export const updateSubAdmin = async (req, res) => {
  try {
    // Ensure the user is a main admin
    if (!req.user.isMainAdmin) {
      return res.status(403).json({ message: "Access Denied. Only main admin can update users." });
    }

    const { id } = req.params;
    const { name, email, password, role } = req.body;

    // Find the sub-admin by ID. The adminOnly middleware already protects this route.
    // The check for createdBy in getAllSubAdmins ensures they can only see their own sub-admins.
    const subAdmin = await Admin.findById(id);
    if (!subAdmin) return res.status(404).json({ message: "User not found." });

    // Update fields
    subAdmin.name = name || subAdmin.name;
    subAdmin.email = email || subAdmin.email;
    subAdmin.role = role || subAdmin.role;
    if (password) subAdmin.password = password; // Pass plain password, model will hash it

    await subAdmin.save();

    res.json({ message: "User updated successfully", user: subAdmin });
  } catch (error) {
    res.status(500).json({ message: "Server error during update.", error: error.message });
  }
};
/**
 * ✅ Get Admin Dashboard Data (for admin/hr/manager)
 */
export const getAdminDashboardData = async (req, res) => {
  try {
    const { id: userId, role, isMainAdmin, createdBy } = req.user;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    let empQuery = {};
    // Define the scope of employees to query based on the user's role
    if (isMainAdmin) {
      const subAdmins = await Admin.find({ createdBy: userId }).select("_id");
      const adminIds = [userId, ...subAdmins.map(a => a._id)];
      empQuery = { createdBy: { $in: adminIds } };
    } else if (["hr", "manager"].includes(role)) {
      const mainAdminId = createdBy; // Get the main admin who created this HR/Manager
      const orgAdminIds = await Admin.find({ createdBy: mainAdminId }).select("_id");
      const allTeamIds = [mainAdminId, ...orgAdminIds.map(a => a._id)];
      empQuery = { createdBy: { $in: allTeamIds } };
    } else {
      // Fallback for any other case, though should be covered by middleware
      return res.status(403).json({ message: "Access denied." });
    }

    const employeesInScope = await Employee.find(empQuery).select("_id");
    const employeeIdsInScope = employeesInScope.map(e => e._id);

    const totalEmployees = employeeIdsInScope.length;

    const todayAttendance = await Attendance.find({
      user: { $in: employeeIdsInScope },
      date: { $gte: today, $lt: tomorrow },
    });

    const onTime = todayAttendance.filter(a => a.status === "Present").length;
    const halfDay = todayAttendance.filter(a => a.status === "Half Day").length;
    const late = todayAttendance.filter(a => a.status === "Late" || a.status === "Late Login").length;
    const absent = totalEmployees - todayAttendance.length;

    // Count pending leaves for employees in scope
    const pendingLeaveCount = await Leave.countDocuments({
      employeeId: { $in: employeeIdsInScope },
      status: "Pending",
    });

    res.json({
      totalEmployees,
      attendance: { total: totalEmployees,halfDay, onTime, late, absent },
      pendingLeaveCount,
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching dashboard data", error: error.message });
  }
};

export const getAllAdmins = async (req, res) => {
  try {
    const { createdBy } = req.query;

    // If the requesting user is main admin (isMainAdmin) show all admins
    const isMainAdmin = req.user?.isMainAdmin || false;

    let query = {};
    if (!isMainAdmin && createdBy) {
      // only show admins created by the given admin (HR/Manager's created sub-admins)
      query = { createdBy };
    } else if (!isMainAdmin && !createdBy) {
      // fallback: if not main admin and no createdBy provided, restrict to createdBy = req.user.id
      query = { createdBy: req.user.id };
    } // if main admin, query stays empty => fetch all

    const admins = await Admin.find(query).select("_id name email role createdBy");
    res.json(admins);
  } catch (err) {
    console.error("Failed to fetch admins:", err);
    res.status(500).json({ message: "Failed to fetch admins" });
  }
};
/**
 * ✅ Get Birthdays
 */
export const getBirthdays = async (req, res) => {
  try {
    const { id: userId, role, isMainAdmin, createdBy } = req.user;

    let adminIds = [];

    if (isMainAdmin) {
      const subAdmins = await Admin.find({ createdBy: userId }).select("_id");
      adminIds = [userId, ...subAdmins.map(a => a._id)];
    }

    else if (["hr", "manager"].includes(role)) {
      const mainAdminId = createdBy; 
      const orgAdminIds = await Admin.find({ createdBy: mainAdminId }).select("_id");
      adminIds = [mainAdminId, ...orgAdminIds.map(a => a._id)];
    }

    else {
      adminIds = [userId];
    }

    const employees = await Employee.find({ createdBy: { $in: adminIds } });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const birthdays = employees.filter((emp) => {
      if (!emp.birthday) return false;
      const bday = new Date(emp.birthday);
      return (
        bday.getDate() === today.getDate() &&
        bday.getMonth() === today.getMonth()
      );
    });

    res.json(birthdays);

  } catch (error) {
    console.error("Birthday fetch error:", error);
    res.status(500).json({
      message: "Error fetching birthdays",
      error: error.message,
    });
  }
};



/**
 * ✅ Send Birthday Wish (Dummy)
 */
export const sendBirthdayWish = async (req, res) => {
  try {
    const employeeId = req.params.employeeId;

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Create notification for employee
    await new Notification({
      userId: employeeId,
      title: "🎉 Happy Birthday!",
      message: `Dear ${employee.name}, your admin has sent you birthday wishes! 🎂`,
      type: "birthday",
    }).save();

    res.json({ message: "Birthday wish sent successfully!" });

  } catch (error) {
    console.error("Birthday wish error:", error);
    res.status(500).json({ message: "Error sending birthday wish", error: error.message });
  }
};

/**
 * ✅ Approve / Reject Employee Updates
 */
export const approveEmployeeUpdate = async (req, res) => {
  try {
    const employeeId = req.params.id;
    const employee = await Employee.findById(employeeId);

    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    if (!employee.pendingUpdates || Object.keys(employee.pendingUpdates).length === 0) {
      return res.status(400).json({ message: "No pending updates to approve" });
    }

    // Apply updates
    Object.assign(employee, employee.pendingUpdates);

    // Clear pending
    employee.pendingUpdates = null;
    // Mark profile verified (optional)
    employee.status = "Verified";
    employee.verified = true;

    await employee.save();

    return res.json({
      message: "Employee changes approved successfully",
      employee,
    });

  } catch (error) {
    console.error("Approve error:", error);
    res.status(500).json({ message: "Server error while approving changes" });
  }
};


export const rejectEmployeeUpdate = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee)
      return res.status(404).json({ message: "Employee not found" });

    if (employee.pendingUpdates) {
      // merge pending into main data (but mark rejected)
      Object.assign(employee, employee.pendingUpdates);
    }

    employee.pendingUpdates = null;
    employee.status = "Rejected";   // keep status so employee knows it is rejected

    await employee.save();

    return res.json({
      message: "Employee update rejected",
      employee,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Rejection error", error: error.message });
  }
};

export const verifyEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await Employee.findById(id);
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    employee.verified = true;
    employee.status = "Verified";
    await employee.save();

    return res.json({ message: "Employee verified", employee });
  } catch (error) {
    console.error("verifyEmployee error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

/**
 * ✅ Update Admin Settings
 */
export const updateAdminSettings = async (req, res) => {
  try {
    if (!req.user?.isMainAdmin) {
      return res.status(403).json({ message: "Access denied. Only main admin can update settings." });
    }

    const payload = req.body || {};
    // Ensure numeric conversion for minutes
    if (payload.lateGraceMinutes !== undefined) {
      payload.lateGraceMinutes = Number(payload.lateGraceMinutes);
    }

    // Use a clean object with only the allowed settings
    const canonical = {
      officeStartTime: payload.officeStartTime ?? payload.office_start_time,
      officeEndTime: payload.officeEndTime ?? payload.office_end_time,
      lateGraceMinutes: payload.lateGraceMinutes,
      halfDayLoginCutoff: payload.halfDayLoginCutoff, // Use the standardized name
      halfDayCheckoutCutoff: payload.halfDayCheckoutCutoff ?? payload.half_day_checkout_cutoff,
      autoCheckoutTime: payload.autoCheckoutTime ?? payload.auto_checkout_time,
      breakDurationMinutes: payload.breakDurationMinutes !== undefined ? Number(payload.breakDurationMinutes) : undefined,
    };

    const admin = await Admin.findById(req.user.id);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    admin.attendanceSettings = {
      ...(admin.attendanceSettings ? admin.attendanceSettings.toObject?.() ?? admin.attendanceSettings : {}),
      ...Object.fromEntries(Object.entries(canonical).filter(([_, v]) => v !== undefined))
    };

    await admin.save();
    return res.json({ message: "Attendance settings updated", attendanceSettings: admin.attendanceSettings });
  } catch (err) {
    console.error("updateAdminSettings error:", err);
    return res.status(500).json({ message: "Failed to update settings", error: err.message });
  }
};

/**
 * @desc    Get all users (Admins and Employees) for chat lists
 * @route   GET /api/admin/chat-users
 * @access  Private (Admins and Employees)
 */
export const getAllUsersForChat = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    // Fetch all admins and employees, excluding the current user
    const admins = await Admin.find({ _id: { $ne: currentUserId } }).select("_id name email role").lean();
    const employees = await Employee.find({ _id: { $ne: currentUserId } }).select("_id name email position").lean();

    // Combine and format the user lists
    const users = [
      ...admins.map(u => ({ ...u, userType: 'admin' })),
      ...employees.map(u => ({ ...u, role: u.position, userType: 'employee' }))
    ];

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to load users for chat", error: error.message });
  }
};

/**
 * @desc    Get all admins for an employee to chat with
 * @route   GET /api/admin/chat-admins-for-employee
 * @access  Private (Employees)
 */
export const getAdminsForEmployeeChat = async (req, res) => {
  try {
    const admins = await Admin.find().select("_id name email role").lean();
    res.json(admins.map(u => ({ ...u, userType: 'admin' })));
  } catch (error) {
    res.status(500).json({ message: "Failed to load admins for chat", error: error.message });
  }
};

/**
 * ✅ Get Admin Settings
 */
export const getAdminSettings = async (req, res) => {
  try {
    const admin = await Admin.findById(req.user.id).select("attendanceSettings");

    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Return attendance settings
    return res.json({
      message: "Admin settings fetched successfully",
      attendanceSettings: admin.attendanceSettings || {},
    });
  } catch (error) {
    console.error("Error fetching admin settings:", error);
    return res.status(500).json({
      message: "Failed to fetch admin settings",
      error: error.message,
    });
  }
};
