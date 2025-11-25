// controllers/eodController.js
import EodReport from "../models/EodreportsModel.js";
import Employee from "../models/employeeModel.js";
import Attendance from "../models/attendanceModel.js";
import moment from "moment-timezone";
import EodTemplate from "../models/EodTemplateModel.js";
import { mergeTemplate, mergePreserveExisting } from "../../client/src/utils/mergeTemplate.js";
import EodReportHistory from "../models/EodReportHistoryModel.js";

/**
 * Employee create/update EOD for today
 * If existing -> update only its fields (non-destructive to other reports).
 */
export const createEodReport = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const employee = await Employee.findById(employeeId);
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    const dateOnly = moment(req.body.date).format("YYYY-MM-DD");
    const today = moment().tz("Asia/Kolkata").format("YYYY-MM-DD");

    if (dateOnly !== today) {
      return res.status(403).json({ message: "Editing past EODs is not allowed" });
    }

    const att = await Attendance.findOne({
      user: employeeId,
      date: new Date(today),
    });

    if (!att || !att.checkIn) {
      return res.status(403).json({ message: "Please check-in before submitting EOD" });
    }

    let existing = await EodReport.findOne({ employee: employeeId, date: dateOnly });

    // if exists, update user-supplied fields only
    if (existing) {
      // history snapshot for this report before personal edit (optional)
      await EodReportHistory.create({
        reportId: existing._id,
        snapshot: existing.toObject(),
        reason: "employee-update",
        createdBy: employeeId,
      });

      existing.project = req.body.project ?? existing.project;
      existing.reportingTime = req.body.reportingTime ?? existing.reportingTime;
      existing.eodTime = req.body.eodTime ?? existing.eodTime;
      existing.summary = req.body.summary ?? existing.summary;
      existing.nextDayPlan = req.body.nextDayPlan ?? existing.nextDayPlan;

      // store exactly what employee sends for rows
      existing.rows = Array.isArray(req.body.rows) ? req.body.rows : existing.rows;

      await existing.save();
      return res.status(200).json(existing);
    }

    // create new report
    const newReport = await EodReport.create({
      employee: employee._id,
      name: employee.name,
      project: req.body.project,
      date: dateOnly,
      reportingTime: req.body.reportingTime,
      eodTime: req.body.eodTime,
      summary: req.body.summary,
      nextDayPlan: req.body.nextDayPlan,
      rows: Array.isArray(req.body.rows) ? req.body.rows : [],
    });

    res.status(201).json(newReport);
  } catch (err) {
    console.error("EOD Error:", err);
    res.status(500).json({ message: err.message });
  }
};


/**
 * Admin: get all EOD reports (with template merged for view)
 * Optional filter by employeeId as query param
 */
export const getAllEodReports = async (req, res) => {
  try {
    let template = await EodTemplate.findOne();
    if (!template) {
      // fallback default template (same as your template controller)
      template = {
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
      };
    }

    let filter = {};
    if (req.query.employeeId) filter.employee = req.query.employeeId;

    const reports = await EodReport.find(filter)
      .populate("employee", "name email position")
      .sort({ date: -1 });

    const final = reports.map((r) => ({
      ...r.toObject(),
      rows: mergeTemplate(template, r.rows || []),
      columns: template.columns || ["time", "task", "description", "status", "remarks"],
    }));

    res.json(final);
  } catch (err) {
    console.error("getAllEodReports:", err);
    res.status(500).json({ message: err.message });
  }
};

export const getMyEodReports = async (req, res) => {
  try {
    let template = await EodTemplate.findOne();
    if (!template) {
      // same default fallback
      template = {
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
      };
    }

    const reports = await EodReport.find({ employee: req.user.id }).sort({ date: -1 });

    const final = reports.map((r) => ({
      ...r.toObject(),
      rows: mergeTemplate(template, r.rows || []),
      columns: template.columns || ["time", "task", "description", "status", "remarks"],
    }));

    res.json(final);
  } catch (err) {
    console.error("getMyEodReports:", err);
    res.status(500).json({ message: err.message });
  }
};


