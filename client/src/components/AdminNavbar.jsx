
// components/AdminNavbar.jsx
import React, { useState, useEffect, useRef } from "react";
import { Bell, Menu, ArrowRight, Moon, Sun, X } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { toggleDarkMode } from "../features/auth/settingsSlice";
import API from "../utils/api";
import toast from "react-hot-toast";

export default function AdminNavbar({ toggleSidebar }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const isDarkMode = useSelector((state) => state.settings.isDarkMode);
  const user = useSelector((state) => state.auth.user);
  const role = (user?.role || "").toLowerCase();

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await API.get("/notifications");
      setNotifications(res.data);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  const handleLogout = () => {
    toast.success("Logout successfully");
    localStorage.clear();
    navigate("/");
  };

  const handleDarkToggle = () => {
    dispatch(toggleDarkMode());
    toast.success(isDarkMode ? "Light mode enabled" : "Dark mode enabled");
  };

  const handleNotificationClick = async (event, notification) => {
    event.preventDefault();
    setNotifications(prev => prev.filter(n => n._id !== notification._id));
    setShowNotifications(false);
    try {
      await API.delete(`/notifications/${notification._id}`);
      if (notification.link && notification.link !== "#") {
        navigate(notification.link);
      }
    } catch {
      toast.error("Failed to clear notification.");
      fetchNotifications();
    }
  };

  const handleNotificationDelete = async (event, notificationId) => {
    event.stopPropagation();
    setNotifications(prev => prev.filter(n => n._id !== notificationId));
    try {
      await API.delete(`/notifications/${notificationId}`);
    } catch {
      toast.error("Failed to delete notification.");
      fetchNotifications();
    }
  };

  // Dynamic Title
  const dashboardTitle =
    role === "admin" ? "Supar Admin Dashboard" :
    role === "hr" ? "HR Admin Dashboard" :
    role === "manager" ? "Manager Dashboard" :
    "Admin Dashboard";

  return (
    <header className={`fixed top-0 left-0 right-0 bg-blue-600 text-white p-4 shadow-md flex justify-between items-center z-50`}>
      <div className="flex items-center gap-3">
        <button onClick={toggleSidebar} className="md:hidden text-white hover:text-gray-200">
          <Menu size={24} />
        </button>
        <h1 className="text-xl md:text-2xl font-bold">{dashboardTitle}</h1>
      </div>

      <div className="flex items-center gap-4">
        {user && <p className="hidden sm:block font-medium">Welcome, {user.name}</p>}

        <button onClick={handleDarkToggle} className="p-2 rounded-full hover:bg-blue-700 transition" title="Toggle Dark Mode">
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        <div className="relative" ref={notificationRef}>
          <button onClick={() => setShowNotifications(!showNotifications)} className="relative">
            <Bell size={24} />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-2 bg-red-500 text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {notifications.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className={`bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg shadow-xl border dark:border-gray-700 max-h-96 overflow-y-auto z-50 w-[90vw] sm:w-80 fixed sm:absolute right-2 sm:right-0 top-[64px] sm:top-auto mt-0 sm:mt-2`}>
              <div className="p-3 border-b dark:border-gray-700 flex justify-between items-center">
                <h3 className="font-semibold">Notifications</h3>
                <Link to="/admin/dashboard/notification" onClick={() => setShowNotifications(false)} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                  View All <ArrowRight size={12} />
                </Link>
              </div>

              {notifications.length === 0 ? (
                <p className="p-4 text-center text-gray-500 dark:text-gray-400">No new notifications</p>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n._id}
                    onClick={(e) => handleNotificationClick(e, n)}
                    className="flex justify-between items-start p-3 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-sm cursor-pointer"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{n.title}</p>
                      <p className="text-gray-500 mt-1">{n.message}</p>
                      <p className="text-xs text-gray-400 mt-2">{new Date(n.createdAt).toLocaleString()}</p>
                    </div>
                    <button onClick={(e) => handleNotificationDelete(e, n._id)} className="ml-2 text-gray-400 hover:text-red-500" title="Delete">
                      <X size={18} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <button onClick={handleLogout} className="bg-red-500 px-3 py-2 rounded-md hover:bg-red-600 text-sm md:text-base">
          Logout
        </button>
      </div>
    </header>
  );
}