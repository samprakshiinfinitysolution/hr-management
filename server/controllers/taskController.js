
import Task from "../models/taskModel.js";
import Notification from "../models/notificationModel.js";
import Employee from "../models/employeeModel.js";
import Admin from "../models/adminModel.js";

// CREATE TASK
export const createTask = async (req, res) => {
  try {
    const { title, description, assignedTo, dueDate, priority, notes, attachments } = req.body;

    const employee = await Employee.findById(assignedTo);
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    const { id: userId, role, isMainAdmin } = req.user;

    let empQuery;
    if (isMainAdmin) {
      const subAdmins = await Admin.find({ createdBy: userId }).select("_id");
      const adminIds = [userId, ...subAdmins.map(a => a._id)];
      empQuery = { _id: assignedTo, createdBy: { $in: adminIds } };
    } else if (["hr", "manager"].includes(role)) {
      const mainAdminId = req.user.createdBy;
      const orgAdminIds = await Admin.find({ createdBy: mainAdminId }).select("_id");
      const allTeamIds = [mainAdminId, userId, ...orgAdminIds.map(a => a._id)];
      empQuery = { _id: assignedTo, createdBy: { $in: allTeamIds } };
    } else {
      empQuery = { _id: assignedTo, createdBy: userId };
    }

    if (!await Employee.findOne(empQuery)) return res.status(403).json({ message: "Unauthorized" });

    const task = new Task({
      title,
      description,
      assignedTo,
      assignedBy: userId,
      createdBy: userId,
      dueDate: new Date(dueDate),
      priority: priority || "Medium",
      notes,
      attachments: attachments || [],
    });

    await task.save();

    // Notify employee
    await new Notification({
      title: "New Task Assigned",
      message: `You have a new task: "${title}". Due: ${task.dueDate.toDateString()}.`,
      type: "task",
      userId: assignedTo,
      createdBy: userId,
      link: "/employee/dashboard/tasks", // Link for employee to view their tasks
    }).save();

    res.status(201).json({ message: "Task created", task });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// GET ADMIN TASKS
export const getAdminTasks = async (req, res) => {
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

    const tasks = await Task.find({ assignedTo: { $in: employeeIds } })
      .populate("assignedTo", "name position")
      .sort({ dueDate: 1 });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// GET EMPLOYEE TASKS
export const getEmployeeTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ assignedTo: req.user.id })
      .populate("assignedBy", "name")
      .sort({ dueDate: 1 });

    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// UPDATE TASK STATUS
export const updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const task = await Task.findById(id);
    if (!task) return res.status(404).json({ message: "Task not found" });

    if (task.assignedTo.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    task.status = status;
    await task.save();

    // Notify admin about the status update
    await new Notification({
      title: `Task Status Updated: ${task.title}`,
      message: `Employee updated task status to "${status}".`,
      type: "task",
      userId: task.assignedBy, // Notify the admin who assigned it
      createdBy: req.user.id,
      link: "/admin/dashboard/task-management", // Link for admin to view tasks
    }).save();

    res.json({ message: "Status updated", task });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE TASK
export const deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, role, isMainAdmin } = req.user;

    let query = { _id: id };
    if (isMainAdmin) {
      query = { _id: id };
    } else if (["hr", "manager"].includes(role)) {
      const mainAdmin = await Admin.findOne({ isMainAdmin: true });
      query = { _id: id, createdBy: { $in: [userId, mainAdmin?._id] } };
    } else {
      query = { _id: id, createdBy: userId };
    }

    const task = await Task.findOneAndDelete(query);
    if (!task) return res.status(404).json({ message: "Task not found or unauthorized" });

    await Notification.deleteMany({ taskId: id });

    res.json({ message: "Task deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// GET TASK NOTIFICATIONS
export const getTaskNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id, type: "task" })
      .sort({ createdAt: -1 });

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// MARK AS READ
export const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByIdAndUpdate(id, { read: true }, { new: true });
    if (!notification) return res.status(404).json({ message: "Not found" });

    res.json({ message: "Marked as read", notification });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};