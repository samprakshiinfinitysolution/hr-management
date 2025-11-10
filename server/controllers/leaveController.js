
import Leave from "../models/leaveModel.js";
import Employee from "../models/employeeModel.js";
import Admin from "../models/adminModel.js";
import Notification from "../models/notificationModel.js";

// GET ALL LEAVES (Admin/HR/Manager)
export const getAllLeaves = async (req, res) => {
  try {
    const { month, year, search } = req.query;
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

    let query = { employeeId: { $in: employeeIds } };

    if (month && year) {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0, 23, 59, 59, 999);
      query.date = { $gte: start, $lte: end };
    }

    if (search) {
      const employees = await Employee.find({
        name: { $regex: search, $options: "i" },
        _id: { $in: employeeIds },
      }).select("_id");
      query.employeeId = { $in: employees.map(emp => emp._id) };
    }

    const leaves = await Leave.find(query)
      .populate("employeeId", "name email")
      .sort({ date: -1 });

    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATE LEAVE
export const updateLeave = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
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

    const leave = await Leave.findById(id).populate({ path: 'employeeId', select: 'name createdBy' });
    if (!leave) return res.status(404).json({ message: "Leave not found" });

    leave.status = status;
    await leave.save();

    const formattedDate = leave.date.toISOString().split("T")[0];

    await Notification.create({
      title: "Leave Status Update",
      message: `Your leave for ${formattedDate} has been ${status}.`,
      type: "employee",
      userId: leave.employeeId._id,
      createdBy: userId,
      link: "/employee/dashboard/leave",
    });

    res.json(leave);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE LEAVE
export const deleteLeave = async (req, res) => {
  try {
    const { id } = req.params;
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

    const leave = await Leave.findById(id).populate({ path: 'employeeId', select: 'createdBy' });
    if (!leave) return res.status(404).json({ message: "Leave not found" });

    await leave.deleteOne();
    res.json({ message: "Leave deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// CREATE LEAVE (Employee)
export const createLeave = async (req, res) => {
  try {
    const { date, reason } = req.body;
    if (!date || !reason) return res.status(400).json({ message: "Date and reason required" });

    const employee = await Employee.findById(req.user.id);
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    const newLeave = new Leave({
      employeeId: req.user.id,
      employeeName: employee.name,
      date: new Date(date),
      reason,
      status: "Pending",
      createdBy: employee.createdBy,
    });

    await newLeave.save();

    await Notification.create({
      title: "New Leave Request",
      message: `${employee.name} requested leave for ${newLeave.date.toISOString().split("T")[0]}.`,
      type: "alert",
      userId: employee.createdBy,
      userModel: "Admin",
      link: "/admin/dashboard/leave",
      createdBy: employee.createdBy,
    });

    res.status(201).json({ message: "Leave requested", leave: newLeave });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// GET MY LEAVES (Employee)
export const getMyLeaves = async (req, res) => {
  try {
    const leaves = await Leave.find({ employeeId: req.user.id }).sort({ date: -1 });
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// GET LEAVE SUMMARY (Employee)
export const getLeaveSummary = async (req, res) => {
  try {
    const leaves = await Leave.find({ employeeId: req.user.id });

    const summary = {
      totalLeaves: leaves.length,
      approved: leaves.filter(l => l.status === "Approved").length,
      rejected: leaves.filter(l => l.status === "Rejected").length,
      pending: leaves.filter(l => l.status === "Pending").length,
    };

    res.json(summary);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};