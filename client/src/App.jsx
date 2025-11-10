// App.jsx
import { Routes, Route } from "react-router-dom";
import React, { useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { setDarkMode } from "./features/auth/settingsSlice"; // This seems to be for UI, which is fine.
import { verifyUser } from "./features/auth/authSlice"; // 
import ProtectedRoute from "./components/ProtectedRoute";

// Admin pages
import LoginSelection from "./pages/LoginSelection";
import AdminLogin from "./pages/AdminLogin";
import AdminRegister from "./pages/AdminRegister";
import EmployeeLogin from "./pages/EmployeeLogin";
import AdminDashboardLayout from "./Layout/AdminDashboardLayout";
import AdminHome from "./pages/AdminDashboard";
import AdminEmpManagement from "./pages/AdminPage/AdminEmployeeManagement";
import AdminEmpReports from "./pages/AdminPage/AdminEmployeeReports";
import AdminTask from "./pages/AdminPage/AdminTask";
import AdminLeaveManagement from "./pages/AdminPage/AdminLeaveManagement";
import AttendanceTracker from "./pages/AdminPage/AttandenceTracker";
import SalaryManagement from "./pages/AdminPage/SalaryManagement";
import AdminSettings from "./pages/AdminPage/AdminSettings";
import Notification from "./pages/AdminPage/Notification";
import AdminEmployeeProfile from "./pages/AdminPage/AdminEmployeeProfile";
import SubAdminAttendance from "./pages/AdminPage/SubAdminAttendance"; // 👈 
import AdminForgotPassword from "./pages/AdminForgotPassword";
import AdminChat from "./pages/AdminPage/AdminChat";
import AdminPolicy from "./pages/AdminPage/AdminPolicy";
import AdminEodReports from "./pages/AdminPage/AdminEodReports";


// Employee pages
import EmployeeLayout from "./Layout/EmployeeLayout";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import EmpAttendance from "./pages/employeePage/EmpAttendance";
import EmpTask from "./pages/employeePage/EmpTask";
import EmpLeave from "./pages/employeePage/EmpLeave";
import EmpProfile from "./pages/employeePage/EmpProfile";
import EmpSalaryslip from "./pages/employeePage/EmpSalaryslip";
import EmployeeSettings from "./pages/employeePage/EmpSetting";
import EmployeeChat from "./pages/employeePage/EmployeeChat";
import EmpEodReports from "./pages/employeePage/EmpEodReports";
// ... all imports

function App() {
  const dispatch = useDispatch();
  const { isDarkMode } = useSelector((state) => state.settings);
  const { loading } = useSelector((state) => state.auth); // 

  useEffect(() => {
    const savedMode = localStorage.getItem("isDarkMode");
    if (savedMode !== null) dispatch(setDarkMode(savedMode === "true"));

    const token = localStorage.getItem("token");
    if (token) {
      dispatch(verifyUser());
    }
    // if no token, do not call verifyUser (avoids immediate rejection)
  }, [dispatch]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
  }, [isDarkMode]);

 
  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-gray-900 z-50">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white min-h-screen">
      <Routes>
        {/* Public */}
        <Route path="/" element={<LoginSelection />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/admin-register" element={<AdminRegister />} />
        <Route path="/employee-login" element={<EmployeeLogin />} />
        
        
        <Route path="/admin/forgot-password" element={<AdminForgotPassword />} />

        {/* Admin Dashboard */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute role={["admin", "hr", "manager"]}>
              <AdminDashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminHome />} />
          <Route path="emp-management" element={<AdminEmpManagement />} />
          <Route path="employee/:id" element={<AdminEmployeeProfile />} />
          
          <Route path="reports" element={<AdminEmpReports />} />

          {/* Task Page - HR Blocked */}
          <Route
            path="sub-attendance"
            element={
              <ProtectedRoute role={["admin"]}>
                <SubAdminAttendance />
              </ProtectedRoute>
            }
          />
          <Route
            path="task"
            element={
              <ProtectedRoute role={["admin", "manager"]} feature="task">
                <AdminTask />
              </ProtectedRoute>
            }
          />

          {/* Salary Page - Manager Blocked */}
          <Route
            path="salary"
            element={
              <ProtectedRoute role={["admin", "hr"]} feature="salary">
                <SalaryManagement />
              </ProtectedRoute>
            }
          />

          <Route path="leave" element={<AdminLeaveManagement />} />
          <Route path="attendance" element={<AttendanceTracker />} />
          <Route path="chat" element={<AdminChat />} />
          <Route path="policy" element={<AdminPolicy />} />
          <Route path="notification" element={<Notification />} />
          <Route path="eod-reports" element={<AdminEodReports/>} />

          {/* Settings - All can access */}
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        {/* Employee Routes */}
        <Route
          path="/employee"
          element={
            <ProtectedRoute role="employee">
              <EmployeeLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<EmployeeDashboard />} />
          <Route path="attendance" element={<EmpAttendance />} />
          <Route path="tasks" element={<EmpTask />} />
          <Route path="eod-reports" element={<EmpEodReports />} />
          <Route path="leave" element={<EmpLeave />} />
          <Route path="profile" element={<EmpProfile />} />
          <Route path="chat" element={<EmployeeChat />} />
          <Route path="salary-slip" element={<EmpSalaryslip />} />
          <Route path="setting" element={<EmployeeSettings />} />
        </Route>
      </Routes>
    </div>
  );
}

export default App;