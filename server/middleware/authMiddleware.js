
// // // // server/middleware/authMiddleware.js
// // // import jwt from "jsonwebtoken";
// // // import { jwtSecret } from "../config/config.js";

// // // // Verify JWT token
// // // export const verifyToken = (req, res, next) => {
// // //   const token = req.headers.authorization?.split(" ")[1];
// // //   if (!token) return res.status(401).json({ message: "No token provided" });

// // //   try {
// // //     const decoded = jwt.verify(token, jwtSecret);
// // //     req.user = decoded; // { id: ..., role: ... }
// // //     next();
// // //   } catch (error) {
// // //     res.status(401).json({ message: "Invalid token" });
// // //   }
// // // };

// // // // Admin-only routes
// // // export const adminOnly = (req, res, next) => {
// // //   if (req.user.role !== "admin") {
// // //     return res.status(403).json({ message: "Admin access required" });
// // //   }
// // //   next();
// // // };

// // // // Employee-only routes
// // // export const employeeOnly = (req, res, next) => {
// // //   if (req.user.role !== "employee") {
// // //     return res.status(403).json({ message: "Employee access required" });
// // //   }
// // //   next();
// // // };


// // // server/middleware/authMiddleware.js
// // import jwt from "jsonwebtoken";
// // import { jwtSecret } from "../config/config.js";

// // // Verify JWT token
// // export const verifyToken = (req, res, next) => {
// //   const token = req.headers.authorization?.split(" ")[1];
// //   if (!token) return res.status(401).json({ message: "No token provided" });

// //   try {
// //     const decoded = jwt.verify(token, jwtSecret);
// //     req.user = decoded; // { id: ..., role: ... }
// //     next();
// //   } catch (error) {
// //     res.status(401).json({ message: "Invalid token" });
// //   }
// // };

// // // Admin-only routes
// // export const adminOnly = (req, res, next) => {
// //   if (req.user.role !== "admin") {
// //     return res.status(403).json({ message: "Admin access required" });
// //   }
// //   next();
// // };

// // // Employee-only routes
// // export const employeeOnly = (req, res, next) => {
// //   if (req.user.role !== "employee") {
// //     return res.status(403).json({ message: "Employee access required" });
// //   }
// //   next();
// // };

// // // Ownership verification middleware
// // // model: Mongoose model
// // // paramId: req.params key for resource id (default 'id')
// // // userField: field in model representing admin/employee owner (default 'createdBy')
// // export const verifyOwnership = (model, paramId = "id", userField = "createdBy") => {
// //   return async (req, res, next) => {
// //     try {
// //       const resource = await model.findById(req.params[paramId]);
// //       if (!resource) return res.status(404).json({ message: "Resource not found" });

// //       if (resource[userField].toString() !== req.user.id) {
// //         return res.status(403).json({ message: "Not authorized to access this resource" });
// //       }

// //       next();
// //     } catch (error) {
// //       res.status(500).json({ message: "Server error", error: error.message });
// //     }
// //   };
// // };


// // server/middleware/authMiddleware.js 2comment
// // import jwt from "jsonwebtoken";
// // import { jwtSecret } from "../config/config.js";

// // export const verifyToken = (req, res, next) => {
// //   try {
// //     const authHeader = req.headers.authorization;
// //     if (!authHeader || !authHeader.startsWith("Bearer ")) {
// //       return res.status(401).json({ message: "No token provided" });
// //     }

// //     const token = authHeader.split(" ")[1];
// //     const decoded = jwt.verify(token, jwtSecret);

// //     // Extract user info safely
// //     const userId = decoded.id || decoded._id || decoded.userId;
// //     const role = (decoded.role || decoded.roles || decoded.userRole || "").toLowerCase();

// //     if (!userId) {
// //       console.error("verifyToken: token missing user id payload", decoded);
// //       return res.status(401).json({ message: "Invalid token payload" });
// //     }

// //     req.user = { id: userId, role: role || "employee" };
// //     next();
// //   } catch (err) {
// //     console.error("verifyToken error:", err);
// //     return res.status(401).json({ message: "Invalid or expired token" });
// //   }
// // };

// // // ✅ Case-insensitive role check
// // export const adminOnly = (req, res, next) => {
// //   if (!req.user) return res.status(401).json({ message: "Not authenticated" });
// //   if ((req.user.role || "").toLowerCase() !== "admin") {
// //     return res.status(403).json({ message: "Admin access required" });
// //   }
// //   next();
// // };

