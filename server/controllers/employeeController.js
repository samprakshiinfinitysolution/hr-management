
// server/controllers/employeeController.js
import Employee from "../models/employeeModel.js";
import Admin from "../models/adminModel.js";
import Notification from "../models/notificationModel.js"; // <-- added
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { jwtSecret } from "../config/config.js";
import Attendance from "../models/attendanceModel.js"; // if used
// ... other imports if required

export const loginEmployee = async (req, res) => {
  try {
    const { email, password } = req.body;

    const employee = await Employee.findOne({ email: email.toLowerCase() });
    if (!employee) {
      return res.status(400).json({ message: "Employee not found" });
    }

    const isMatch = await bcrypt.compare(password, employee.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    // -----------------------------------
    // ACCESS TOKEN (Short Expiry)
    // -----------------------------------
    const accessToken = jwt.sign(
      {
        id: employee._id,
        role: "employee",
        adminId: employee.createdBy || employee.adminId,
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" } // short expiry for testing
    );

    // -----------------------------------
    // REFRESH TOKEN → HttpOnly Cookie
    // -----------------------------------
    const refreshToken = jwt.sign(
      {
        id: employee._id,
      },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: "7d" }
    );

    // Send HttpOnly cookie
    res.cookie("refreshToken_Employee", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", 
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: "/", 
    });

    // Do NOT send refresh token in response
    return res.json({
      accessToken,
      employee: {
        _id: employee._id,
        name: employee.name,
        email: employee.email,
        adminId: employee.createdBy || employee.adminId,
      },
    });
  } catch (error) {
    console.error("loginEmployee error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

export const refreshEmployeeAccessToken = async (req, res) => {
  try {
    // Read refresh token from HttpOnly cookie
    const refreshToken = req.cookies?.refreshToken_Employee;

    if (!refreshToken) {
      return res.status(401).json({ message: "Refresh token missing" });
    }

    let decoded;
    try {
      decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired refresh token" });
    }

    const employee = await Employee.findById(decoded.id);
    if (!employee) {
      return res.status(404).json({ message: "Employee not found" });
    }

    // Create new access token
    const newAccessToken = jwt.sign(
      {
        id: employee._id,
        role: "employee",
        adminId: employee.createdBy || employee.adminId,
      },
      process.env.JWT_SECRET,
      { expiresIn: "15m" } // for testing
    );

    return res.json({ accessToken: newAccessToken });
  } catch (error) {
    console.error("refreshEmployeeAccessToken error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const logoutEmployee = (req, res) => {
  try {
    res.clearCookie("refreshToken_Employee", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });

    return res.json({ message: "Employee logged out" });
  } catch (err) {
    console.error("logoutEmployee error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};


// GET PROFILE (Employee)
export const getProfile = async (req, res) => {
  try {
    const employee = await Employee.findById(req.user.id).select("-password");
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    // Merge original + pendingUpdates (so employee always sees what he filled)
    const merged = {
      ...employee.toObject(),
      ...(employee.pendingUpdates || {})
    };

    return res.json(merged);

  } catch (err) {
    console.error("getProfile error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const updateProfile = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const employee = await Employee.findById(employeeId);

    if (!employee)
      return res.status(404).json({ message: "Employee not found" });

    if ((employee.editCount || 0) >= 2) {
      return res
        .status(403)
        .json({ message: "Profile update limit reached (2 times)" });
    }

    const allowedFields = [
      "name", "email", "phone", "alternateNumber", "address",
      "highestQualification", "yearOfPassing","accountHolder","accountNumber",
      "ifsc","bankName","idType","idNumber","emergencyName","emergencyRelation",
      "emergencyNumber","birthday","image","department","jobType","position"
    ];

    const aliasMap = {
      fullName: "name",
      contact: "phone",
    };

    const updates = {};
    for (const key of Object.keys(req.body || {})) {
      const canonicalKey = aliasMap[key] || key;
      if (allowedFields.includes(canonicalKey)) {
        updates[canonicalKey] = req.body[key];
      }
    }

    // Save pending changes
    employee.pendingUpdates = {
      ...(employee.pendingUpdates || {}),
      ...updates,
    };

    employee.status = "Pending";
    employee.editCount = (employee.editCount || 0) + 1;

    await employee.save();

    // Return merged preview data (VERY IMPORTANT)
    const mergedData = {
      ...employee.toObject(),
      ...employee.pendingUpdates, // override with new values
    };

    return res.json({
      message: "Update request sent",
      employee: mergedData,
    });

  } catch (error) {
    console.error("updateProfile:", error.message);
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

// UPLOAD PROFILE IMG -> (if you have a separate route for multer, keep it)
// This route assumes upload middleware stores file path in req.file.path
export const uploadProfileImg = async (req, res) => {
  try {
    // If route used by logged-in user to update their image immediately:
    if (!req.user?.id) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    const fileUrl = req.file?.path || req.file?.filename || null;
    if (!fileUrl) return res.status(400).json({ message: "No file uploaded" });

    // If you want: directly save to employee.image OR return fileUrl for client to include in submission
    // Here we will return fileUrl so client can submit it with pending update
    return res.json({ message: "Image uploaded", fileUrl });
  } catch (err) {
    console.error("uploadProfileImg error:", err);
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
    console.error("deleteProfileImg error:", err);
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
    console.error("getEmployees error:", error);
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
      "idType", "idNumber", "birthday", "image", "password", "alternateNumber"
    ];

    const updates = {};
    for (const field of Object.keys(req.body || {})) {
      if (allowedFields.includes(field)) updates[field] = req.body[field];
      // Accept some aliases
      if (field === "fullName" && !updates.name) updates.name = req.body[field];
      if (field === "contact" && !updates.phone) updates.phone = req.body[field];
    }

    if (updates.password) {
      const salt = await bcrypt.genSalt(10);
      updates.password = await bcrypt.hash(updates.password, salt);
    }

    const employee = await Employee.findOneAndUpdate(query, updates, { new: true }).select("-password");
    if (!employee) return res.status(404).json({ message: "Employee not found or unauthorized" });

    // If admin directly updated fields, clear pendingUpdates (optional)
    if (employee.pendingUpdates && Object.keys(employee.pendingUpdates).length > 0) {
      employee.pendingUpdates = null;
      employee.status = employee.verified ? "Verified" : employee.status;
      await employee.save();
    }

    res.json({ message: "Employee updated", employee });
  } catch (error) {
    console.error("updateEmployee error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
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
    console.error("deleteEmployee error:", error);
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
    console.error("getEmployeeById error:", err);
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
    employee.status = "Verified";
    await employee.save();

    return res.status(200).json({ message: "Employee verified", employee });
  } catch (error) {
    console.error("verifyEmployee error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// GET EMPLOYEE PROFILE (public for admin/employee)
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
    console.error("getEmployeeProfile error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// EMPLOYEE DASHBOARD
export const getEmployeeDashboard = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const today = new Date();
    today.setHours(0,0,0,0);
    const attendance = await Attendance.find({
      user: employeeId,
      date: { $gte: today, $lt: new Date(today.getTime() + 24*60*60*1000) },
    });
    res.json({ attendance });
  } catch (err) {
    console.error("getEmployeeDashboard error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// Admin/Employee Chat lists (unchanged)
// export const getAllAdminsForChat = async (req, res) => {
//   try {
//     const admins = await Admin.find().select("_id name email role");
//     res.json(admins.map(u => ({ ...u.toObject(), userType: 'admin' })));
//   } catch (error) {
//     console.error("getAllAdminsForChat error:", error);
//     res.status(500).json({ message: "Failed to load admins" });
//   }
// };
export const getAllAdminsForChat = async (req, res) => {
  try {
    const user = req.user;
    let admins = [];

    if (user.role === "superAdmin") {
      admins = await Admin.find().select("_id name email role createdBy");
    }

    else if (user.role === "admin") {
      admins = await Admin.find({ createdBy: user.id })
        .select("_id name email role createdBy");
    }

    else if (user.role === "hr" || user.role === "manager") {
      admins = await Admin.find({ _id: user.createdBy })
        .select("_id name email role createdBy");
    }

    else if (user.role === "employee") {
      admins = await Admin.find({
        $or: [
          { _id: user.createdBy },
          { createdBy: user.createdBy }
        ]
      }).select("_id name email role createdBy");
    }

    res.json(admins.map(a => ({ ...a.toObject(), userType: "admin" })));

  } catch (error) {
    console.error("getAllAdminsForChat error:", error);
    res.status(500).json({ message: "Failed to load admins" });
  }
};


// export const getAllEmployeesForChat = async (req, res) => {
//   try {
//     const employees = await Employee.find().select("_id name email position");
//     res.json(employees.map(u => ({ ...u.toObject(), userType: 'employee' })));
//   } catch (error) {
//     console.error("getAllEmployeesForChat error:", error);
//     res.status(500).json({ message: "Failed to load employees" });
//   }
// };

export const getAllEmployeesForChat = async (req, res) => {
  try {
    const user = req.user;

    let employees = [];

    if (user.role === "superAdmin") {
      employees = await Employee.find().select("_id name email position createdBy");
    }

    else if (user.role === "admin") {
      employees = await Employee.find({ createdBy: user.id })
        .select("_id name email position createdBy");
    }

    else if (user.role === "hr" || user.role === "manager") {
      employees = await Employee.find({ createdBy: user.createdBy })
        .select("_id name email position createdBy");
    }

    else if (user.role === "employee") {
      employees = await Employee.find({
        createdBy: user.createdBy,
        _id: { $ne: user.id },
      }).select("_id name email position createdBy");
    }

    res.json(employees.map(e => ({ ...e.toObject(), userType: "employee" })));

  } catch (error) {
    console.error("getAllEmployeesForChat error:", error);
    res.status(500).json({ message: "Failed to load employees" });
  }
};

export const getAllEmployeesPublic = async (req, res) => {
  try {
    const employees = await Employee.find().select("_id name email position");
    res.json(employees);
  } catch (error) {
    console.error("getAllEmployeesPublic error:", error);
    res.status(500).json({ message: "Failed to load employees" });
  }
};
