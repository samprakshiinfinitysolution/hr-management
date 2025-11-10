import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import AdminNavbar from "../components/AdminNavbar";
import AdminSidebar from "../components/sidebar/AdminSidebar";
import MobileSidebarRow from "../components/sidebar/MobileSidebar";

export default function AdminDashboardLayout() {
  const isDarkMode = useSelector((state) => state.settings.isDarkMode);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div
      className={`${
        isDarkMode
          ? "dark bg-gray-900 text-white"
          : "bg-gray-100 text-gray-900"
      } min-h-screen flex flex-col`}
    >
      {/* Navbar */}
      <AdminNavbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

      {/* Sidebar (Desktop only) */}
      {!isMobile && (
        <div
          className={`fixed top-[64px] left-0 h-[calc(100vh-64px)] transition-all duration-300 z-30 ${
            isSidebarOpen ? "w-64" : "w-20"
          }`}
        >
          <AdminSidebar isOpen={isSidebarOpen} isMobile={isMobile} />
        </div>
      )}

      {/* Main Content */}
      <main
        className={`flex-1 transition-all duration-300 p-4 md:p-6 ${
          !isMobile
            ? `${isSidebarOpen ? "ml-64" : "ml-20"} mt-[64px]`
            : "ml-0 mt-[64px] pb-[60px]"
        }`}
      >
        <Outlet />
      </main>

      {/* --- Mobile Bottom Icons Row (Fixed Bottom) --- */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 w-full z-50">
          <MobileSidebarRow />
        </div>
      )}
    </div>
  );
}
