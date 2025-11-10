import Policy from "../models/policyModel.js";

// Get all policies
export const getPolicies = async (req, res) => {
  try {
    // In a multi-tenant setup, you might filter by req.user.id or an organization ID
    const policies = await Policy.find().sort({ createdAt: -1 });
    res.json(policies);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch policies", error: error.message });
  }
};

// Create a new policy
export const createPolicy = async (req, res) => {
  try {
    const { title, content } = req.body;
    const newPolicy = new Policy({ title, content, createdBy: req.user.id });
    await newPolicy.save();
    res.status(201).json(newPolicy);
  } catch (error) {
    res.status(400).json({ message: "Failed to create policy", error: error.message });
  }
};

// Update a policy
export const updatePolicy = async (req, res) => {
  try {
    const { title, content } = req.body;
    const policy = await Policy.findByIdAndUpdate(
      req.params.id,
      { title, content },
      { new: true, runValidators: true }
    );
    if (!policy) return res.status(404).json({ message: "Policy not found" });
    res.json(policy);
  } catch (error) {
    res.status(400).json({ message: "Failed to update policy", error: error.message });
  }
};

// Delete a policy
export const deletePolicy = async (req, res) => {
  try {
    const policy = await Policy.findByIdAndDelete(req.params.id);
    if (!policy) return res.status(404).json({ message: "Policy not found" });
    res.json({ message: "Policy deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete policy", error: error.message });
  }
};