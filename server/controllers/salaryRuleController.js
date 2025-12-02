// controllers/salaryRuleController.js
import SalaryRule from "../models/salaryRuleModel.js";

export const getSalaryRule = async (req, res) => {
  try {
    const rule = await SalaryRule.findOne({ createdBy: req.user.id });
    if (!rule) return res.json({}); // return empty object if none
    return res.json(rule);
  } catch (err) {
    console.error("getSalaryRule:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const saveSalaryRule = async (req, res) => {
  try {
    const payload = { ...req.body, createdBy: req.user.id };

    let rule = await SalaryRule.findOne({ createdBy: req.user.id });
    if (rule) {
      rule = await SalaryRule.findOneAndUpdate({ createdBy: req.user.id }, payload, { new: true, runValidators: true });
    } else {
      rule = await SalaryRule.create(payload);
    }

    return res.json({ message: "Salary rules saved", rule });
  } catch (err) {
    console.error("saveSalaryRule:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const deleteSalaryRule = async (req, res) => {
  try {
    const rule = await SalaryRule.findOneAndDelete({ createdBy: req.user.id });
    return res.json({ message: "Salary rules deleted", rule });
  } catch (err) {
    console.error("deleteSalaryRule:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
