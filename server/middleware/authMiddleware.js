
// server/middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import { jwtSecret } from "../config/config.js";
export const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log("🔎 verifyToken authHeader:", authHeader?.slice?.(0,50)); 
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, jwtSecret);
    req.user = {
      id: decoded.id || decoded._id || decoded.userId || null,
      role: (decoded.role || "").toLowerCase().trim(),
      isMainAdmin: decoded.isMainAdmin || false,
      createdBy: decoded.createdBy || decoded.adminId || null,
    };

    if (!req.user.id) {
      return res.status(401).json({ message: "Invalid token payload" });
    }

    next();
  } catch (err) {
    console.error("verifyToken error:", err);
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

/**
 * ✅ Generic Role Checker
 */
const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: "Not authenticated" });

    const userRole = req.user.role.toLowerCase();
    if (req.user.isMainAdmin) return next(); // ✅ Main admin bypasses all checks

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        message: `Access denied. Required: ${allowedRoles.join(", ")}. You are: ${userRole}`,
      });
    }
    next();
  };
};

// ✅ Role Guards
export const adminOnly = requireRole("admin");
export const hrOnly = requireRole("hr", "admin");
export const managerOnly = requireRole("manager", "admin");
export const allowAdminHrManager = requireRole("admin", "hr", "manager");
export const employeeOnly = requireRole("employee");

/**
 * ✅ Ownership Middleware
 */
export const verifyOwnership = (model, paramId = "id", userField = "createdBy") => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params[paramId];
      const resource = await model.findById(resourceId);

      if (!resource) {
        return res.status(404).json({ message: "Resource not found" });
      }

      const ownerId = resource[userField]?.toString();
      if (ownerId !== req.user.id && !req.user.isMainAdmin) {
        return res.status(403).json({ message: "You do not own this resource" });
      }

      req.resource = resource;
      next();
    } catch (error) {
      console.error("verifyOwnership error:", error);
      res.status(500).json({ message: "Server error" });
    }
  };
};
