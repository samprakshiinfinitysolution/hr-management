import Employee from "../models/employeeModel.js";
import Admin from "../models/adminModel.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { jwtSecret } from "../config/config.js";

// LOGIN EMPLOYEE
export const loginEmployee = async (req, res) => {
  try {
    const { email, password } = req.body;
    const employee = await Employee.findOne({ email: email.toLowerCase() });
    if (!employee) return res.status(400).json({ message: "Employee not found" });

    const isMatch = await bcrypt.compare(password, employee.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({
      id: employee._id,
      role: "employee",
      adminId: employee.adminId,
    }, jwtSecret, { expiresIn: "7d" });

    res.json({
      token,
      employee: { _id: employee._id, name: employee.name, email, adminId: employee.adminId },
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// GET PROFILE (Employee)
export const getProfile = async (req, res) => {
  try {
    const profile = await Employee.findById(req.user.id).select("-password");
    if (!profile) return res.status(404).json({ message: "Employee not found" });

    res.json(profile);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATE PROFILE (Employee)
export const updateProfile = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    if (employee.editCount >= 2) {
      return res.status(403).json({ message: "Profile update limit reached (2 times)" });
    }

    const allowedFields = [
      "name", "phone", "address", "highestQualification", "yearOfPassing",
      "accountHolder", "accountNumber", "ifsc", "bankName",
      "idType", "idNumber", "emergencyName", "emergencyRelation",
      "emergencyNumber", "alternateNumber", "birthday", "image", "contact", "fullName"
    ];
    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    }

    employee.pendingUpdates = updates;
    employee.status = "Pending";
    employee.editCount = (employee.editCount || 0) + 1;
    await employee.save();

    // Notify admin about the update request
    await new Notification({
      title: "Profile Update Request",
      message: `${employee.name} has requested to update their profile.`,
      type: "alert",
      userId: employee.createdBy,
      link: `/admin/dashboard/employee/${employeeId}`,
    }).save();

    res.json({ message: "Update request sent", employee });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// CHANGE PASSWORD (Employee)
export const changeEmployeePassword = async (req, res) => {
  try {
    const { password, confirmPassword } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters long." });
    }
    if (confirmPassword && password !== confirmPassword) {
      return res.status(400).json({ message: "Password and confirm password do not match." });
    }

    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(password, salt);

    const updated = await Employee.findByIdAndUpdate(
      req.user.id,
      { password: hashed },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Employee not found." });

    return res.json({ message: "Password updated successfully." });
  } catch (error) {
    console.error("changeEmployeePassword error:", error);
    res.status(500).json({ message: "Server error while updating password." });
  }
};

// UPLOAD PROFILE IMG
export const uploadProfileImg = async (req, res) => {
  try {
    const updated = await Employee.findByIdAndUpdate(
      req.user.id,
      { image: req.file.path },
      { new: true }
    ).select("-password");
    res.json({ message: "Image uploaded", employee: updated });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE PROFILE IMG
export const deleteProfileImg = async (req, res) => {
  try {
    const updated = await Employee.findByIdAndUpdate(
      req.user.id,
      { image: null },
      { new: true }
    ).select("-password");
    res.json({ message: "Image deleted", employee: updated });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// GET EMPLOYEES (Admin/HR/Manager)
export const getEmployees = async (req, res) => {
  try {
    const { id: userId, role, isMainAdmin } = req.user;

    let query;
    if (isMainAdmin) {
      const subAdmins = await Admin.find({ createdBy: userId }).select("_id");
      const adminIds = [userId, ...subAdmins.map(a => a._id)];
      query = { createdBy: { $in: adminIds } };
    } else if (["hr", "manager"].includes(role)) {
      const mainAdminId = req.user.createdBy; // Use createdBy from token
      const orgAdminIds = await Admin.find({ createdBy: mainAdminId }).select("_id");
      const allTeamIds = [mainAdminId, ...orgAdminIds.map(a => a._id)];
      query = { createdBy: { $in: allTeamIds } };
    } else {
      query = { createdBy: userId };
    }

    const employees = await Employee.find(query);
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATE EMPLOYEE (Admin/HR/Manager)
export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, role, isMainAdmin } = req.user;

    let query;
    if (isMainAdmin) {
      const subAdmins = await Admin.find({ createdBy: userId }).select("_id");
      const adminIds = [userId, ...subAdmins.map(a => a._id)];
      query = { _id: id, createdBy: { $in: adminIds } };
    } else if (["hr", "manager"].includes(role)) {
      const creatorAdmin = await Admin.findById(req.user.createdBy);
      const orgAdminIds = await Admin.find({ createdBy: creatorAdmin._id }).select("_id");
      const allTeamIds = [creatorAdmin._id, ...orgAdminIds.map(a => a._id)];
      query = { _id: id, createdBy: { $in: allTeamIds } };
    } else {
      query = { _id: id, createdBy: userId };
    }

    const allowedFields = [
      "name", "email", "phone", "position", "salary", "address",
      "department", "jobType", "emergencyName", "emergencyRelation",
      "emergencyNumber", "highestQualification", "yearOfPassing",
      "accountHolder", "accountNumber", "ifsc", "bankName",
      "idType", "idNumber", "birthday", "image", "password"
    ];

    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    if (updates.password) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(updates.password, salt);
    }

    const employee = await Employee.findOneAndUpdate(query, updates, { new: true }).select("-password");
    if (!employee) return res.status(404).json({ message: "Employee not found or unauthorized" });

    res.json({ message: "Employee updated", employee });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE EMPLOYEE
export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, role, isMainAdmin } = req.user;

    let query;
    if (isMainAdmin) {
      const subAdmins = await Admin.find({ createdBy: userId }).select("_id");
      const adminIds = [userId, ...subAdmins.map(a => a._id)];
      query = { _id: id, createdBy: { $in: adminIds } };
    } else if (["hr", "manager"].includes(role)) {
      const creatorAdmin = await Admin.findById(req.user.createdBy);
      const orgAdminIds = await Admin.find({ createdBy: creatorAdmin._id }).select("_id");
      const allTeamIds = [creatorAdmin._id, ...orgAdminIds.map(a => a._id)];
      query = { _id: id, createdBy: { $in: allTeamIds } };
    } else {
      query = { _id: id, createdBy: userId };
    }

    const employee = await Employee.findOneAndDelete(query);
    if (!employee) return res.status(404).json({ message: "Employee not found or unauthorized" });

    res.json({ message: "Employee deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// GET EMPLOYEE BY ID
export const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, role, isMainAdmin } = req.user;

    let query;
    if (isMainAdmin) {
      const subAdmins = await Admin.find({ createdBy: userId }).select("_id");
      const adminIds = [userId, ...subAdmins.map(a => a._id)];
      query = { _id: id, createdBy: { $in: adminIds } };
    } else if (["hr", "manager"].includes(role)) {
      const creatorAdmin = await Admin.findById(req.user.createdBy);
      const orgAdminIds = await Admin.find({ createdBy: creatorAdmin._id }).select("_id");
      const allTeamIds = [creatorAdmin._id, ...orgAdminIds.map(a => a._id)];
      query = { _id: id, createdBy: { $in: allTeamIds } };
    } else {
      query = { _id: id, createdBy: userId };
    }

    const employee = await Employee.findOne(query).select("-password");
    if (!employee) return res.status(404).json({ message: "Employee not found or unauthorized" });

    res.json(employee);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// VERIFY EMPLOYEE
export const verifyEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, role, isMainAdmin } = req.user;

    let query;
    if (isMainAdmin) {
      const subAdmins = await Admin.find({ createdBy: userId }).select("_id");
      const adminIds = [userId, ...subAdmins.map(a => a._id)];
      query = { _id: id, createdBy: { $in: adminIds } };
    } else if (["hr", "manager"].includes(role)) {
      const creatorAdmin = await Admin.findById(req.user.createdBy);
      const orgAdminIds = await Admin.find({ createdBy: creatorAdmin._id }).select("_id");
      const allTeamIds = [creatorAdmin._id, ...orgAdminIds.map(a => a._id)];
      query = { _id: id, createdBy: { $in: allTeamIds } };
    } else {
      query = { _id: id, createdBy: userId };
    }

    const employee = await Employee.findOne(query);
    if (!employee) return res.status(404).json({ message: "Employee not found or unauthorized" });

    employee.verified = true;
    await employee.save();

    res.status(200).json({ message: "Employee verified", employee });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// GET EMPLOYEE PROFILE
export const getEmployeeProfile = async (req, res) => {
  try {
    const empId = req.params.id;

    if (req.user.role === "employee" && req.user.id !== empId) {
      return res.status(403).json({ message: "Access denied" });
    }

    const employee = await Employee.findById(empId).select("-password");
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    res.json(employee);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// EMPLOYEE DASHBOARD
export const getEmployeeDashboard = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const today = new Date();
    const attendance = await Attendance.find({
      user: employeeId,
      date: today,
    });
    res.json({ attendance });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};

// get asdmin list for employee chat user list
// 🟢 Get all admins (Admin, HR, Manager) for employee chat
export const getAllAdminsForChat = async (req, res) => {
  console.log("✅ getAllAdminsForChat hit by:", req.user?.id);
  try {
    const admins = await Admin.find().select("_id name email role");
    console.log("✅ Admin count:", admins.length);
    res.json(admins);
  } catch (error) {
    console.error("❌ Error fetching admins for chat:", error);
    res.status(500).json({ message: "Failed to load admins" });
  }
};

// ✅ Employees list for EmployeeChat
export const getAllEmployeesForChat = async (req, res) => {
  console.log("✅ getAllEmployeesForChat hit by:", req.user?.id);
  try {
    const employees = await Employee.find().select("_id name email role");
    console.log("✅ Employee count:", employees.length);
    res.json(employees);
  } catch (error) {
    console.error("❌ Error fetching employees for chat:", error);
    res.status(500).json({ message: "Failed to load employees" });
  }
};
export const getAllEmployeesPublic = async (req, res) => {
  try {
    const employees = await Employee.find().select("_id name email role");
    res.json(employees);
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({ message: "Failed to load employees" });
  }
};

