import React, { useEffect, useState, useRef } from "react";
import { Bell, Menu, Sun, Moon, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import API from "../utils/api";
import toast from "react-hot-toast";
import { toggleDarkMode } from "../features/auth/settingsSlice";

export default function EmpNavbar({ toggleSidebar }) {
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const token = localStorage.getItem("token");


  const isDarkMode = useSelector((state) => state.settings.isDarkMode);

  useEffect(() => {
    fetchUser();
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

  const fetchUser = async () => {
    try {
      const res = await API.get("/profile", { headers: { Authorization: `Bearer ${token}` } });
      setUser(res.data);
    } catch (err) {
      console.error("Error fetching user:", err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await API.get("/notifications");
      setNotifications(res.data);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  const handleNotificationClick = async (notificationId) => {

    setNotifications(prev => prev.filter(n => n._id !== notificationId));
    try {

      await API.delete(`/notifications/${notificationId}`);
    } catch (err) {
      console.error("Failed to delete notification:", err);

      fetchNotifications(); // Re-fetch on error
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    navigate("/");
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 p-4 shadow-md flex justify-between items-center z-50 transition-colors duration-300 bg-blue-600 text-white dark:bg-gray-900 dark:text-white"
    >
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="md:hidden text-white hover:text-gray-200"
        >
          <Menu size={24} />
        </button>
        <h1 className="text-xl md:text-2xl font-bold">Employee Dashboard</h1>
      </div>

      <div className="flex items-center gap-4">
        {user && (
          <p className="hidden sm:block font-medium">
            Welcome, {user.name}
          </p>
        )}

        {/* --- Dark Mode Toggle --- */}
        <button
          onClick={() => dispatch(toggleDarkMode())}
          className="p-2 rounded-full hover:bg-blue-700 dark:hover:bg-gray-700 transition"
          title="Toggle Dark Mode"
        >
          {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* --- Notifications --- */}
        <div className="relative" ref={notificationRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative"
          >
            <Bell size={24} />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-2 bg-red-500 text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {notifications.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div
              className={`${isDarkMode
                  ? "bg-gray-800 text-gray-200 border-gray-700"
                  : "bg-white text-gray-800 border-gray-200"
                } 
              fixed top-[64px] right-2 
              md:absolute md:top-auto md:right-0 md:mt-2
              w-[90%] md:w-80 
              rounded-lg shadow-lg border 
              z-[9999] max-h-96 overflow-y-auto transition-all duration-300`}
            >
              <div className="p-4 border-b dark:border-gray-700">
                <h3 className="font-semibold">Notifications</h3>
              </div>

              {notifications.length === 0 ? (
                <p className="p-4 text-gray-500 dark:text-gray-400">
                  No notifications
                </p>
              ) : (
                notifications.map((notification) => (
                  <div
                    onClick={() => handleNotificationClick(notification._id)}
                    key={notification._id}
                    className={`flex justify-between items-start p-3 border-b cursor-pointer transition ${isDarkMode
                        ? "border-gray-700 hover:bg-gray-700"
                        : "border-gray-200 hover:bg-gray-100"
                      }`}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-blue-600 dark:text-blue-400">
                        {notification.title}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <X
                      size={18}
                      className="text-gray-400 hover:text-red-500 ml-2 flex-shrink-0"
                    />
                  </div>
                ))
              )}
            </div>
          )}


        </div>

        <button
          onClick={handleLogout}
          className="bg-red-500 px-4 py-2 rounded-lg hover:bg-red-600 transition"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