/**
 * Admin: update a single EOD but in a safe manner.
 * Body: { form, rows, columns }
 * This will:
 *  - Save a history snapshot of the target report
 *  - Update the target report header/rows (but preserve employees' existing non-empty values when applying template globally)
 *  - Update the global template (if columns/rows provided)
 *  - Globally merge template -> all reports (non-destructive)
 */
// export const updateEodReportByAdmin = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const { form, rows: adminRows = [], columns: adminColumns = [] } = req.body;

//     const actor = req.user.id;

//     // ---------------------------
//     // 1. Load selected employee report
//     // ---------------------------
//     const target = await EodReport.findById(id);
//     if (!target) return res.status(404).json({ message: "Report not found" });

//     // history save
//     await EodReportHistory.create({
//       reportId: target._id,
//       snapshot: target.toObject(),
//       reason: "admin-update",
//       createdBy: actor,
//     });

//     // update the selected report rows only
//     target.rows = adminRows;
//     if (form) Object.assign(target, form);
//     await target.save();

//     // ---------------------------
//     // 2. UPDATE GLOBAL TEMPLATE
//     // ---------------------------
//     let template = await EodTemplate.findOne();
//     if (!template) {
//       template = await EodTemplate.create({
//         columns: ["time", "task", "description", "status", "remarks"],
//         rows: []
//       });
//     }

//     // update columns globally
//     if (adminColumns.length > 0) {
//       template.columns = adminColumns;
//     }

//     // ---------------------------
//     // IMPORTANT:
//     // Template rows must be PURE STRUCTURE (no employee data)
//     // ---------------------------
//     template.rows = adminRows.map(r => {
//       const obj = {};
//       template.columns.forEach(col => {
//         if (col === "time") obj[col] = r[col] || "";   // time only copied
//         else obj[col] = "";                            // NO employee data ever copied
//       });
//       return obj;
//     });

//     await template.save();

//     // ---------------------------
//     // 3. APPLY TEMPLATE TO ALL REPORTS
//     // ---------------------------
//     const allReports = await EodReport.find();

//     const bulkOps = allReports.map(rep => {
//       const merged = mergePreserveExisting(
//         rep.rows,            // employee old data
//         template.rows,       // pure structure
//         template.columns
//       );

//       return {
//         updateOne: {
//           filter: { _id: rep._id },
//           update: {
//             $set: {
//               rows: merged,
//               columns: template.columns
//             }
//           }
//         }
//       };
//     });

//     if (bulkOps.length > 0) await EodReport.bulkWrite(bulkOps);

//     return res.json({
//       message: "Template updated & applied successfully",
//       report: target,
//       template,
//     });

//   } catch (err) {
//     console.error("Admin update error:", err);
//     return res.status(500).json({ message: "Admin update failed" });
//   }
// };

// -------------------------
// FINAL WORKING VERSION
// -------------------------
export const updateEodReportByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { form, rows: adminRows = [], columns: adminColumns = [] } = req.body;

    const target = await EodReport.findById(id);
    if (!target) return res.status(404).json({ message: "Report not found" });

    // Save history
    await EodReportHistory.create({
      reportId: target._id,
      snapshot: target.toObject(),
      reason: "admin-update",
      createdBy: req.user.id,
    });

    // Update only selected report (header + rows)
    if (form) Object.assign(target, form);
    target.rows = adminRows;
    await target.save();

    // ---------------------------
    // GLOBAL TEMPLATE UPDATE
    // ---------------------------
    let template = await EodTemplate.findOne();
    if (!template) {
      template = await EodTemplate.create({
        columns: ["time", "task", "description", "status", "remarks"],
        rows: [],
      });
    }

    // update columns
    if (adminColumns.length > 0) template.columns = adminColumns;

    // template rows (structure only)
    template.rows = adminRows.map(r => {
      const obj = {};
      template.columns.forEach(col => {
        obj[col] = col === "time" ? r[col] || "" : "";
      });
      return obj;
    });

    await template.save();

    // ---------------------------
    // APPLY TEMPLATE TO ALL REPORTS (DELETE FIX)
    // ---------------------------
    const all = await EodReport.find();

    const bulkOps = all.map(rep => {
      const merged = mergePreserveExisting(rep.rows, template.rows, template.columns);
      return {
        updateOne: {
          filter: { _id: rep._id },
          update: {
            $set: {
              rows: merged,
              columns: template.columns
            }
          }
        }
      };
    });

    if (bulkOps.length > 0) await EodReport.bulkWrite(bulkOps);

    return res.json({
      message: "Template updated & applied globally",
      report: target,
      template,
    });

  } catch (err) {
    console.error("Admin update error:", err);
    return res.status(500).json({ message: "Admin update failed" });
  }
};



