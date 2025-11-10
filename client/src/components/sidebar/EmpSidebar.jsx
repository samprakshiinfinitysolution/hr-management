import { NavLink, useLocation } from "react-router-dom";
import {
  Home as HomeIcon,
  Briefcase,
  FileText,
  BedSingle,
  User,
  IndianRupee,
  MessageSquare,
  Settings,
  Clock,
} from "lucide-react";

export default function EmpSidebar({ isOpen }) {
  const menuItems = [
    { name: "Home", icon: <HomeIcon size={20} />, path: "/employee" },
    { name: "Attendance", icon: <Briefcase size={20} />, path: "/employee/attendance" },
    { name: "Tasks", icon: <FileText size={20} />, path: "/employee/tasks" },
    { name: "EOD Report", icon: <Clock size={20} />, path: "/employee/eod-reports" },
    { name: "Leave", icon: <BedSingle size={20} />, path: "/employee/leave" },
    { name: "Chat", icon: <MessageSquare size={20} />, path: "/employee/chat" },
    { name: "Profile", icon: <User size={20} />, path: "/employee/profile" },
    { name: "Salary Slip", icon: <IndianRupee size={20} />, path: "/employee/salary-slip" }, // Corrected path
    { name: "Settings", icon: <Settings size={20} />, path: "/employee/setting" },
  ];

  return (
    <div className={`  shadow-lg h-full flex flex-col gap-4 p-4 transition-all duration-300 ${isOpen ? "w-64" : "w-20"}`}>
      {/* Header */}
      <div className={`text-blue-600 dark:text-blue-400 text-lg font-bold border-b dark:border-gray-700 pb-2 mt-4 px-2 ${!isOpen && "text-center"}`}>
        Employee Panel
      </div>

      {/* Menu Items */}
      <div className="flex flex-col mt-2 gap-2">
        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2 rounded-lg transition-colors duration-200 ${
                isActive ? "bg-blue-600" : "  hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-blue-600 dark:hover:text-white"
              } ${!isOpen && "justify-center"}`
            }
          >
            {item.icon}
            {isOpen && <span>{item.name}</span>}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
