import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import EmpNavbar from "../components/EmpNavbar";
import EmpSidebar from "../components/sidebar/EmpSidebar";
import EmpMobileBar from "../components/sidebar/EmpMobilebar";

export default function EmployeeLayout() {
  const { isDarkMode } = useSelector((state) => state.settings);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Default to open on desktop
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) {
        setIsSidebarOpen(false); // Keep it closed on mobile by default
      } else {
        setIsSidebarOpen(true); // Keep it open on desktop
      }
    };
    window.addEventListener("resize", handleResize);
    handleResize(); // Initial check
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div
      className={`${isDarkMode ? "dark bg-gray-900 text-white" : "bg-gray-100 text-gray-900"} min-h-screen flex flex-col`}
    >
      <EmpNavbar onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />

      {/* --- Sidebar --- */}
      <div
        className={`fixed top-0 md:top-[64px] left-0 h-full md:h-[calc(100vh-64px)] z-40 transition-transform duration-300 ease-in-out ${
          isMobile ? (isSidebarOpen ? "translate-x-0" : "-translate-x-full") : (isSidebarOpen ? "w-64" : "w-20")
        }`}
      >
        <EmpSidebar isOpen={isSidebarOpen} />
      </div>

      {/* --- Main Content --- */}
      <main
        className={`flex-1 overflow-y-auto p-4 md:p-6 mt-[64px] pb-[60px] md:pb-0 transition-all duration-300 ${
          !isMobile ? (isSidebarOpen ? "md:ml-64" : "md:ml-20") : ""
        }`}
      > 
        <Outlet />
      </main>

      {/* --- Mobile Bottom Bar --- */}
      <div className="md:hidden fixed bottom-0 left-0 w-full z-50">
        <EmpMobileBar />
      </div>
    </div>
  );
}
