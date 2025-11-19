import express from "express";
import { getPolicies, createPolicy, updatePolicy, deletePolicy } from "../controllers/policyController.js";
import { verifyToken, allowAdminHrManager } from "../middleware/authMiddleware.js";

const router = express.Router();

// Anyone logged in can view policies
router.get("/", verifyToken, getPolicies);

// CREATE, UPDATE, DELETE → only main admin
router.post("/", verifyToken, allowAdminHrManager, createPolicy);
router.put("/:id", verifyToken, allowAdminHrManager, updatePolicy);
router.delete("/:id", verifyToken, allowAdminHrManager, deletePolicy);


export default router;