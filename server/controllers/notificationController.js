
import Notification from "../models/notificationModel.js";

// GET NOTIFICATIONS
export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// CREATE NOTIFICATION
export const createNotification = async (req, res) => {
  try {
    const { title, message, type, userId } = req.body;

    if (!title || !message || !type) {
      return res.status(400).json({ message: "Title, message, and type required" });
    }

    const recipients = userId ? [userId] : [req.user.id];

    const notifications = recipients.map(id => ({
      title,
      message,
      type,
      userId: id,
      createdBy: req.user.id,
    }));

    const created = await Notification.insertMany(notifications);
    res.status(201).json({ message: "Notification created", notifications: created });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// MARK AS READ
export const markAllAsRead = async (req, res) => {
  try {
    const { notificationId } = req.body;

    if (notificationId) {
      const notif = await Notification.findOneAndUpdate(
        { _id: notificationId, userId: req.user.id },
        { $set: { read: true } },
        { new: true }
      );
      if (!notif) return res.status(404).json({ message: "Not found" });
    } else {
      await Notification.updateMany({ userId: req.user.id }, { $set: { read: true } });
    }

    res.json({ message: "Marked as read" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// DELETE NOTIFICATION
export const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      userId: req.user.id,
    });

    if (!notification) return res.status(404).json({ message: "Not found" });

    await notification.deleteOne();
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};