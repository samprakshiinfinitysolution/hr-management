
// // components/ProtectedRoute.jsx
// import { Navigate, useLocation } from "react-router-dom";

// const ProtectedRoute = ({ children, role, feature }) => {
//   const token = localStorage.getItem("token");
//   const userRole = localStorage.getItem("role")?.toLowerCase();
//   const location = useLocation();

//   if (!token) return <Navigate to="/" />;

//   // Role check
//   if (role && Array.isArray(role) && !role.includes(userRole)) {
//     return <Navigate to="/" />;
//   }

//   // Feature block: HR can't see Task, Manager can't see Salary
//   if (feature) {
//     if (userRole === "hr" && feature === "task") {
//       return <Navigate to="/admin/dashboard" replace />;
//     }
//     if (userRole === "manager" && feature === "salary") {
//       return <Navigate to="/admin/dashboard" replace />;
//     }
//   }

//   return children;
// };

// export default ProtectedRoute;

import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

const ProtectedRoute = ({ children, role, feature }) => {
  const accessToken = localStorage.getItem("accessToken");
  const userRole = localStorage.getItem("role")?.toLowerCase();
  const { loading } = useSelector((state) => state.auth);

  // 🔵 Show Loader while auth is restoring
  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-gray-900 z-50">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // 🔴 If no token → go to login
  if (!accessToken) {
    return <Navigate to="/" replace />;
  }

  // 🔵 Role Protection
  if (role) {
    const allowedRoles = Array.isArray(role) ? role : [role];
    if (!allowedRoles.includes(userRole)) {
      return <Navigate to="/" replace />;
    }
  }

  // 🔵 Feature protection
  if (feature) {
    // HR restricted from task
    if (userRole === "hr" && feature === "task") {
      return <Navigate to="/admin/dashboard" replace />;
    }
    // Manager restricted from salary
    if (userRole === "manager" && feature === "salary") {
      return <Navigate to="/admin/dashboard" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;

