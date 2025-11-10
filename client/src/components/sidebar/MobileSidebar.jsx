import React, { useState } from "react";
import {
  // Import Link for navigation
  FaHome,
  FaUsers,
  FaChartBar,
  FaCalendarAlt,
  FaTasks,
  FaCog,
} from "react-icons/fa";
import { MdAttachMoney, MdAccessTime } from "react-icons/md";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";

const MobileSidebarRow = () => {
  const user = useSelector((state) => state.auth.user);
  const role = (user?.role || "").toLowerCase();

  const baseMenu = [
    {
      name: "Home",
      icon: <FaHome />,
      shortName: "Home",
      path: "/admin/dashboard/",
    },
    {
      name: "Employees",
      icon: <FaUsers />,
      shortName: "Users",
      path: "/admin/dashboard/emp-management",
    },
    {
      name: "Reports",
      icon: <FaChartBar />,
      shortName: "Reports",
      path: "/admin/dashboard/reports",
    },
    {
      name: "Task",
      icon: <FaTasks />,
      shortName: "Tasks",
      path: "/admin/dashboard/task",
    },
    {
      name: "Attendance",
      icon: <MdAccessTime />,
      shortName: "Attend",
      path: "/admin/dashboard/attendance",
    },
    {
      name: "Leave",
      icon: <FaCalendarAlt />,
      shortName: "Leave",
      path: "/admin/dashboard/leave",
    },
    {
      name: "Salary",
      icon: <MdAttachMoney />,
      shortName: "Salary",
      path: "/admin/dashboard/salary",
    },
    {
      name: "Settings",
      icon: <FaCog />,
      shortName: "Settings",
      path: "/admin/dashboard/settings",
    },
  ];

  // Filter Menu by Role
  const menuItems = baseMenu.filter(item => {
    if (role === "hr" && item.name === "Task") return false;
    if (role === "manager" && item.name === "Salary") return false;
    return true;
  });

  return (
    <div className="bg-blue-600 dark:bg-gray-800 text-white md:hidden ">
      {/* Icons Row */}
      <div className="flex justify-around py-2 border-b border-blue-500 dark:border-gray-700 ">
        {menuItems.map((item) => ( // Use the filtered menuItems
          <Link
            key={item.name}
            to={item.path}
            className="flex flex-col items-center text-white text-lg cursor-pointer w-16"
          >
            {item.icon}
            <span className="text-xs mt-1">{item.shortName}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default MobileSidebarRow;