/**
 * Get the global EOD template
 */
export const getEodTemplate = async (req, res) => {
  try {
    let template = await EodTemplate.findOne();
    if (!template) {
      // If no template exists, return a default structure to avoid breaking the frontend
      template = {
        columns: ["time", "task", "description", "status", "remarks"],
        rows: [],
      };
    }
    res.json(template);
  } catch (err) {
    res.status(500).json({ message: "Server error fetching template" });
  }
};

/**
 * PUT /eod-template
 * Admin can update template.
 */
// export const updateEodTemplate = async (req, res) => {
//   try {
//     const { columns, rows } = req.body;
//     const tplUpdate = {};
//     if (Array.isArray(columns) && columns.length > 0) tplUpdate.columns = columns;
//     if (Array.isArray(rows) && rows.length > 0) tplUpdate.rows = rows;

//     const tpl = await EodTemplate.findOneAndUpdate({}, tplUpdate, { upsert: true, new: true });

//     // Run non-destructive merge across all reports using new template rows
//     const tplRows = Array.isArray(tpl.rows) && tpl.rows.length > 0 ? tpl.rows : [];

//     const allReports = await EodReport.find({});
//     const bulkOps = allReports.map((r) => {
//       const merged = mergePreserveExisting(r.rows || [], tplRows);
//       return {
//         updateOne: {
//           filter: { _id: r._id },
//           update: { $set: { rows: merged, columns: tpl.columns || r.columns } },
//         },
//       };
//     });

//     if (bulkOps.length > 0) await EodReport.bulkWrite(bulkOps);

//     res.json({ message: "Template updated and applied", template: tpl });
//   } catch (err) {
//     console.error("updateEodTemplate:", err);
//     res.status(500).json({ message: err.message });
//   }
// };
export const updateEodTemplate = async (req, res) => {
  try {
    const { columns, rows } = req.body;
    const tplUpdate = {};
    if (Array.isArray(columns) && columns.length > 0) tplUpdate.columns = columns;
    if (Array.isArray(rows) && rows.length > 0) tplUpdate.rows = rows;

    const tpl = await EodTemplate.findOneAndUpdate({}, tplUpdate, { upsert: true, new: true });

    const tplRows = Array.isArray(tpl.rows) && tpl.rows.length > 0 ? tpl.rows : [];
    const tplCols = Array.isArray(tpl.columns) && tpl.columns.length > 0 ? tpl.columns : Object.keys(tplRows[0] || {});

    const allReports = await EodReport.find({});
    const bulkOps = allReports.map((r) => {
      const merged = mergePreserveExisting(r.rows || [], tplRows, tplCols);
      return {
        updateOne: {
          filter: { _id: r._id },
          update: { $set: { rows: merged, columns: tpl.columns || r.columns } },
        },
      };
    });

    if (bulkOps.length > 0) await EodReport.bulkWrite(bulkOps);

    res.json({ message: "Template updated and applied", template: tpl });
  } catch (err) {
    console.error("updateEodTemplate:", err);
    res.status(500).json({ message: err.message });
  }
};

