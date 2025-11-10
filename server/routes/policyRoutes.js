import express from "express";
import { getPolicies, createPolicy, updatePolicy, deletePolicy } from "../controllers/policyController.js";
import { verifyToken, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// Anyone logged in can view policies
router.get("/", verifyToken, getPolicies);

// Only main admin can create, update, or delete policies
router.post("/", verifyToken, adminOnly, createPolicy);
router.put("/:id", verifyToken, adminOnly, updatePolicy);
router.delete("/:id", verifyToken, adminOnly, deletePolicy);

export default router;