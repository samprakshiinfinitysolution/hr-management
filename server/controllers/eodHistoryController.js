// controllers/eodHistoryController.js
import EodReportHistory from "../models/EodReportHistoryModel.js";
import EodReport from "../models/EodreportsModel.js";

export const restoreFromHistory = async (req, res) => {
  try {
    const { historyId } = req.params;
    const entry = await EodReportHistory.findById(historyId);
    if (!entry) return res.status(404).json({ message: "History not found" });

    const restored = await EodReport.findByIdAndUpdate(
      entry.reportId,
      entry.snapshot,
      { new: true, overwrite: true }
    );

    res.json({ message: "Restored", restored });
  } catch (err) {
    console.error("restoreFromHistory:", err);
    res.status(500).json({ message: err.message });
  }
};
