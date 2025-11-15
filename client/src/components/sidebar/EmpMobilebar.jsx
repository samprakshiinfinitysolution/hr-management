import React from "react";
import {
  Home,
  Briefcase,
  FileText,
  BedSingle,
  User,
  IndianRupee,
  Settings,
  Clock,
  MessageSquare,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";

export default function EmpMobileBar() {
  const isDarkMode = useSelector((state) => state.settings.isDarkMode);

  const menuItems = [
    { name: "Home", icon: <Home size={22} />, path: "/employee" },
    { name: "Attendance", icon: <Briefcase size={22} />, path: "/employee/attendance" },
    { name: "Tasks", icon: <FileText size={22} />, path: "/employee/tasks" },
    { name: "EOD Report", icon: <Clock size={20} />, path: "/employee/eod-reports" },
    { name: "Leave", icon: <BedSingle size={22} />, path: "/employee/leave" },
    { name: "Chat", icon: <MessageSquare size={22} />, path: "/employee/chat" },
    { name: "Profile", icon: <User size={22} />, path: "/employee/profile" },
    { name: "Salary Slip", icon: <IndianRupee size={22} />, path: "/employee/salary-slip" },
    { name: "Settings", icon: <Settings size={22} />, path: "/employee/setting" },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-md">
      {/* Icon Row */}
      <div className="flex justify-around items-center py-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-16 p-1 rounded-md transition-colors ${
                isActive
                  ? "text-blue-600 dark:text-white"
                  : "text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-white"
              }`
            }
          >
            {item.icon}
            <span className="text-[11px] mt-1">{item.name.split(" ")[0]}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}
