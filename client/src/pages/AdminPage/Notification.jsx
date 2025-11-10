import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../../utils/api";
import NotificationsNoneIcon from "@mui/icons-material/NotificationsNone";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import toast, { Toaster } from "react-hot-toast";
const getIcon = (type) => {
  switch (type) {
    case "employee":
      return <NotificationsActiveIcon className="text-blue-600" />;
    case "system":
      return <NotificationsNoneIcon className="text-green-600" />;
    case "alert":
      return <WarningAmberIcon className="text-red-600" />;
    default:
      return <NotificationsNoneIcon className="text-gray-500" />;
  }
};

const Notification = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch all notifications
  const fetchNotifications = async () => {
    try {
      const res = await API.get("/notifications");
      setNotifications(res.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setLoading(false);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await API.put("/notifications/mark-read");
      fetchNotifications(); // reload after update
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  // Delete a notification when clicked
  const handleNotificationClick = async (event, notification) => {
    // Prevent the default link navigation so we can handle it manually
    event.preventDefault();

    try {
      // Optimistically remove from UI
      setNotifications((prev) => prev.filter((n) => n._id !== notification._id));
      // Call API to delete from DB
      await API.delete(`/notifications/${notification._id}`);
      toast.success("Notification cleared!");

      // Navigate programmatically after successful deletion
      if (notification.link && notification.link !== "#") {
        navigate(notification.link);
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast.error("Failed to clear notification.");
      // Optional: If API fails, re-fetch to get the correct state
      fetchNotifications();
    }
  };
  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <div className="p-4 sm:p-6 bg-white dark:bg-gray-800 min-h-[calc(100vh-120px)] sm:min-h-screen max-w-full sm:max-w-3xl mx-auto rounded-lg shadow-lg"><Toaster />
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-white flex items-center gap-2">
          <NotificationsNoneIcon className="text-blue-600" />
          Notifications
        </h1>
        <button
          onClick={handleMarkAllAsRead}
          className="text-sm text-blue-600 hover:underline"
        >
          Mark all as read
        </button>
      </div>

      {/* Notification List */}
      <div className="space-y-4">
        {loading ? (
          <p className="text-gray-500 dark:text-gray-400 text-center mt-10">Loading...</p>
        ) : notifications.length > 0 ? (
          notifications.map((note) => (
            <Link
              key={note._id}
              to={note.link || "#"} // Navigate to the link, or nowhere if not provided
              onClick={(e) => handleNotificationClick(e, note)}
            >
              <div
                className={`bg-white dark:bg-gray-700 rounded-lg shadow-sm p-4 border border-gray-100 dark:border-gray-600 hover:shadow-md transition flex gap-3 items-start ${
                  note.read ? "opacity-60 bg-gray-50 dark:bg-gray-700/50" : ""
                }`}
              >
                <div className="mt-1">{getIcon(note.type)}</div>
                <div>
                  <h2 className="text-lg font-medium text-gray-800 dark:text-gray-100">{note.title}</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-300">{note.message}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {new Date(note.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400">
            🎉 You’re all caught up! No new notifications.
          </div>
        )}
      </div>
    </div>
  );
};

export default Notification;