// // export const employeeOnly = (req, res, next) => {
// //   if (!req.user) return res.status(401).json({ message: "Not authenticated" });
// //   if ((req.user.role || "").toLowerCase() !== "employee") {
// //     return res.status(403).json({ message: "Employee access required" });
// //   }
// //   next();
// // };

// // // Optional ownership middleware unchanged
// // export const verifyOwnership = (model, paramId = "id", userField = "createdBy") => {
// //   return async (req, res, next) => {
// //     try {
// //       const resource = await model.findById(req.params[paramId]);
// //       if (!resource) return res.status(404).json({ message: "Resource not found" });

// //       if (resource[userField].toString() !== req.user.id) {
// //         return res.status(403).json({ message: "Not authorized to access this resource" });
// //       }

// //       next();
// //     } catch (error) {
// //       console.error("verifyOwnership error:", error);
// //       res.status(500).json({ message: "Server error", error: error.message });
// //     }
// //   };
// // };



// //new 3
// // server/middleware/authMiddleware.js
// // middleware/authMiddleware.js
// import jwt from "jsonwebtoken";
// import { jwtSecret } from "../config/config.js";

// /**
//  * ✅ Verify JWT Token
//  */
// // ✅ Verify JWT Token
// export const verifyToken = (req, res, next) => {
//   try {
//     const authHeader = req.headers.authorization;
//     if (!authHeader?.startsWith("Bearer ")) {
//       return res.status(401).json({ message: "No token provided" });
//     }

//     const token = authHeader.split(" ")[1];
//     const decoded = jwt.verify(token, jwtSecret);

//     req.user = {
//       id: decoded.id || decoded._id,
//       role: (decoded.role || "").toLowerCase().trim(),
//       isMainAdmin: decoded.isMainAdmin || false,  // ← ADD THIS
//     };

//     if (!req.user.id) {
//       return res.status(401).json({ message: "Invalid token payload" });
//     }

//     next();
//   } catch (err) {
//     console.error("verifyToken error:", err);
//     res.status(401).json({ message: "Invalid or expired token" });
//   }
// };
// /**
//  * ✅ Generic Role Checker
//  */
// const requireRole = (...allowedRoles) => {
//   return (req, res, next) => {
//     if (!req.user) {
//       return res.status(401).json({ message: "Not authenticated" });
//     }

//     const userRole = req.user.role.toLowerCase();
//     if (!allowedRoles.includes(userRole)) {
//       return res.status(403).json({
//         message: `Access denied. Required: ${allowedRoles.join(", ")}. You are: ${userRole}`,
//       });
//     }
//     next();
//   };
// };

// /**
//  * ✅ Role Guards (Updated for your system)
//  */

// // Only Main Admin
// export const adminOnly = requireRole("admin");

// // HR or Main Admin
// export const hrOnly = requireRole("hr", "admin");

// // Manager or Main Admin
// export const managerOnly = requireRole("manager", "admin");

// // Any Admin (admin, hr, manager)
// export const allowAdminHrManager = requireRole("admin", "hr", "manager");

// // Employee Only
// export const employeeOnly = requireRole("employee");

// /**
//  * ✅ Ownership Middleware (for createdBy field)
//  */
// export const verifyOwnership = (model, paramId = "id", userField = "createdBy") => {
//   return async (req, res, next) => {
//     try {
//       const resourceId = req.params[paramId];
//       const resource = await model.findById(resourceId);

//       if (!resource) {
//         return res.status(404).json({ message: "Resource not found" });
//       }

//       const ownerId = resource[userField]?.toString();
//       if (ownerId !== req.user.id) {
//         return res.status(403).json({ message: "You do not own this resource" });
//       }

//       // Attach resource for next handler
//       req.resource = resource;
//       next();
//     } catch (error) {
//       console.error("verifyOwnership error:", error);
//       res.status(500).json({ message: "Server error" });
//     }
//   };
// };



//new update
// server/middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import { jwtSecret } from "../config/config.js";

/**
 * ✅ Verify JWT Token
 */
export const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, jwtSecret);

    req.user = {
      id: decoded.id || decoded._id,
      role: (decoded.role || "").toLowerCase().trim(),
      isMainAdmin: decoded.isMainAdmin || false, // ✅ Main admin recognition
      createdBy: decoded.createdBy || null, // VERY IMPORTANT: Pass createdBy for sub-admins
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
