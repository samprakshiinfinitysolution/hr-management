import EodReport from "../models/EodreportsModel.js";
import Employee from "../models/employeeModel.js";

// 🧩 Employee creates EOD report
// export const createEodReport = async (req, res) => {
//   try {
//     const employeeId = req.user.id; // from auth middleware
//     const employee = await Employee.findById(employeeId);

//     if (!employee) return res.status(404).json({ message: "Employee not found" });

//     const report = await EodReport.create({
//       employee: employee._id,
//       name: employee.name,
//       project: req.body.project,
//       date: req.body.date,
//       reportingTime: req.body.reportingTime,
//       eodTime: req.body.eodTime,
//       summary: req.body.summary,
//       rows: req.body.rows,
//     });

//     res.status(201).json(report);
//   } catch (err) {
//     res.status(500).json({ message: err.message });
//   }
// };

export const createEodReport = async (req, res) => {
  try {
    const employeeId = req.user.id;
    const employee = await Employee.findById(employeeId);

    if (!employee) return res.status(404).json({ message: "Employee not found" });

    const date = req.body.date || new Date().toISOString().split("T")[0];

    // ✅ If EOD already exists for same employee + same date → update instead of creating duplicate
    let existing = await EodReport.findOne({ employee: employeeId, date });

    if (existing) {
      existing.project = req.body.project;
      existing.reportingTime = req.body.reportingTime;
      existing.eodTime = req.body.eodTime;
      existing.summary = req.body.summary;
      existing.rows = req.body.rows;
      await existing.save();
      return res.status(200).json(existing);
    }

    // ✅ Else create new record
    const newReport = await EodReport.create({
      employee: employee._id,
      name: employee.name,
      project: req.body.project,
      date,
      reportingTime: req.body.reportingTime,
      eodTime: req.body.eodTime,
      summary: req.body.summary,
      rows: req.body.rows,
    });

    res.status(201).json(newReport);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// 🧩 Admin gets all EOD reports
// In eodController.js
export const getAllEodReports = async (req, res) => {
  try {
    const filter = {};
    if (req.query.employeeId) {
      filter.employee = req.query.employeeId;
    }

    const reports = await EodReport.find(filter)
      .populate("employee", "name email position")
      .sort({ createdAt: -1 });

    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// 🧩 Employee views own EOD reports
export const getMyEodReports = async (req, res) => {
  try {
    const reports = await EodReport.find({ employee: req.user.id }).sort({ date: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

