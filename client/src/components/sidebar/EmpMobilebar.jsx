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
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function EmpMobileBar() {
  const navigate = useNavigate();

  const menuItems = [
    { name: "Home", icon: <Home size={22} />, path: "/employee" },
    { name: "Attendance", icon: <Briefcase size={22} />, path: "/employee/attendance" },
    { name: "Tasks", icon: <FileText size={22} />, path: "/employee/tasks" },
    { name: "EOD Report", icon: <Clock size={20} />, path: "/employee/eod-reports" },
    { name: "Leave", icon: <BedSingle size={22} />, path: "/employee/leave" },
    { name: "Profile", icon: <User size={22} />, path: "/employee/profile" },
    { name: "Salary", icon: <IndianRupee size={22} />, path: "/employee/salary-slip" },
    { name: "Settings", icon: <Settings size={22} />, path: "/employee/setting" },
  ];

  return (
    <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-md">
      {/* Icon Row */}
      <div className="flex justify-around items-center py-2">
        {menuItems.map((item) => (
          <button
            key={item.name}
            onClick={() => navigate(item.path)}
            className="flex flex-col items-center text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-white transition-all"
          >
            {item.icon}
            <span className="text-[11px] mt-1">{item.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
