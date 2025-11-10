// components/AdminSidebar.jsx
import { NavLink } from "react-router-dom";
import { FaHome, FaUsers, FaChartBar, FaCalendarAlt, FaBook, FaComments } from "react-icons/fa";
import { MdTaskAlt, MdSettings } from "react-icons/md";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import { useSelector } from "react-redux";

export default function AdminSidebar() {
  const isDarkMode = useSelector((state) => state.settings.isDarkMode);
  const user = useSelector((state) => state.auth.user);
  const role = (user?.role || "").toLowerCase();

  // Panel Title
  const panelTitle =
    role === "admin" ? "Main Admin Panel" :
    role === "hr" ? "HR Admin Panel" :
    role === "manager" ? "Manager Admin Panel" :
    "Admin Panel";

  // Base Menu
  const baseMenu = [
    { name: "Home", icon: <FaHome size={20} />, path: "/admin/dashboard" },
    { name: "Employee Management", icon: <FaUsers size={20} />, path: "/admin/dashboard/emp-management" },
    { name: "Attendance", icon: <AccessTimeIcon style={{ fontSize: 20 }} />, path: "/admin/dashboard/attendance" },
    { name: "Leave", icon: <FaCalendarAlt size={20} />, path: "/admin/dashboard/leave" },
    { name: "Policy", icon: <FaBook size={20} />, path: "/admin/dashboard/policy" },
    { name: "Task/Eod Reports", icon: <MdTaskAlt size={20} />, path: "/admin/dashboard/task" },
    { name: "Chat", icon: <FaComments size={20} />, path: "/admin/dashboard/chat" },
    { name: "Salary", icon: <AttachMoneyIcon style={{ fontSize: 20 }} />, path: "/admin/dashboard/salary" },
    { name: "Reports", icon: <FaChartBar size={20} />, path: "/admin/dashboard/reports" },
    { name: "Settings", icon: <MdSettings size={20} />, path: "/admin/dashboard/settings" },
  ];

  // Filter Menu by Role
  const menuItems = baseMenu.filter((item) => {
    if (role === "hr" && item.name === "Task") return false;
    if (role === "manager" && item.name === "Salary") return false;
    return true;
  });

  return (
    <div
      className={`${
        isDarkMode ? "bg-gray-800 text-gray-300" : "bg-white text-gray-700"
      } shadow-lg h-full flex flex-col w-full p-4`}
    >
      {/* Panel Title */}
      <div
        className={`text-[#007fff] font-semibold border-b pb-2 mt-4 px-2 ${
          isDarkMode ? "border-gray-700" : "border-blue-500"
        }`}
      >
        {panelTitle}
      </div>

      {/* Scrollable Menu */}
      <div
        className={`flex flex-col mt-3 gap-2 overflow-y-auto custom-scrollbar pr-2 flex-1`}
      >
        {menuItems.map((item) => (
          <NavLink
            key={item.name}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2 rounded-lg transition-colors duration-200 ${
                isActive
                  ? "bg-blue-600 text-white"
                  : `${
                      isDarkMode
                        ? "hover:bg-gray-700 hover:text-white"
                        : "hover:bg-gray-100 hover:text-blue-600"
                    }`
              }`
            }
          >
            {item.icon}
            <span className="truncate">{item.name}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
}
