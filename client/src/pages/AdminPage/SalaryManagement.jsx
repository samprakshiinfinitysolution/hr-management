import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  Calendar,
  Send,
  Calculator,
  Eye,
  X,
  User,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Settings,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import API from "../../utils/api";
import AdminSalarySettings from "./AdminSalarySettings";

export default function SalaryManagement() {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [salaryData, setSalaryData] = useState(null);
  const [slips, setSlips] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showDeleteConfirmationModal, setShowDeleteConfirmationModal] = useState(false);
  const [slipToDeleteId, setSlipToDeleteId] = useState(null);
  const [countdown, setCountdown] = useState(5);
  const slipModalRef = useRef(null);

  useEffect(() => {
    fetchEmployees();
    fetchSlips();
  }, []);

  // Click outside to close modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (slipModalRef.current && !slipModalRef.current.contains(event.target)) {
        setSelectedSlip(null);
      }
    };

    if (selectedSlip) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedSlip]);

  // Countdown for delete confirmation
  useEffect(() => {
    if (showDeleteConfirmationModal && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (!showDeleteConfirmationModal) {
      setCountdown(); // Reset countdown when modal is closed
    }
  }, [showDeleteConfirmationModal, countdown]);


  const fetchEmployees = async () => {
    try {
      const res = await API.get("/admin/employees");
      setEmployees(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to fetch employees");
    }
  };

  const fetchSlips = async () => {
    try {
      const res = await API.get("/salary");
      // Ensure that we always set an array to the slips state
      const slipsData = Array.isArray(res.data) ? res.data : [];
      setSlips(slipsData);
    } catch (err) {
      console.error("Failed to fetch slips:", err);
    }
  };

  const handleCalculate = async () => {
    if (!selectedEmployee || !month || !year) {
      setError("Please select an employee, month, and year");
      return;
    }
    setLoading(true);
    try {
      const res = await API.post("/salary/calculate", {
        employeeId: selectedEmployee,
        month: parseInt(month),
        year: parseInt(year),
      });
      setSalaryData(res.data);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to calculate salary");
    } finally {
      setLoading(false);
    }
  };

  const handleSendSlip = async () => {
    if (!salaryData) return toast.error("Calculate salary first");

    try {
      await API.post("/salary/send", {
        employeeId: selectedEmployee,
        month: parseInt(month),
        year: parseInt(year),

        baseSalary: salaryData.baseSalary,
        totalDeduction: salaryData.deduction, // Use totalDeduction to be clear
        remarks: salaryData.remarks,

        attendance: {
          present: salaryData.presentDays,
          absent: salaryData.absentDays,
          halfDay: salaryData.halfDays,
          late: salaryData.lateDays,
          earlyCheckout: salaryData.earlyCheckout,
        },

        earnings: {
          base: salaryData.baseSalary,
          hra: salaryData.hra,
          conveyance: salaryData.conveyance,
          childrenAllowance: salaryData.childrenAllowance,
          fixedAllowance: salaryData.fixedAllowance,
          grossSalary: salaryData.grossSalary,
        },

        deductions: {
          absentDeduction: salaryData.absentDeduction,
          halfDayDeduction: salaryData.halfDayDeduction,
          lateDeduction: salaryData.lateDeduction,
          earlyCheckoutDeduction: salaryData.earlyCheckoutDeduction,
          professionalTax: salaryData.professionalTax,
          pf: salaryData.pf, // Make sure pf is in salaryData
          total: salaryData.deduction // This is the total deduction
        }
      });

      toast.success("Slip sent");
      fetchSlips();

    } catch (err) {
      console.log(err);
      toast.error("Slip sending failed");
    }
  };


  const handleViewSlip = (slip) => {
    setSelectedSlip(slip);
  };

  const handleDeleteClick = (slipId) => {
    setSlipToDeleteId(slipId);
    setShowDeleteConfirmationModal(true);
  };

  return (
    <div className="min-h-screen p-6">
      <Toaster />
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Calculator className="text-blue-600" size={32} />
            Salary Management
          </h1>
          <button
            onClick={() => setShowSettings(true)}
            className="px-4 py-2 rounded bg-gray-200 text-gray-800 hover:bg-gray-300 flex items-center gap-2"
          >
            <Settings size={20} />
            Salary Rules
          </button>
        </div>

        {error && (
          <div className="border rounded-lg p-4 mb-6 flex items-center gap-3">
            <AlertTriangle className="text-red-500" size={20} />
            <p className="font-medium">{error}</p>
          </div>
        )}

        {/* Calculation Form */}
        <div className="shadow-lg rounded-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-6">Calculate Monthly Salary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Employee</label>
              <select
                value={selectedEmployee}
                onChange={(e) => setSelectedEmployee(e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 
               hover:border-blue-500 transition duration-200 cursor-pointer"
              >
                <option value="" className=" text-black">
                  Select Employee
                </option>

                {employees.map((emp) => (
                  <option
                    key={emp._id}
                    value={emp._id}
                    className="bg-white text-black hover:bg-blue-100 dark:hover:bg-blue-600 
                   cursor-pointer transition-colors duration-150"
                  >
                    {emp.name} - {emp.position}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Month</label>
              <input
                type="number"
                min="1"
                max="12"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                placeholder="e.g., 10 for October"
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Year</label>
              <input
                type="number"
                min="2000"
                max="2100"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="e.g., 2025"
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <button
            onClick={handleCalculate}
            disabled={loading}
            className="mt-6 w-full py-3 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed bg-blue-600 text-white transition-colors"
          >
            {loading ? "Calculating..." : "Calculate Salary"}
          </button>
        </div>

        {/* Salary Calculation Result */}
        {salaryData && (
          <div className="shadow-lg rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <CheckCircle className="text-green-500" size={24} />
              Salary Calculation Result
            </h2>
            <div className="space-y-4">
              {/* Earnings */}
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Earnings</h3>
                <div className="flex justify-between"><span>Base Salary</span> <span className="font-mono">₹{salaryData.baseSalary?.toFixed(2) || '0.00'}</span></div>
                <div className="flex justify-between"><span>Allowances</span> <span className="font-mono">₹{salaryData.totalAllowances?.toFixed(2) || '0.00'}</span></div>
                <div className="flex justify-between font-bold border-t pt-2 mt-2"><span>Gross Salary</span> <span className="font-mono">₹{salaryData.grossSalary?.toFixed(2) || '0.00'}</span></div>
              </div>

              {/* Attendance & Deductions */}
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Attendance & Deductions</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-4">
                  <div><p className="text-sm">Present</p><p className="font-bold text-lg">{salaryData.presentDays ?? 'N/A'}</p></div>
                  <div><p className="text-sm">Absent</p><p className="font-bold text-lg">{salaryData.absentDays ?? 'N/A'}</p></div>
                  <div><p className="text-sm">Half Days</p><p className="font-bold text-lg">{salaryData.halfDays ?? 'N/A'}</p></div>
                  <div><p className="text-sm">Late</p><p className="font-bold text-lg">{salaryData.lateDays ?? 'N/A'}</p></div>
                  <div><p className="text-sm">Early Checkout</p><p className="font-bold text-lg">{salaryData.earlyCheckout ?? 'N/A'}</p></div>
                </div>
                <div className="flex justify-between"><span>Absent Deduction</span> <span className="font-mono">- ₹{salaryData.absentDeduction?.toFixed(2) || '0.00'}</span></div>
                <div className="flex justify-between"><span>Half Day Deduction</span> <span className="font-mono">- ₹{salaryData.halfDayDeduction?.toFixed(2) || '0.00'}</span></div>
                <div className="flex justify-between"><span>Late Deduction</span> <span className="font-mono">- ₹{salaryData.lateDeduction?.toFixed(2) || '0.00'}</span></div>
                <div className="flex justify-between"><span>Early Checkout Deduction</span> <span className="font-mono">- ₹{salaryData.earlyCheckoutDeduction?.toFixed(2) || '0.00'}</span></div>
                <div className="flex justify-between font-bold border-t pt-2 mt-2"><span>Total Deduction</span> <span className="font-mono">- ₹{salaryData.deduction?.toFixed(2) || '0.00'}</span></div>
              </div>

              {/* Net Salary */}
              <div className="p-4 text-black bg-white dark:bg-gray-300 rounded-lg flex justify-between items-center">
                <p className="text-lg font-bold">Net Payable Salary</p>
                <p className="text-2xl font-bold font-mono">₹{salaryData.netSalary?.toFixed(2) || '0.00'}</p>
              </div>
            </div>

            <div className="mb-6 mt-6">
              <p className="text-sm font-medium mb-2">Remarks</p>
              <p className="p-4 rounded-lg bg-white dark:bg-gray-300 text-sm text-black">
                {salaryData.remarks || "No remarks."}
              </p>
            </div>

            <button
              onClick={handleSendSlip}
              disabled={loading}
              className="w-full py-3 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed bg-green-600 text-white transition-colors flex items-center justify-center gap-2"
            >
              <Send size={20} />
              {loading ? "Sending..." : "Send Salary Slip"}
            </button>
          </div>
        )}

        {/* Sent Slips */}
        <div className="shadow-lg rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <FileText className="text-blue-600" size={24} />
            Sent Salary Slips
          </h2>
          {slips.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 mb-4" />
              <p>No salary slips sent yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Employee
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Month/Year
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Net Salary
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Sent On
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {slips.map((slip) => (
                    <tr key={slip._id} className="hover:bg-gray-300 hover:text-black">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {slip.employeeId ? slip.employeeId.name : "Employee not found"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {slip.month}/{slip.year}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        ₹{slip.netSalary}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {new Date(slip.sentAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleViewSlip(slip)}
                          className="hover:text-blue-900"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(slip._id)}
                          className="hover:text-red-600 ml-2"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* View Slip Modal */}
        {selectedSlip && (
          <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-5 bg-black/50">
            <div ref={slipModalRef} className="rounded-lg shadow-xl max-w-2xl w-full bg-white text-black dark:bg-gray-800 dark:text-white max-h-[90vh] overflow-y-auto">

              {/* HEADER */}
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold p-4">
                  Salary Slip for {selectedSlip.month}/{selectedSlip.year}
                </h2>
                <button onClick={() => setSelectedSlip(null)} className="hover:text-red-500">
                  <X size={24} />
                </button>
              </div>

              <div className="p-6 space-y-4">

                {/* EMPLOYEE NAME */}
                <p className="font-semibold text-lg">
                  Employee: {selectedSlip.employeeId?.name || "N/A"}
                </p>

                {/* EARNINGS */}
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Earnings</h3>

                  <div className="flex justify-between">
                    <span>Base Salary</span>
                    <span className="font-mono">
                      ₹{Number(selectedSlip.earnings?.base ?? selectedSlip.baseSalary).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span>Allowances</span>
                    <span className="font-mono">
                      ₹{Number((selectedSlip.earnings?.grossSalary ?? 0) - (selectedSlip.baseSalary ?? 0)).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex justify-between font-bold border-t pt-2 mt-2">
                    <span>Gross Salary</span>
                    <span className="font-mono">
                      ₹{Number(selectedSlip.earnings?.grossSalary ?? 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* ATTENDANCE & DEDUCTIONS */}
                <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Attendance & Deductions</h3>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center mb-4">
                    <div><p className="text-sm">Present</p><p className="font-bold text-lg">{selectedSlip.attendance?.present ?? 'N/A'}</p></div>
                    <div><p className="text-sm">Absent</p><p className="font-bold text-lg">{selectedSlip.attendance?.absent ?? 'N/A'}</p></div>
                    <div><p className="text-sm">Half Days</p><p className="font-bold text-lg">{selectedSlip.attendance?.halfDay ?? 'N/A'}</p></div>
                    <div><p className="text-sm">Late</p><p className="font-bold text-lg">{selectedSlip.attendance?.late ?? 'N/A'}</p></div>
                    <div><p className="text-sm">Early Checkout</p><p className="font-bold text-lg">{selectedSlip.attendance?.earlyCheckout ?? 'N/A'}</p></div>
                  </div>
                  <div className="flex justify-between">
                    <span>Absent Deduction</span>
                    <span className="font-mono">- ₹{Number(selectedSlip.deductions?.absentDeduction ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Half Day Deduction</span>
                    <span className="font-mono">- ₹{Number(selectedSlip.deductions?.halfDayDeduction ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Late Deduction</span>
                    <span className="font-mono">- ₹{Number(selectedSlip.deductions?.lateDeduction ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Early Checkout Deduction</span>
                    <span className="font-mono">- ₹{Number(selectedSlip.deductions?.earlyCheckoutDeduction ?? 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold border-t pt-2 mt-2">
                    <span>Total Deduction</span>
                    <span className="font-mono">
                      - ₹{Number(selectedSlip.deduction ?? 0).toFixed(2)}
                    </span>
                  </div>
              </div>

                {/* NET SALARY */}
                <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg flex justify-between items-center">
                  <p className="text-lg font-bold">Net Payable Salary</p>
                  <p className="text-2xl font-bold font-mono">
                    ₹{Number(selectedSlip.netSalary ?? 0).toFixed(2)}
                  </p>
                </div>

                {/* REMARKS */}
                <p><strong>Remarks:</strong> {selectedSlip.remarks || "No remarks."}</p>
                <p className="text-xs text-gray-500">
                  <strong>Sent On:</strong> {new Date(selectedSlip.sentAt).toLocaleString()}
                </p>

              </div>

              {/* CLOSE BUTTON */}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedSlip(null)}
                  className="px-4 py-2 m-4 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}


        {/* Delete Confirmation Modal */}
        {showDeleteConfirmationModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="relative rounded-lg p-6 max-w-md w-full bg-white text-black dark:bg-gray-800 dark:text-white">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Confirm Deletion</h2>
                <button onClick={() => { setShowDeleteConfirmationModal(false); setSlipToDeleteId(null); }} className="hover:text-gray-700">
                  <X size={20} />
                </button>
              </div>
              <p className=" mb-6">
                Are you sure you want to delete this salary slip? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => {
                    setShowDeleteConfirmationModal(false);
                    setSlipToDeleteId(null);
                  }}
                  className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    try {
                      await API.delete(`/salary/${slipToDeleteId}`);
                      toast.success("Salary slip deleted successfully");
                      fetchSlips();
                      setShowDeleteConfirmationModal(false);
                      setSlipToDeleteId(null);
                    } catch (err) {
                      toast.error(err.response?.data?.message || "Failed to delete slip");
                    }
                  }}
                  disabled={countdown > 0}
                  className={`px-4 py-2 text-white rounded-lg transition ${countdown > 0 ? "bg-red-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"}`}
                >
                  {countdown > 0 ? `Yes, Delete (${countdown})` : "Yes, Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Salary Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white text-black dark:bg-gray-900 dark:text-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center sticky top-0 bg-white dark:bg-gray-900 z-10">
                <h2 className="text-xl font-bold">Salary Rule Settings</h2>
                <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-red-500 dark:hover:text-white">
                  <X size={24} />
                </button>
              </div>
              <AdminSalarySettings />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
