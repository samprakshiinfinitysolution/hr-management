
// pages/EmpEodReports.jsx  (or wherever your component lives)
import React, { useState, useEffect, useRef } from "react";
import { toast, Toaster } from "react-hot-toast";
import { Save } from "lucide-react";
import API from "../../utils/api";
import moment from "moment-timezone";
export default function EmpEodReports() {
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    reportingTime: "",
    name: "",
    eodTime: "",
    project: "",
    summary: "",
    nextDayPlan: "",
  });

  const [rows, setRows] = useState([]);
  const [allReports, setAllReports] = useState([]); // store all EODs for dropdown
  const [selectedDate, setSelectedDate] = useState(""); // date selected from dropdown

  const [attendanceToday, setAttendanceToday] = useState(null); // attendance object for today
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false); // if selected date is past -> view only

  // live clock for EOD time (Option A)
  const [nowClock, setNowClock] = useState(new Date());
  const clockRef = useRef(null);

  const defaultRows = [
    { time: "10-11am", task: "", description: "", status: "", remarks: "" },
    { time: "11-12pm", task: "", description: "", status: "", remarks: "" },
    { time: "12-1pm", task: "", description: "", status: "", remarks: "" },
    { time: "1-1:30pm", task: "Lunch Break", description: "Lunch", status: "", remarks: "" },
    { time: "1:30-2:30pm", task: "", description: "", status: "", remarks: "" },
    { time: "2:30-3:30pm", task: "", description: "", status: "", remarks: "" },
    { time: "3:30-3:40pm", task: "Tea Break", description: "Break", status: "", remarks: "" },
    { time: "3:40-4:40pm", task: "", description: "", status: "", remarks: "" },
    { time: "4:40-6pm", task: "", description: "", status: "", remarks: "" },
  ];

  // Helpers
  const todayString = () => new Date().toISOString().split("T")[0];

  useEffect(() => {
    fetchAllEodReports();
    fetchMyAttendance();
    // start live clock (update every 1s or 30s; using 1s for smoothness)
    clockRef.current = setInterval(() => setNowClock(new Date()), 1000);
    return () => clearInterval(clockRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch attendance for current user (to check check-in & login time)
  const fetchMyAttendance = async () => {
    try {
      const res = await API.get("/attendance/me");
      const arr = Array.isArray(res.data) ? res.data : [];
      const today = todayString();
      // attendance records may have date stored as ISO or date object
      const todayRec = arr.find((r) => {
        const d = r.date ? String(r.date).split("T")[0] : null;
        return d === today;
      });
      if (todayRec && (todayRec.checkIn || todayRec.login)) {
        setAttendanceToday(todayRec);
        setHasCheckedInToday(true);
        // auto-fill reportingTime from login/checkIn if not set by selected report
        setForm((prev) => ({
          ...prev,
          reportingTime:
            prev.reportingTime ||
            (todayRec.login ? todayRec.login : moment(todayRec.checkIn).tz("Asia/Kolkata").format("HH:mm")),
        }));
      } else {
        setAttendanceToday(null);
        setHasCheckedInToday(false);
      }
    } catch (err) {
      console.error("fetchMyAttendance:", err);
      toast.error("Could not load attendance");
      setHasCheckedInToday(false);
    }
  };

  const fetchAllEodReports = async () => {
    setIsLoading(true);
    try {
      const res = await API.get("/eod/my");
      let reports = Array.isArray(res.data) ? res.data : [];

      // Remove duplicate dates and sort desc
      const byDate = [];
      const seen = new Set();
      for (const r of reports) {
        const d = r.date?.split("T")[0] || r.date;
        if (!seen.has(d)) {
          seen.add(d);
          byDate.push(r);
        }
      }
      byDate.sort((a, b) => new Date(b.date) - new Date(a.date));

      // Ensure "today" option exists
      const today = todayString();
      const hasToday = byDate.some((r) => (r.date?.split("T")[0] || r.date) === today);
      const options = [...byDate];
      if (!hasToday) options.unshift({ _id: "today", date: today });

      setAllReports(options);

      // Auto-select today's report (if exists) else set to today (new)
      if (hasToday) {
        setSelectedDate(today);
        const rep = byDate.find((r) => (r.date?.split("T")[0] || r.date) === today);
        if (rep) loadReportData(rep);
      } else {
        // fresh new form for today
        resetFormForToday();
      }
    } catch (err) {
      console.error("fetchAllEodReports:", err);
      toast.error("Failed to load EOD list");
    } finally {
      setIsLoading(false);
    }
  };

  const loadReportData = (report) => {
    const dateOnly = report.date?.split("T")[0] || report.date;
    const isToday = dateOnly === todayString();
    setForm({
      date: dateOnly,
      reportingTime:
        report.reportingTime ||
        (attendanceToday?.login
          ? attendanceToday.login
          : attendanceToday?.checkIn ? moment(attendanceToday.checkIn).tz("Asia/Kolkata").format("HH:mm") : ""),
      name: report.name || "",
      eodTime: report.eodTime || (isToday ? moment(nowClock).format("HH:mm") : ""),
      project: report.project || "",
      summary: report.summary || "",
      nextDayPlan: report.nextDayPlan || "",
    });
    setRows(report.rows || defaultRows);
    setSelectedDate(dateOnly);
    setIsViewOnly(!isToday); // if not today -> view-only
  };

  const resetFormForToday = () => {
    setForm({
      date: todayString(),
      reportingTime:
        attendanceToday?.login ||
        (attendanceToday?.checkIn
          ? moment(attendanceToday.checkIn).tz("Asia/Kolkata").format("HH:mm")
          : ""),
      name: "",
      eodTime: moment(nowClock).format("HH:mm"),
      project: "",
      summary: "",
      nextDayPlan: "",
    });
    setRows(defaultRows);
    setSelectedDate(todayString());
    setIsViewOnly(false);
  };

  // When dropdown changes
  const handleDateSelect = (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    // find report with same date
    const selected = allReports.find((r) => (r.date?.split("T")[0] || r.date) === date);
    if (selected && selected._id !== "today") {
      // load existing report (view only if not today)
      loadReportData(selected);
    } else if (selected && selected._id === "today") {
      // today placeholder (no saved report) -> new form
      resetFormForToday();
    } else {
      // fallback
      resetFormForToday();
    }
  };

  // Keep eodTime live while viewing/creating today's report and read-only
  useEffect(() => {
    // update eodTime field only when selectedDate is today and not view-only (so user can't override)
    if (selectedDate === todayString()) {
      setForm((prev) => ({ ...prev, eodTime: moment(nowClock).format("HH:mm") }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nowClock, selectedDate]);

  const handleRowChange = (index, field, value) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value };
    setRows(updated);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    // prevent editing reportingTime/eodTime (read-only) in UI if view-only or read-only fields
    if ((name === "reportingTime" || name === "eodTime")) return;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!hasCheckedInToday) {
      toast.error("Please check-in before submitting EOD.");
      return;
    }
    // ensure date is today (safety)
    if (form.date !== todayString()) {
      toast.error("Can only submit EOD for today.");
      return;
    }

    try {
      setIsLoading(true);
      // ensure reportingTime comes from attendance if available
      const reportingTimeToSend =
        form.reportingTime ||
        (attendanceToday?.login ? attendanceToday.login : moment(attendanceToday.checkIn).tz("Asia/Kolkata").format("HH:mm"));

      const eodTimeToSend = moment(nowClock).format("HH:mm");

      const payload = {
        ...form,
        reportingTime: reportingTimeToSend,
        eodTime: eodTimeToSend,
        rows,
      };

      const res = await API.post("/eod", payload);
      toast.success("EOD saved");

      // reload list and load saved report
      await fetchAllEodReports();
      const saved = res.data;
      if (saved) loadReportData(saved);
    } catch (err) {
      console.error("submit EOD:", err);
      toast.error(err.response?.data?.message || "Failed to save EOD");
    } finally {
      setIsLoading(false);
    }
  };
  const getStatusColor = (status) => {
    switch (status) {
      case "Done":
        return "bg-green-200 text-green-800 font-semibold";
      case "Pending":
        return "bg-yellow-200 text-yellow-800 font-semibold";
      case "Working":
        return "bg-blue-200 text-blue-800 font-semibold";
      default:
        return "bg-white text-black";
    }
  };

  // UI: disable form if no check-in today (but still allow viewing previous reports)
  const formDisabled = !hasCheckedInToday || isViewOnly;

  return (
    <div className="min-h-screen p-6 transition">
      <Toaster />
      <h1 className="text-3xl font-bold mb-6 text-center">📝 End of Day (EOD) Report</h1>

      <div className="mb-4 flex flex-col md:flex-row items-center gap-4">
        <label className="font-semibold text-sm">Select Date:</label>
        <select
          value={selectedDate}
          onChange={handleDateSelect}
          className="border p-2  rounded-md dark:border-gray-600  "
        >
          {allReports.length === 0 && <option value="">No EOD found</option>}
          {allReports.map((report) => (
            <option key={report._id || report.date} value={(report.date?.split("T")[0] || report.date)} className="text-black">
              {report._id === "today"
                ? `Today (${new Date(report.date).toLocaleDateString("en-IN")})`
                : new Date(report.date).toLocaleDateString("en-IN")}
            </option>
          ))}
        </select>

        {/* status indicator */}
        <div className="ml-auto text-sm">
          {!hasCheckedInToday ? (
            <span className="text-red-600 font-medium">Please check-in to enable today's EOD</span>
          ) : isViewOnly ? (
            <span className="text-gray-600">Viewing previous EOD (read-only)</span>
          ) : (
            <span className="text-green-600">You can submit today's EOD</span>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="shadow-lg rounded-lg p-6 border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <label className="font-semibold text-sm">Date</label>
            <input
              type="text"
              name="date"
              value={form.date ? new Date(form.date).toLocaleDateString("en-IN") : ""}
              className="w-full mt-1 p-2 border rounded-md dark:border-gray-600  "
              readOnly
            />
          </div>
          <div>
            <label className="font-semibold text-sm">Reporting Time</label>
            <input
              type="time"
              name="reportingTime"
              value={form.reportingTime}
              className="w-full mt-1 p-2 border rounded-md dark:border-gray-600"
              readOnly
            />
          </div>
          <div>
            <label className="font-semibold text-sm">EOD Time</label>
            <input
              type="time"
              name="eodTime"
              value={form.eodTime}
              className="w-full mt-1 p-2 border rounded-md dark:border-gray-600 "
              readOnly
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
              maxLength={50}
              className="w-full mt-1 p-2 border rounded-md dark:border-gray-600"
              disabled={formDisabled}
            />
          </div>
        </div>

        {/* Rows table */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full border dark:border-gray-600">
            <thead>
              <tr>
                <th className="border p-2 text-sm">Time</th>
                <th className="border p-2 text-sm">Task / Project</th>
                <th className="border p-2 text-sm">Description</th>
                <th className="border p-2 text-sm">Status</th>
                <th className="border p-2 text-sm">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  <td
                    className={`border p-2 text-sm font-semibold ${row.task.includes("Break") ? "text-gray-500" : ""
                      }`}
                  >
                    {row.time}
                  </td>

                  <td className="border p-2">
                    <input
                      type="text"
                      value={row.task}
                      maxLength={50}
                      onChange={(e) => handleRowChange(i, "task", e.target.value)}
                      readOnly={formDisabled || row.task.includes("Break")}
                      className={`w-full p-1 border rounded-sm text-sm ${row.task.includes("Break") ? "bg-gray-300 text-black" : ""
                        }`}
                    />
                  </td>
                  
                  <td className="border p-2">
                    <textarea
                      value={row.description}
                      rows={2}
                      maxLength={200}
                      onChange={(e) => handleRowChange(i, "description", e.target.value)}
                      readOnly={formDisabled || row.task.includes("Break")}
                      className={`w-full p-1 border rounded-sm text-sm resize-y ${row.task.includes("Break") ? "bg-gray-300 text-black" : ""
                        }`}
                    />
                  </td>

                  <td className="border p-2">
                    <select
                      value={row.status}
                      onChange={(e) => handleRowChange(i, "status", e.target.value)}
                      disabled={formDisabled}
                      className={`w-full p-1 border rounded-sm text-sm ${getStatusColor(
                        row.status
                      )}`}
                    >
                      <option value="" className="text-black">
                        Select
                      </option>
                      <option value="Done" className="text-black">
                        Done
                      </option>
                      <option value="Pending" className="text-black">
                        Pending
                      </option>
                      <option value="Working" className="text-black">
                        Working
                      </option>
                    </select>
                  </td>

                  <td className="border p-2">
                    <input
                      type="text"
                      value={row.remarks}
                      maxLength={200}
                      onChange={(e) => handleRowChange(i, "remarks", e.target.value)}
                      readOnly={formDisabled || row.task.includes("Break")}
                      className={`w-full p-1 border rounded-sm text-sm ${row.task.includes("Break") ? "bg-gray-300 text-black" : ""
                        }`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        </div>

        <div className="mb-6">
          <label className="font-semibold text-sm block mb-2">Summary / Notes</label>
          <textarea
            name="summary"
            value={form.summary}
            onChange={handleFormChange}
            rows={3}
            maxLength={500}
            placeholder="Write your daily summary or notes here..."
            className="w-full p-3 border rounded-md dark:border-gray-600"
            disabled={formDisabled}
          />
        </div>
        {/* NEXT DAY PLAN SECTION */}
        <div className="mb-6">
          <label className="font-semibold text-sm block mb-2">
            Next Day Plan
          </label>
          <textarea
            name="nextDayPlan"
            value={form.nextDayPlan}
            onChange={handleFormChange}
            maxLength={500}
            rows={3}
            placeholder="Tomorrow's planned tasks..."
            className="w-full p-3 border rounded-md dark:border-gray-600"
            disabled={formDisabled}
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={formDisabled || isLoading}
            className={`flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg ${formDisabled ? "opacity-60 cursor-not-allowed" : "hover:bg-blue-700"}`}
          >
            <Save size={18} />
            Save Report
          </button>
        </div>
      </form>
    </div>
  );
}
