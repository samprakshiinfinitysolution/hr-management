
import React, { useState, useEffect } from "react";
import { toast, Toaster } from "react-hot-toast";
import { Save } from "lucide-react";
import API from "../../utils/api";

export default function EmpEodReports() {
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    reportingTime: "",
    name: "",
    eodTime: "",
    project: "",
    summary: "",
  });

  const [rows, setRows] = useState([]);
  const [allReports, setAllReports] = useState([]); // store all EODs for dropdown
  const [selectedDate, setSelectedDate] = useState(""); // date selected from dropdown

  // 🧠 Default time rows (used when creating new EOD)
  const defaultRows = [
    { time: "10-11am", task: "", description: "", status: "", remarks: "" },
    { time: "11-12pm", task: "", description: "", status: "", remarks: "" },
    { time: "12-1pm", task: "", description: "", status: "", remarks: "" },
    { time: "1-1:30pm", task: "Lunch Break", description: "Lunch", status: "", remarks: "" },
    { time: "1:30-2:30pm", task: "", description: "", status: "", remarks: "" }, // Status is explicitly empty
    { time: "2:30-3:30pm", task: "", description: "", status: "", remarks: "" }, // Status is explicitly empty
    { time: "3:30-3:40pm", task: "Tea Break", description: "Break", status: "", remarks: "" },
    { time: "3:40-4:40pm", task: "", description: "", status: "", remarks: "" },
    { time: "4:40-6pm", task: "", description: "", status: "", remarks: "" },
  ];

  useEffect(() => {
    fetchAllEodReports();
  }, []);

  const fetchAllEodReports = async () => {
  try {
    const res = await API.get("/eod/my");
    let reports = Array.isArray(res.data) ? res.data : [];

    // ✅ Remove duplicates by date
    const unique = [];
    const seenDates = new Set();
    for (const r of reports) {
      const d = r.date?.split("T")[0];
      if (!seenDates.has(d)) {
        unique.push(r);
        seenDates.add(d);
      }
    }

    // ✅ Sort by latest date first
    unique.sort((a, b) => new Date(b.date) - new Date(a.date));

    const todayString = new Date().toISOString().split("T")[0];
    const todayReport = unique.find(r => r.date?.split("T")[0] === todayString);

    // Add "Today" as an option if no report for today exists
    const dateOptions = [...unique];
    if (!todayReport) {
      dateOptions.unshift({ _id: 'today', date: todayString });
    }
    setAllReports(dateOptions);

    if (todayReport) {
      // If today's report exists, load it
      setSelectedDate(todayString);
      loadReportData(todayReport);
    } else {
      // Otherwise, show a new form for today
      resetForm();
    }
  } catch (err) {
    toast.error("Failed to load your EOD reports");
  }
};


  // ✅ Load specific EOD by date
  const handleDateSelect = (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    const selectedReport = allReports.find(
      (r) => r.date?.split("T")[0] === date
    );
    if (selectedReport) {
      loadReportData(selectedReport);
    } else {
      // If not found, reset fields for new entry
      resetForm();
    }
  };

  const loadReportData = (report) => {
    setForm({
      date: report.date?.split("T")[0] || "",
      reportingTime: report.reportingTime || "",
      name: report.name || "",
      eodTime: report.eodTime || "",
      project: report.project || "",
      summary: report.summary || "",
    });
    setRows(report.rows || defaultRows);
  };

  const resetForm = () => {
    const todayString = new Date().toISOString().split("T")[0];
    setForm({
      date: new Date().toISOString().split("T")[0],
      reportingTime: "",
      name: "",
      eodTime: "",
      project: "",
      summary: "",
    });
    setRows(defaultRows);
    setSelectedDate(todayString); // Ensure dropdown is set to today
  };

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRowChange = (index, field, value) => {
    const updatedRows = [...rows];
    updatedRows[index][field] = value;
    setRows(updatedRows);
  };
