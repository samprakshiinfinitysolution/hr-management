// import { useState, useEffect } from "react";
// import { Outlet } from "react-router-dom";
// import { useSelector } from "react-redux";
// import AdminNavbar from "../components/AdminNavbar";
// import AdminSidebar from "../components/sidebar/AdminSidebar";
// import MobileSidebarRow from "../components/sidebar/MobileSidebar";

// export default function AdminDashboardLayout() {
//   const isDarkMode = useSelector((state) => state.settings.isDarkMode);
//   const [isSidebarOpen, setIsSidebarOpen] = useState(true);
//   const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

//   useEffect(() => {
//     const handleResize = () => setIsMobile(window.innerWidth < 768);
//     window.addEventListener("resize", handleResize);
//     return () => window.removeEventListener("resize", handleResize);
//   }, []);

//   return (
//     <div
//       className={`${
//         isDarkMode
//           ? "dark bg-gray-900 text-white"
//           : "bg-gray-100 text-gray-900"
//       } min-h-screen flex flex-col`}
//     >
//       {/* Navbar */}
//       <AdminNavbar toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

//       {/* Sidebar (Desktop only) */}
//       {!isMobile && (
//         <div
//           className={`fixed top-[64px] left-0 h-[calc(100vh-64px)] transition-all duration-300 z-30 ${
//             isSidebarOpen ? "w-64" : "w-20"
//           }`}
//         >
//           <AdminSidebar isOpen={isSidebarOpen} isMobile={isMobile} />
//         </div>
//       )}

//       {/* Main Content */}
//       <main
//         className={`flex-1 transition-all duration-300 p-4 md:p-6 ${
//           !isMobile
//             ? `${isSidebarOpen ? "ml-64" : "ml-20"} mt-[64px]`
//             : "ml-0 mt-[64px] pb-[60px]"
//         }`}
//       >
//         <Outlet />
//       </main>

//       {/* --- Mobile Bottom Icons Row (Fixed Bottom) --- */}
//       {isMobile && (
//         <div className="fixed bottom-0 left-0 w-full z-50">
//           <MobileSidebarRow />
//         </div>
//       )}
//     </div>
//   );
// }


import { useState, useEffect, useRef } from "react";
import { Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import AdminNavbar from "../components/AdminNavbar";
import AdminSidebar from "../components/sidebar/AdminSidebar";
import MobileSidebarRow from "../components/sidebar/MobileSidebar";
import GlobalLoader from "../components/GlobalLoader";

export default function AdminDashboardLayout() {
  const isDarkMode = useSelector((state) => state.settings.isDarkMode);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);   // 🚀 default CLOSED on mobile
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const sidebarRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setIsSidebarOpen(!mobile);     // desktop => open, mobile => closed
    };

    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // 🟢 Click outside to close sidebar on mobile
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (isMobile && isSidebarOpen) {
        if (sidebarRef.current && !sidebarRef.current.contains(e.target)) {
          setIsSidebarOpen(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMobile, isSidebarOpen]);

  return (
    <div
      className={`${
        isDarkMode ? "dark bg-gray-900 text-white" : "bg-gray-100 text-gray-900"
      } min-h-screen flex flex-col`}
    >
      <GlobalLoader />
      {/* Navbar */}
      <AdminNavbar toggleSidebar={() => setIsSidebarOpen((prev) => !prev)} />

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={`fixed top-[64px] left-0 h-[calc(100vh-64px)] z-40 transition-all duration-300
        ${isMobile
          ? isSidebarOpen
            ? "translate-x-0 w-64"
            : "-translate-x-full w-64"
          : isSidebarOpen
          ? "w-64"
          : "w-20"
        }
        ${isMobile ? "bg-white dark:bg-gray-800 shadow-lg" : ""}
      `}
      >
        <AdminSidebar isOpen={isSidebarOpen} isMobile={isMobile} />
      </div>

      {/* Main Content */}
      <main
        className={`flex-1 p-4 md:p-6 mt-[64px] transition-all duration-300 ${
          !isMobile ? (isSidebarOpen ? "ml-64" : "ml-20") : "ml-0"
        }`}
      >
        <Outlet />
      </main>

      {/* Mobile Bottom Menu */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 w-full z-50">
          <MobileSidebarRow />
        </div>
      )}
      
    </div>
  );
}
