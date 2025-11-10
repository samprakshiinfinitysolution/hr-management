import React, { useState, useEffect, useRef } from "react";
import {
  FileText,
  Calendar,
  Send,
  Calculator,
  Eye,
  X,
  User,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import API from "../../utils/api";

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
      setSlips(res.data);
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
    if (!salaryData) {
      setError("Please calculate salary first");
      return;
    }
    setLoading(true);
    try {
      await API.post("/salary/send", {
        employeeId: selectedEmployee,
        month: parseInt(month),
        year: parseInt(year),
        baseSalary: salaryData.baseSalary,
        deduction: salaryData.deduction,
        remarks: salaryData.remarks,
      });
      toast.success("Salary slip sent successfully!");
      fetchSlips();
      setSalaryData(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send salary slip");
    } finally {
      setLoading(false);
    }
  };

  const handleViewSlip = (slip) => {
    setSelectedSlip(slip);
  };

  return (
    <div className="min-h-screen p-6">
      <Toaster />
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 flex items-center gap-3">
          <Calculator className="text-blue-600" size={32} />
          Salary Management
        </h1>

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-lg">
                <p className="text-sm">Base Salary</p>
                <p className="text-xl font-bold">₹{salaryData.baseSalary}</p>
              </div>
              <div className="p-4 rounded-lg">
                <p className="text-sm">Absent Days</p>
                <p className="text-xl font-bold">{salaryData.absentDays}</p>
              </div>
              <div className="p-4 rounded-lg">
                <p className="text-sm">Late Days</p>
                <p className="text-xl font-bold">{salaryData.lateDays}</p>
              </div>
              <div className="p-4 rounded-lg">
                <p className="text-sm">Total Deduction</p>
                <p className="text-xl font-bold">₹{salaryData.deduction}</p>
              </div>
              <div className="p-4 rounded-lg md:col-span-2">
                <p className="text-sm">Net Salary</p>
                <p className="text-2xl font-bold">₹{salaryData.netSalary}</p>
              </div>
            </div>
            <div className="mb-6">
              <p className="text-sm font-medium mb-2">Remarks</p>
              <p className="p-4 rounded-lg">{salaryData.remarks}</p>
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
          <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4 bg-black/50">
            <div ref={slipModalRef} className="rounded-lg p-6 max-w-md w-full bg-white text-black dark:bg-gray-800 dark:text-white">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Salary Slip Details</h2>
                <button onClick={() => setSelectedSlip(null)} className="hover:text-gray-700">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-3">
                <p><strong>Employee:</strong> {selectedSlip.employeeId?.name || "N/A"}</p>
                <p><strong>Month/Year:</strong> {selectedSlip.month}/{selectedSlip.year}</p>
                <p><strong>Base Salary:</strong> ₹{selectedSlip.baseSalary}</p>
                <p><strong>Deductions:</strong> ₹{selectedSlip.deduction}</p>
                <p className="font-bold"><strong>Net Salary:</strong> ₹{selectedSlip.netSalary}</p>
                <p><strong>Remarks:</strong> {selectedSlip.remarks || "-"}</p>
                <p className="text-xs text-gray-500">
                  <strong>Sent On:</strong> {new Date(selectedSlip.sentAt).toLocaleString()}
                </p>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedSlip(null)}
                  className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
