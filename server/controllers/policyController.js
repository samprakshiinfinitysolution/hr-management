import Policy from "../models/policyModel.js";

// Get all policies
// Get all policies (filtered by organization)
export const getPolicies = async (req, res) => {
  try {
    let query = {};

    // MAIN ADMIN → shows only their policies
    if (req.user.role === "admin") {
      query = { createdBy: req.user.id };
    }

    // HR / MANAGER → they belong to a main admin
    else if (req.user.role === "hr" || req.user.role === "manager") {
      query = { createdBy: req.user.createdBy };
    }

    // EMPLOYEE → createdBy field contains their adminId
    else if (req.user.role === "employee") {
      query = { createdBy: req.user.adminId || req.user.createdBy };
    }

    const policies = await Policy.find(query).sort({ createdAt: -1 });
    return res.json(policies);

  } catch (error) {
    console.error("Policy Fetch Error:", error);
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
    const policy = await Policy.findOneAndUpdate(
      // Find the policy by its ID AND the creator's ID
      { _id: req.params.id, createdBy: req.user.id },
      { title, content },
      { new: true, runValidators: true }
    );

    if (!policy) {
      // If policy is null, it's either not found or the user is not the owner
      return res.status(404).json({ message: "Policy not found or you are not authorized to update it" });
    }
    res.json(policy);
  } catch (error) {
    res.status(400).json({ message: "Failed to update policy", error: error.message });
  }
};

// Delete a policy
export const deletePolicy = async (req, res) => {
  try {
    // Find the policy by its ID AND the creator's ID to delete it
    const policy = await Policy.findOneAndDelete({ _id: req.params.id, createdBy: req.user.id });
    if (!policy) {
      // If policy is null, it's either not found or the user is not the owner
      return res.status(404).json({ message: "Policy not found or you are not authorized to delete it" });
    }
    res.json({ message: "Policy deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete policy", error: error.message });
  }
};