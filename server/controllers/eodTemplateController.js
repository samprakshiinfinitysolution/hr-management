// controllers/eodTemplateController.js
import EodTemplate from "../models/EodTemplateModel.js";

/**
 * GET /eod-template
 */
export const getTemplate = async (req, res) => {
  try {
    let template = await EodTemplate.findOne();
    if (!template) {
      // default template with 10 slots
      template = await EodTemplate.create({
        columns: ["time", "task", "description", "status", "remarks"],
        rows: [
          { time: "10:00 - 11:00 AM", task: "", description: "", status: "", remarks: "" },
          { time: "11:00 - 12:00 PM", task: "", description: "", status: "", remarks: "" },
          { time: "12:00 - 01:00 PM", task: "", description: "", status: "", remarks: "" },
          { time: "01:00 - 01:30 PM", task: "LUNCH", description: "", status: "", remarks: "" },
          { time: "01:30 - 02:30 PM", task: "", description: "", status: "", remarks: "" },
          { time: "02:30 - 03:30 PM", task: "", description: "", status: "", remarks: "" },
          { time: "03:30 - 03:40 PM", task: "TEA BREAK", description: "", status: "", remarks: "" },
          { time: "03:40 - 04:40 PM", task: "", description: "", status: "", remarks: "" },
          { time: "04:40 - 06:00 PM", task: "", description: "", status: "", remarks: "" },
        ],
      });
    }
    res.json(template);
  } catch (err) {
    console.error("getTemplate:", err);
    res.status(500).json({ message: err.message });
  }
};

/**
 * PUT /eod-template
 * Body: { columns: [...], rows: [...] }
 * Admin can update template. This only updates template doc.
 */
export const updateTemplate = async (req, res) => {
  try {
    const { columns, rows } = req.body;
    // Basic validation
    const tpl = await EodTemplate.findOneAndUpdate(
      {},
      { columns, rows },
      { upsert: true, new: true }
    );
    res.json({ message: "Template updated", template: tpl });
  } catch (err) {
    console.error("updateTemplate:", err);
    res.status(500).json({ message: err.message });
  }
};
