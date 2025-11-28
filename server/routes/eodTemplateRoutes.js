// routes/eodTemplateRoutes.js
import express from "express";
import { allowAdminHrManager, verifyToken } from "../middleware/authMiddleware.js";
import { getTemplate, updateTemplate } from "../controllers/eodTemplateController.js";

const router = express.Router();

router.get("/", verifyToken, allowAdminHrManager, getTemplate);
router.put("/", verifyToken, allowAdminHrManager, updateTemplate);

export default router;
