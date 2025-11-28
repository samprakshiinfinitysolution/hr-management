
// components/ProtectedRoute.jsx
import { Navigate, useLocation } from "react-router-dom";

const ProtectedRoute = ({ children, role, feature }) => {
  const token = localStorage.getItem("token");
  const userRole = localStorage.getItem("role")?.toLowerCase();
  const location = useLocation();

  if (!token) return <Navigate to="/" />;

  // Role check
  if (role && Array.isArray(role) && !role.includes(userRole)) {
    return <Navigate to="/" />;
  }

  // Feature block: HR can't see Task, Manager can't see Salary
  if (feature) {
    if (userRole === "hr" && feature === "task") {
      return <Navigate to="/admin/dashboard" replace />;
    }
    if (userRole === "manager" && feature === "salary") {
      return <Navigate to="/admin/dashboard" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;