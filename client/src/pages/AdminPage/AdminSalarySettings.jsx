// AdminSalarySettings.jsx
import React, { useEffect, useState } from "react";
import API from "../../utils/api"; // adjust path
import toast, { Toaster } from "react-hot-toast";

export default function AdminSalarySettings() {
  const [loading, setLoading] = useState(false);
  const [rule, setRule] = useState({
    baseSalaryType: "fixed",
    payDays: 30,
    absentDeductionType: "full-day",
    absentFixedAmount: 0,
    halfDayDeduction: 50,
    lateDeduction: 50,
    countSundayPayable: true, // New setting
    countHolidayPayable: true, // New setting
    earlyCheckoutDeduction: 50,
    hraPercent: 25,
    conveyance: 2000,
    childrenAllowance: 1000,
    fixedAllowance: 1000,
    paidLeaveType: "unpaid",
    sickLeaveType: "unpaid",
    casualLeaveType: "unpaid",
    monthlyPaidLeave: 1,
    monthlySickLeave: 1,
    monthlyCasualLeave: 1,
  });

  useEffect(() => {
    fetchRule();
  }, []);

  const fetchRule = async () => {
    setLoading(true);
    try {
      const res = await API.get("/salary-rules");
      if (res.data && Object.keys(res.data).length) {
        setRule(prev => ({ ...prev, ...res.data }));
      }
    } catch (err) {
      console.error(err);
      toast.error("Could not load salary rules");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (key, value) => {
    setRule(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await API.post("/salary-rules", rule);
      toast.success("Salary rules saved");
      setRule(prev => ({ ...prev, ...res.data.rule }));
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to save");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    if (!confirm("Reset salary rules to defaults?")) return;
    try {
      await API.delete("/salary-rules");
      toast.success("Rules deleted");
      setRule({
        baseSalaryType: "fixed",
        payDays: 30,
        absentDeductionType: "full-day",
        absentFixedAmount: 0,
        halfDayDeduction: 50,
        lateDeduction: 50,
        countSundayPayable: true,
        countHolidayPayable: true,
        earlyCheckoutDeduction: 50,
        hraPercent: 25,
        conveyance: 2000,
        childrenAllowance: 1000,
        fixedAllowance: 1000,
        paidLeaveType: "unpaid",
        sickLeaveType: "unpaid",
        casualLeaveType: "unpaid",
        monthlyPaidLeave: 1,
        monthlySickLeave: 1,
        monthlyCasualLeave: 1,
      });
    } catch (err) {
      console.error(err);
      toast.error("Failed to reset");
    }
  };

  const leaveOptions = [
    { value: "paid", label: "Paid" },
    { value: "unpaid", label: "Unpaid (Deducted)" },
    { value: "half-paid", label: "Half Paid (50% Deduction)" },
  ];

  return (
    <div className="p-6">
      <Toaster />
      <div className="space-y-4 ">
        <div>
          <label htmlFor="baseSalaryType" className="block font-medium">
            Base Salary Type
          </label>
          <select
            value={rule.baseSalaryType}
            onChange={(e) => handleChange("baseSalaryType", e.target.value)}
            className="mt-1 p-2 border rounded w-full bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
          >
            <option className="bg-white dark:bg-gray-900" value="fixed">Fixed (monthly)</option>
            <option className="bg-white dark:bg-gray-900" value="daily">Daily</option>
            <option className="bg-white dark:bg-gray-900" value="hourly">Hourly</option>
          </select>
        </div>

        <div>
          <label htmlFor="payDays" className="block font-medium">
            Pay Days (for daily salary calculation)
          </label>
          <input
            type="number"
            min="1"
            max="31"
            value={rule.payDays}
            onChange={(e) => handleChange("payDays", Number(e.target.value))}
            className="mt-1 p-2 border rounded w-full bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-medium">Absent Deduction Type</label>
            <select
              value={rule.absentDeductionType}
              onChange={(e) => handleChange("absentDeductionType", e.target.value)}
              className="mt-1 p-2 border rounded w-full bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
            >
              <option className="bg-white dark:bg-gray-900" value="full-day">Full day (daily salary)</option>
              <option className="bg-white dark:bg-gray-900" value="fixed">Fixed amount per absent day</option>
            </select>
          </div>

          {rule.absentDeductionType === "fixed" && (
            <div>
              <label className="block font-medium">Absent Fixed Amount</label>
              <input
                type="number"
                value={rule.absentFixedAmount}
                onChange={(e) => handleChange("absentFixedAmount", Number(e.target.value))}
                className="mt-1 p-2 border rounded w-full bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block font-medium">Half Day Deduction (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={rule.halfDayDeduction}
              onChange={(e) => handleChange("halfDayDeduction", Number(e.target.value))}
              className="mt-1 p-2 border rounded w-full bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block font-medium">Late Deduction (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={rule.lateDeduction}
              onChange={(e) => handleChange("lateDeduction", Number(e.target.value))}
              className="mt-1 p-2 border rounded w-full bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block font-medium">Early Checkout Deduction (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={rule.earlyCheckoutDeduction}
              onChange={(e) => handleChange("earlyCheckoutDeduction", Number(e.target.value))}
              className="mt-1 p-2 border rounded w-full bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <hr className="border-gray-200 dark:border-gray-700" />

        <h3 className="font-semibold">Payable Days Configuration</h3>
        <div className="space-y-2">
          <div className="flex items-center gap-3 p-2 rounded">
            <input
              type="checkbox"
              id="countSundayPayable"
              checked={rule.countSundayPayable}
              onChange={(e) => handleChange("countSundayPayable", e.target.checked)}
              className="h-5 w-5 rounded cursor-pointer"
            />
            <label htmlFor="countSundayPayable" className="font-medium cursor-pointer">Count Sundays as Payable?</label>
          </div>
          <div className="flex items-center gap-3 p-2 rounded">
            <input
              type="checkbox"
              id="countHolidayPayable"
              checked={rule.countHolidayPayable}
              onChange={(e) => handleChange("countHolidayPayable", e.target.checked)}
              className="h-5 w-5 rounded cursor-pointer"
            />
            <label htmlFor="countHolidayPayable" className="font-medium cursor-pointer">Count Holidays as Payable?</label>
          </div>
        </div>

        <hr className="border-gray-200 dark:border-gray-700" />

        <h3 className="font-semibold">Allowances</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-medium">HRA (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={rule.hraPercent}
              onChange={(e) => handleChange("hraPercent", Number(e.target.value))}
              className="mt-1 p-2 border rounded w-full bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block font-medium">Conveyance (₹)</label>
            <input
              type="number"
              min="0"
              value={rule.conveyance}
              onChange={(e) => handleChange("conveyance", Number(e.target.value))}
              className="mt-1 p-2 border rounded w-full bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block font-medium">Children Allowance (₹)</label>
            <input
              type="number"
              min="0"
              value={rule.childrenAllowance}
              onChange={(e) => handleChange("childrenAllowance", Number(e.target.value))}
              className="mt-1 p-2 border rounded w-full bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block font-medium">Fixed Allowance (₹)</label>
            <input
              type="number"
              min="0"
              value={rule.fixedAllowance}
              onChange={(e) => handleChange("fixedAllowance", Number(e.target.value))}
              className="mt-1 p-2 border rounded w-full bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <hr className="border-gray-200 dark:border-gray-700" />

        <h3 className="font-semibold">Leave Settings</h3>
        <p className="text-sm -mt-2 mb-2 text-gray-600 dark:text-gray-400">
          Define monthly leave quotas and how they affect salary deductions.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Paid Leave */}
          <div className="space-y-2">
            <label htmlFor="monthlyPaidLeave" className="block font-medium">Paid Leave</label>
            <div className="flex gap-2 items-center">
              <input type="number" id="monthlyPaidLeave" value={rule.monthlyPaidLeave} onChange={(e) => handleChange("monthlyPaidLeave", Number(e.target.value))} className="p-2 border rounded w-full bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500" placeholder="Count" />
              <select
                aria-label="Paid Leave Type"
                value={rule.paidLeaveType}
                onChange={(e) => handleChange("paidLeaveType", e.target.value)}
                className="p-2 border rounded w-full bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
              >
                {leaveOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
          </div>

          {/* Sick Leave */}
          <div className="space-y-2">
            <label htmlFor="monthlySickLeave" className="block font-medium">Sick Leave</label>
            <div className="flex gap-2 items-center">
              <input type="number" id="monthlySickLeave" value={rule.monthlySickLeave} onChange={(e) => handleChange("monthlySickLeave", Number(e.target.value))} className="p-2 border rounded w-full bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500" placeholder="Count" />
              <select
                aria-label="Sick Leave Type"
                value={rule.sickLeaveType}
                onChange={(e) => handleChange("sickLeaveType", e.target.value)}
                className="p-2 border rounded w-full bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
              >
                {leaveOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
          </div>

          {/* Casual Leave */}
          <div className="space-y-2">
            <label htmlFor="monthlyCasualLeave" className="block font-medium">Casual Leave</label>
            <div className="flex gap-2 items-center">
              <input type="number" id="monthlyCasualLeave" value={rule.monthlyCasualLeave} onChange={(e) => handleChange("monthlyCasualLeave", Number(e.target.value))} className="p-2 border rounded w-full bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500" placeholder="Count" />
              <select
                aria-label="Casual Leave Type"
                value={rule.casualLeaveType}
                onChange={(e) => handleChange("casualLeaveType", e.target.value)}
                className="p-2 border rounded w-full bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-600 focus:ring-blue-500 focus:border-blue-500"
              >
                {leaveOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3 justify-end mt-4">
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
            disabled={loading}
          >
            Reset
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            disabled={loading}
          >
            {loading ? "Saving..." : "Save Rules"}
          </button>
        </div>
      </div>
    </div>
  );
}
