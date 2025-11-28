// routes/eodHistoryRoutes.js
import express from "express";
import { verifyToken, allowAdminHrManager } from "../middleware/authMiddleware.js";
import { restoreFromHistory } from "../controllers/eodHistoryController.js";

const router = express.Router();
router.post("/:historyId/restore", verifyToken, allowAdminHrManager, restoreFromHistory);
export default router;
