import React from "react";
import {
  FaHome,
  FaUsers,
  FaChartBar,
  FaCalendarAlt,
  FaBook,
  FaComments,
} from "react-icons/fa";
import { MdTaskAlt, MdSettings, MdAttachMoney, MdAccessTime } from "react-icons/md";
import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";

const MobileSidebarRow = () => {
  const user = useSelector((state) => state.auth.user);
  const isDarkMode = useSelector((state) => state.settings.isDarkMode);
  const role = (user?.role || "").toLowerCase();

  const baseMenu = [
    {
      name: "Home",
      icon: <FaHome size={20} />,
      shortName: "Home",
      path: "/admin/dashboard/",
    },
    {
      name: "Employee Management",
      icon: <FaUsers size={20} />,
      shortName: "Users",
      path: "/admin/dashboard/emp-management",
    },
    {
      name: "Task/Eod Reports",
      icon: <MdTaskAlt size={20} />,
      shortName: "Tasks",
      path: "/admin/dashboard/task",
    },
    {
      name: "Attendance",
      icon: <MdAccessTime style={{ fontSize: 22 }} />,
      shortName: "Attend",
      path: "/admin/dashboard/attendance",
    },
    {
      name: "Leave",
      icon: <FaCalendarAlt size={20} />,
      shortName: "Leave",
      path: "/admin/dashboard/leave",
    },
    {
      name: "Policy",
      icon: <FaBook size={20} />,
      shortName: "Policy",
      path: "/admin/dashboard/policy",
    },
    {
      name: "Chat",
      icon: <FaComments size={20} />,
      shortName: "Chat",
      path: "/admin/dashboard/chat",
    },
    {
      name: "Salary",
      icon: <MdAttachMoney style={{ fontSize: 22 }} />,
      shortName: "Salary",
      path: "/admin/dashboard/salary",
    },
    {
      name: "Reports",
      icon: <FaChartBar size={20} />,
      shortName: "Reports",
      path: "/admin/dashboard/reports",
    },
    {
      name: "Settings",
      icon: <MdSettings size={20} />,
      shortName: "Settings",
      path: "/admin/dashboard/settings",
    },
  ];

  // Filter Menu by Role
  const menuItems = baseMenu.filter((item) => {
    if (role === "hr" && item.name === "Task/Eod Reports") return false;
    if (role === "manager" && item.name === "Salary") return false;
    return true;
  });

  return (
    <div
      className={`md:hidden ${
        isDarkMode ? "bg-gray-800 text-gray-300" : "bg-blue-600 text-white"
      }`}
    >
      {/* Icons Row */}
      <div className="flex justify-around py-2 border-b border-blue-500 dark:border-gray-700 ">
        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center text-lg cursor-pointer w-16 p-1 rounded-md transition-colors ${
                isActive
                  ? isDarkMode
                    ? "bg-gray-700 text-white"
                    : "bg-blue-700 text-white"
                  : isDarkMode
                  ? "text-gray-400 hover:bg-gray-700"
                  : "text-blue-200 hover:bg-blue-700"
              }`
            }
          >
            {item.icon}
            <span className="text-xs mt-1">{item.shortName}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
};

export default MobileSidebarRow;
