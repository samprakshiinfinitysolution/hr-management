
import React, { useState, useEffect } from "react";
import API from "../../utils/api";
import { toast } from "react-hot-toast";

export default function AdminEodReports() {
  const [form, setForm] = useState({
    date: "",
    reportingTime: "",
    name: "",
    eodTime: "",
    project: "",
    summary: "",
  });

  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [employeeReports, setEmployeeReports] = useState([]); // all EODs of selected employee
  const [selectedDate, setSelectedDate] = useState("");

  useEffect(() => {
    fetchEmployees();
  }, []);

  // ✅ Fetch all employees for dropdown
  const fetchEmployees = async () => {
    try {
      const res = await API.get("/admin/employees");
      setEmployees(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error("Failed to load employees");
    }
  };

  // ✅ Fetch all EODs for selected employee
  const fetchEmployeeEods = async (employeeId) => {
    if (!employeeId) return;
    try {
      const res = await API.get(`/eod/admin?employeeId=${employeeId}`);
      const reports = Array.isArray(res.data) ? res.data : [];
      setEmployeeReports(reports);

      if (reports.length > 0) {
        const latest = reports[0];
        setSelectedDate(latest.date?.split("T")[0]);
        loadReport(latest);
      } else {
        resetForm();
      }
    } catch (err) {
      toast.error("Failed to load EOD reports");
    }
  };

  // ✅ Handle Employee dropdown change
  const handleEmployeeChange = (e) => {
    const empId = e.target.value;
    setSelectedEmployee(empId);
    setSelectedDate("");
    setEmployeeReports([]);
    resetForm();
    fetchEmployeeEods(empId);
  };

  // ✅ Handle Date selection
  const handleDateChange = (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    const selectedReport = employeeReports.find(
      (r) => r.date?.split("T")[0] === date
    );
    if (selectedReport) loadReport(selectedReport);
  };

  // ✅ Load data into form and table
  const loadReport = (report) => {
    setForm({
      date: report.date?.split("T")[0] || "",
      reportingTime: report.reportingTime || "",
      name: report.name || "",
      eodTime: report.eodTime || "",
      project: report.project || "",
      summary: report.summary || "",
    });
    setRows(report.rows || []);
  };

  const resetForm = () => {
    setForm({
      date: "",
      reportingTime: "",
      name: "",
      eodTime: "",
      project: "",
      summary: "",
    });
    setRows([]);
  };

  return (
    <div className="min-h-screen p-6 transition">
      <h1 className="text-3xl font-bold mb-6 text-center">
        📝 End of Day (EOD) Report
      </h1>

      <div className="shadow-lg rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        {/* HEADER SECTION */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {/* Date Display */}
          <div>
            <label className="font-semibold text-sm">Date</label>
            <input
              type="date"
              name="date"
              value={form.date}
              readOnly
              className="w-full mt-1 p-2 border rounded-md dark:border-gray-600"
            />
          </div>

          {/* Reporting Time */}
          <div>
            <label className="font-semibold text-sm">Reporting Time</label>
            <input
              type="time"
              name="reportingTime"
              value={form.reportingTime}
              readOnly
              className="w-full mt-1 p-2 border rounded-md dark:border-gray-600"
            />
          </div>

          {/* 🔽 Employee Dropdown */}
          <div>
            <label className="font-semibold text-sm ">Employee Name</label>
            <select
              name="name"
              value={selectedEmployee}
              onChange={handleEmployeeChange}
              className="w-full mt-1 p-2 border rounded-md dark:border-gray-600 "
            >
              <option value="" className="text-black">Select Employee</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id} className="text-black">
                  {emp.name} - {emp.position}
                </option>
              ))}
            </select>
          </div>

          {/* EOD Time */}
          <div>
            <label className="font-semibold text-sm">EOD Time</label>
            <input
              type="time"
              name="eodTime"
              value={form.eodTime}
              readOnly
              className="w-full mt-1 p-2 border rounded-md dark:border-gray-600"
            />
          </div>

          {/* 🔽 Date Dropdown (for this employee) */}
          {employeeReports.length > 0 && (
            <div className="md:col-span-2">
              <label className="font-semibold text-sm">Select Date</label>
              <select
                value={selectedDate}
                onChange={handleDateChange}
                className="w-full mt-1 p-2 border rounded-md dark:border-gray-600"
              >
                {(() => {
                  // ✅ Filter unique dates and sort (latest first)
                  const uniqueDates = [];
                  const seen = new Set();

                  employeeReports.forEach((r) => {
                    const d = r.date?.split("T")[0];
                    if (!seen.has(d)) {
                      seen.add(d);
                      uniqueDates.push(r);
                    }
                  });

                  uniqueDates.sort((a, b) => new Date(b.date) - new Date(a.date));

                  return uniqueDates.map((r) => (
                    <option
                      key={r._id}
                      value={r.date?.split("T")[0]}
                      className="text-black"
                    >
                      {new Date(r.date).toLocaleDateString("en-IN")}
                    </option>
                  ));
                })()}
              </select>
            </div>
          )}


          {/* Project */}
          <div className="md:col-span-2">
            <label className="font-semibold text-sm">Project</label>
            <input
              type="text"
              name="project"
              value={form.project}
              readOnly
              className="w-full mt-1 p-2 border rounded-md dark:border-gray-600"
            />
          </div>
        </div>

        {/* TABLE SECTION */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full border dark:border-gray-600">
            <thead>
              <tr>
                <th className="border p-2 text-sm">Time</th>
                <th className="border p-2 text-sm">Task / Project</th>
                <th className="border p-2 text-sm">Description of Work</th>
                <th className="border p-2 text-sm">Status</th>
                <th className="border p-2 text-sm">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan="5"
                    className="text-center py-4 text-gray-500 dark:text-gray-400"
                  >
                    No EOD data available
                  </td>
                </tr>
              ) : (
                rows.map((row, i) => (
                  <tr key={i}>
                    <td className="border p-2 text-sm font-semibold">
                      {row.time}
                    </td>
                    <td className="border p-2 text-sm">{row.task}</td>
                    <td className="border p-2 text-sm">{row.description}</td>
                    <td className="border p-2 text-sm">{row.status}</td>
                    <td className="border p-2 text-sm">{row.remarks}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* SUMMARY SECTION */}
        <div className="mb-6">
          <label className="font-semibold text-sm block mb-2">
            Summary / Notes
          </label>
          <textarea
            name="summary"
            value={form.summary}
            readOnly
            rows={3}
            className="w-full p-3 border rounded-md dark:border-gray-600"
          />
        </div>
      </div>
    </div>
  );
}