const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    const res = await API.post("/eod", { ...form, rows });
    toast.success("EOD saved successfully!");

    // ✅ Reload list fresh
    const saved = res.data;
    await fetchAllEodReports();

    // ✅ Auto-select the newly saved report
    setSelectedDate(saved.date?.split("T")[0]);
    loadReportData(saved);
  } catch (err) {
    toast.error(err.response?.data?.message || "Failed to submit EOD report");
  }
};

  return (
    <div className="min-h-screen p-6 transition">
      <Toaster />
      <h1 className="text-3xl font-bold mb-6 text-center">
        📝 End of Day (EOD) Report
      </h1>
<div className="mb-4 flex flex-col md:flex-row items-center gap-4">
  <label className="font-semibold text-sm">Select Date:</label>
  <select
    value={selectedDate}
    onChange={handleDateSelect}
    className="border p-2 rounded-md dark:border-gray-600 "
  >
    {allReports.length === 0 && (
      <option value="">No EOD found</option>
    )}
    {allReports.map((report) => (
      <option key={report._id} value={report.date?.split("T")[0]} className="text-black">
        {report._id === 'today' 
          ? `Today (${new Date(report.date).toLocaleDateString("en-IN")})` 
          : new Date(report.date).toLocaleDateString("en-IN")
        }
      </option>
    ))}
  </select>
</div>

      <form
        onSubmit={handleSubmit}
        className="shadow-lg rounded-lg p-6 border border-gray-200 dark:border-gray-700"
      >
        {/* HEADER SECTION */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="font-semibold text-sm">Date</label>
            <input
              type="date"
              name="date"
              value={form.date}
              onChange={handleFormChange}
              className="w-full mt-1 p-2 border rounded-md dark:border-gray-600"
            />
          </div>
          <div>
            <label className="font-semibold text-sm">Reporting Time</label>
            <input
              type="time"
              name="reportingTime"
              value={form.reportingTime}
              onChange={handleFormChange}
              className="w-full mt-1 p-2 border rounded-md dark:border-gray-600"
            />
          </div>
          <div>
            <label className="font-semibold text-sm">Name</label>
            <input
              type="text"
              name="name"
              value={form.name}
              onChange={handleFormChange}
              placeholder="Enter employee name"
              className="w-full mt-1 p-2 border rounded-md dark:border-gray-600"
            />
          </div>
          <div>
            <label className="font-semibold text-sm">EOD Time</label>
            <input
              type="time"
              name="eodTime"
              value={form.eodTime}
              onChange={handleFormChange}
              className="w-full mt-1 p-2 border rounded-md dark:border-gray-600"
            />
          </div>
          <div className="md:col-span-2">
            <label className="font-semibold text-sm">Project</label>
            <input
              type="text"
              name="project"
              value={form.project}
              onChange={handleFormChange}
              placeholder="Project name"
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
              {rows.map((row, i) => (
                <tr
                  key={i}
                  className=""
                >
                  <td className={`border p-2 text-sm font-semibold ${row.task.includes("Break") ? "text-gray-500 dark:text-gray-500" : ""}`}>
                    {row.time}
                  </td>
                  <td className="border p-2">
                    <input
                      type="text"
                      value={row.task}
                      onChange={(e) =>
                        handleRowChange(i, "task", e.target.value)
                      }
                      readOnly={row.task.includes("Break")} // Keep task name for breaks read-only
                      className={`w-full p-1 border rounded-sm text-sm dark:border-gray-600 ${row.task.includes("Break") ? "bg-gray-400 text-black" : ""}`}
                    />
                  </td>
                  <td className="border p-2">
                    <input
                      type="text"
                      value={row.description}
                      onChange={(e) =>
                        handleRowChange(i, "description", e.target.value)
                      }
                      readOnly={row.task.includes("Break")} // Keep description for breaks read-only
                      className={`w-full p-1 border rounded-sm text-sm dark:border-gray-600 ${row.task.includes("Break") ? "bg-gray-400 text-black" : ""}`}
                    />
                  </td>
                  <td className="border p-2">
                    <select
                      value={row.status}
                      onChange={(e) =>
                        handleRowChange(i, "status", e.target.value)
                      }
                      className={`w-full p-1 border rounded-sm text-sm dark:border-gray-600`}
                    >
                      <option value=""className="text-black">Select</option>
                      <option value="Done"className="text-black">Done</option>
                      <option value="Pending"className="text-black">Pending</option>
                    </select>
                  </td>
                  <td className="border p-2">
                    <input
                      type="text"
                      value={row.remarks}
                      onChange={(e) =>
                        handleRowChange(i, "remarks", e.target.value)
                      }
                      readOnly={row.task.includes("Break")}
                      className={`w-full p-1 border rounded-sm text-sm dark:border-gray-600 ${row.task.includes("Break") ? "bg-gray-400 text-black" : ""}`}
                    />
                  </td>
                </tr>
              ))}
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
            onChange={handleFormChange}
            rows={3}
            placeholder="Write your daily summary or notes here..."
            className="w-full p-3 border rounded-md dark:border-gray-600"
          />
        </div>

        {/* SUBMIT BUTTON */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-all duration-200"
          >
            <Save size={18} />
            Save Report
          </button>
        </div>
      </form>
    </div>
  );
}
