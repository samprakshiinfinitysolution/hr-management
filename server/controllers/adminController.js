
// server/controllers/adminController.js
import Admin from "../models/adminModel.js";
import Employee from "../models/employeeModel.js";
import Attendance from "../models/attendanceModel.js";
import Leave from "../models/leaveModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
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

/**
 * ✅ Admin Login
 */
export const loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(404).json({ message: "User not found" });

    const match = await bcrypt.compare(password, admin.password);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      {
        id: admin._id,
        role: admin.role,
        isMainAdmin: admin.isMainAdmin,
        createdBy: admin.createdBy, // Important for sub-admins
      },
      jwtSecret,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      role: admin.role,
      name: admin.name,
        id: admin.id,  // ✅ add this

      isMainAdmin: admin.isMainAdmin,
    });
  } catch (error) {
    res.status(500).json({ message: "Login error", error: error.message });
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
    const late = todayAttendance.filter(a => a.status === "Late" || a.status === "Late Login").length;
    const absent = totalEmployees - todayAttendance.length;

    // Count pending leaves for employees in scope
    const pendingLeaveCount = await Leave.countDocuments({
      employeeId: { $in: employeeIdsInScope },
      status: "Pending",
    });

    res.json({
      totalEmployees,
      attendance: { total: totalEmployees, onTime, late, absent },
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
    const today = new Date();
    const employees = await Employee.find();

    const birthdays = employees.filter((emp) => {
      const dob = new Date(emp.dob);
      return dob.getDate() === today.getDate() && dob.getMonth() === today.getMonth();
    });

    res.json(birthdays);
  } catch (error) {
    res.status(500).json({ message: "Error fetching birthdays", error: error.message });
  }
};

/**
 * ✅ Send Birthday Wish (Dummy)
 */
export const sendBirthdayWish = async (req, res) => {
  try {
    res.json({ message: "Birthday wish sent successfully!" });
  } catch (error) {
    res.status(500).json({ message: "Error sending wish", error: error.message });
  }
};

/**
 * ✅ Approve / Reject Employee Updates
 */
export const approveEmployeeUpdate = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    employee.isApproved = true;
    await employee.save();

    res.json({ message: "Employee update approved" });
  } catch (error) {
    res.status(500).json({ message: "Approval error", error: error.message });
  }
};

export const rejectEmployeeUpdate = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    employee.isApproved = false;
    await employee.save();

    res.json({ message: "Employee update rejected" });
  } catch (error) {
    res.status(500).json({ message: "Rejection error", error: error.message });
  }
};

/**
 * ✅ Update Admin Settings
 */
export const updateAdminSettings = async (req, res) => {
  try {
    // ✅ Only main admin can change org-wide attendance settings
    if (!req.user?.isMainAdmin) {
      return res
        .status(403)
        .json({ message: "Access denied. Only main admin can update settings." });
    }

    const {
      officeStartTime,
      lateGraceMinutes,
      halfDayCutoff,
      officeEndTime,
      halfDayCheckoutCutoff,
      autoCheckoutTime,
      ...rest
    } = req.body;

    const admin = await Admin.findById(req.user.id);
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // ✅ Merge provided fields into admin.attendanceSettings
    admin.attendanceSettings = {
      ...(admin.attendanceSettings?.toObject?.() ??
        admin.attendanceSettings ??
        {}),
      ...(officeStartTime !== undefined && { officeStartTime }),
      ...(lateGraceMinutes !== undefined && { lateGraceMinutes }),
      ...(halfDayCutoff !== undefined && { halfDayCutoff }),
      ...(officeEndTime !== undefined && { officeEndTime }),
      ...(halfDayCheckoutCutoff !== undefined && { halfDayCheckoutCutoff }),
      ...(autoCheckoutTime !== undefined && { autoCheckoutTime }),
      ...rest,
    };

    await admin.save();

    return res.json({
      message: "Attendance settings updated successfully",
      attendanceSettings: admin.attendanceSettings,
    });
  } catch (error) {
    console.error("Error updating admin settings:", error);
    return res.status(500).json({
      message: "Failed to update settings",
      error: error.message,
    });
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
