
// pages/EmpEodReports.jsx  (or wherever your component lives)
import React, { useState, useEffect, useRef } from "react";
import { toast, Toaster } from "react-hot-toast";
import { Save, Download } from "lucide-react";
import API from "../../utils/api";
import moment from "moment-timezone";
import * as XLSX from "xlsx-js-style";
export default function EmpEodReports() {
  const [form, setForm] = useState({
    _id: null, // Add _id to track the current report
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
  const [columns, setColumns] = useState(["time", "task", "description", "status", "remarks"]);

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
  // FIX: Use moment-timezone to get today's date in the correct timezone to prevent day-rollover issues.
  const todayString = () => moment().tz("Asia/Kolkata").format("YYYY-MM-DD");

  useEffect(() => {
    const initialize = async () => {
      // 1. Fetch the global template first to get the correct columns
      await fetchTemplate();

      // 2. Fetch attendance to know if user can submit an EOD
      const attendance = await fetchMyAttendance();

      // 3. Then, fetch all reports, passing attendance to it.
      await fetchAllEodReports(attendance, true); // Allow form reset on initial load

      // 4. Start the live clock
      clockRef.current = setInterval(() => setNowClock(new Date()), 1000);
    };
    initialize();
    return () => clearInterval(clockRef.current); // Cleanup clock on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch attendance for current user (to check check-in & login time)
  const fetchMyAttendance = async () => {
    try {
      const res = await API.get("/attendance/me");
      // FIX: The API now returns an object { records: [], settings: {} }.
      // We need to access the 'records' property.
      const arr = res.data.records || [];
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
        return todayRec;
      } else {
        setAttendanceToday(null);
        setHasCheckedInToday(false);
      }
    } catch (err) {
      console.error("fetchMyAttendance:", err);
      toast.error("Could not load attendance");
      setHasCheckedInToday(false);
      return null;
    }
  };

  const fetchTemplate = async () => {
    try {
      const res = await API.get("/eod/eod-template");
      if (res.data && Array.isArray(res.data.columns)) {
        setColumns(res.data.columns);
      }
    } catch (err) {
      console.error("Failed to fetch EOD template", err);
      // Fallback to default columns on error
      setColumns(["time", "task", "description", "status", "remarks"]);
    }
  };
  const fetchAllEodReports = async (attendance, shouldResetForm = false) => {
  setIsLoading(true);
  try {
    const res = await API.get("/eod/my");
    let reports = Array.isArray(res.data) ? res.data : [];

    const byDate = [];
    const seen = new Set();

    for (const r of reports) {
      const d = moment(r.date).tz("Asia/Kolkata").format("YYYY-MM-DD");
      if (!seen.has(d)) {
        seen.add(d);
        byDate.push({ ...r, _dateIST: d });   // ⭐ Save IST date for reliable matching
      }
    }

    byDate.sort((a, b) => new Date(b._dateIST) - new Date(a._dateIST));

    const today = todayString();
    const hasToday = byDate.some(r => r._dateIST === today);

    const list = [...byDate];
    if (!hasToday) list.unshift({ _id: "today", _dateIST: today });

    setAllReports(list);

    const todaysReport = byDate.find(r => r._dateIST === today);

    if (todaysReport && selectedDate !== today) {
      loadReportData(todaysReport);
    } else if (!todaysReport && shouldResetForm) {
      resetFormForToday(attendance);
    }
  } catch (err) {
    toast.error("Failed to load EOD list");
  } finally {
    setIsLoading(false);
  }
};

const loadReportData = (report) => {
  const dateOnly = report._dateIST;
  const isToday = dateOnly === todayString();

  setForm({
    _id: report._id || null,
    date: dateOnly,
    reportingTime:
      report.reportingTime ||
      attendanceToday?.login ||
      (attendanceToday?.checkIn
        ? moment(attendanceToday.checkIn).tz("Asia/Kolkata").format("HH:mm")
        : ""),

    name: report.name || "",
    eodTime: isToday ? moment(nowClock).format("HH:mm") : report.eodTime || "",
    project: report.project || "",
    summary: report.summary || "",
    nextDayPlan: report.nextDayPlan || "",
  });

  // ⭐ FINAL FIX: Iterate over the defaultRows (the base structure) instead of columns.
  // This ensures all rows from the template are always present.
  const mergedRows = defaultRows.map((templateRow, index) => {
    return {
      ...templateRow,                         // Start with the base template row.
      ...(report.rows?.[index] || {}),        // Merge saved employee data for that row, if it exists.
    };
  });

  setRows(mergedRows);

  setSelectedDate(dateOnly);
  setIsViewOnly(!isToday);
};



  const resetFormForToday = (attendance) => {
    setForm({
      _id: null, // Reset _id for a new report
      date: todayString(),
      reportingTime:
        attendance?.login ||
        (attendance?.checkIn
          ? moment(attendance.checkIn).tz("Asia/Kolkata").format("HH:mm")
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

  const found = allReports.find(r => r._dateIST === date);

  if (found && found._id !== "today") loadReportData(found);
  else resetFormForToday(attendanceToday);
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

  // 1️⃣ Check-in validation
  if (!hasCheckedInToday) {
    toast.error("Please check-in before submitting EOD.");
    return;
  }

  // 2️⃣ Only today's EOD allowed
  if (form.date !== todayString()) {
    toast.error("You can only submit today's EOD.");
    return;
  }

  try {
    setIsLoading(true);

    // 3️⃣ Safe reporting time
    const reportingTimeToSend =
      form.reportingTime ||
      (attendanceToday
        ? attendanceToday.login ||
          (attendanceToday.checkIn
            ? moment(attendanceToday.checkIn).tz("Asia/Kolkata").format("HH:mm")
            : "")
        : ""); // Fallback to empty string if attendanceToday is null

    // 4️⃣ Final payload
    const payload = {
      _id: form._id, // ⭐ MAIN FIX: Include _id for updates
      date: form.date,
      reportingTime: reportingTimeToSend,
      eodTime: moment(nowClock).format("HH:mm"),
      project: form.project,
      summary: form.summary,
      nextDayPlan: form.nextDayPlan,
      rows: [...rows],
      columns: [...columns],
    };

    // 5️⃣ ⭐ MAIN FIX: Always use POST. The backend should handle
    // create vs. update based on the presence of `_id` in the payload.
    const res = await API.post("/eod", payload); // ⭐ Response capture

    // ⭐ IMPORTANT: If your backend sends a specific success/failure flag in the response data
    // (e.g., { success: false, message: "Error" }) even with a 200 status, you can check it here.
    if (res.data && res.data.success === false) {
        throw new Error(res.data.message || "Backend reported an error during save.");
    }

    toast.success("EOD saved successfully");

    // 6️⃣ ⭐ MAIN FIX: Reload all data from the server.
    // This is the most reliable way to ensure the UI shows the correct, saved state.
    // It avoids all complex client-side state management issues.
    await fetchAllEodReports(attendanceToday, false);

  } catch (err) {
    console.error("submit EOD:", err);
    toast.error(err.response?.data?.message || "Failed to save EOD");
  } finally {
    setIsLoading(false);
  }
};

  const handleDownload = () => {
    if (!form.date) {
      toast.error("No report data to download.");
      return;
    }

    // 1. Create a new workbook
    const wb = XLSX.utils.book_new();

    // 2. Prepare data for the worksheet
    const headerData = [
      ["Date", moment(form.date).tz("Asia/Kolkata").format("DD/MM/YYYY")],
      ["Reporting Time", form.reportingTime],
      ["EOD Time", form.eodTime],
      ["Project", form.project],
    ];

    const tableHeader = columns.map(col => col.charAt(0).toUpperCase() + col.slice(1));
    const tableRows = rows.map(row => columns.map(col => row[col] || ""));

    const summaryData = [
      [], // Spacer
      ["Summary / Notes"],
      [form.summary],
      [], // Spacer
      ["Next Day Plan"],
      [form.nextDayPlan],
    ];

    const finalData = [
      ...headerData,
      [], // Spacer
      tableHeader,
      ...tableRows,
      ...summaryData,
    ];

    // 3. Create worksheet from the data
    const ws = XLSX.utils.aoa_to_sheet(finalData);

    // --- START: Add Styling (Borders and Header Style) ---
    const range = XLSX.utils.decode_range(ws["!ref"]);

    const thinBorderStyle = {
      top: { style: "thin", color: { auto: 1 } },
      bottom: { style: "thin", color: { auto: 1 } },
      left: { style: "thin", color: { auto: 1 } },
      right: { style: "thin", color: { auto: 1 } },
    };

    const headerStyle = {
      font: { bold: true },
      fill: { fgColor: { rgb: "D3D3D3" } }, // Light Gray background
      border: thinBorderStyle,
    };

    const tableHeaderRowIndex = headerData.length + 1; // +1 for the spacer row

    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell_address = { c: C, r: R };
        const cell_ref = XLSX.utils.encode_cell(cell_address);
        let cell = ws[cell_ref];
        if (!cell) {
          // Create a blank cell to ensure borders are applied everywhere
          cell = { v: "" };
          ws[cell_ref] = cell;
        }
        if (!cell.s) {
          cell.s = {};
        }

        // Apply header style to the table header row
        if (R === tableHeaderRowIndex) {
          cell.s = headerStyle;
        } else {
          // Apply only border style to all other cells
          cell.s.border = thinBorderStyle;
        }

        // --- START: Apply Wrap Text to all cells for auto-height ---
        if (!cell.s.alignment) {
          cell.s.alignment = {};
        }
        cell.s.alignment.wrapText = true;
        cell.s.alignment.vertical = "top"; // Align text to the top
        // --- END: Apply Wrap Text ---
      }
    }

    // --- Set fixed column widths instead of auto-fitting ---
    const colWidths = columns.map(col => {
      if (col.toLowerCase() === 'description') {
        return { wch: 40 }; // 'description' column is wider
      }
      if (col.toLowerCase() === 'time') {
        return { wch: 15 }; // 'time' column is narrower
      }
      return { wch: 25 }; // Default width for other columns
    });
    ws['!cols'] = colWidths;
    // --- END: Add Styling ---

    // --- START: Merge Cells for Summary and Next Day Plan ---
    // Calculate the correct row index for the summary and plan content
    const summaryContentRowIndex = headerData.length + 1 + 1 + tableRows.length + 1 + 1; // headers + spacer + tableHeader + rows + spacer + title
    const nextDayPlanContentRowIndex = summaryContentRowIndex + 2 + 1; // summaryContent + spacer + title

    // Initialize merges array if it doesn't exist
    if (!ws['!merges']) ws['!merges'] = [];

    // Add merge ranges. We merge from the first column (0) to the last column of the table.
    ws['!merges'].push(
      { s: { r: summaryContentRowIndex, c: 0 }, e: { r: summaryContentRowIndex, c: columns.length - 1 } },
      { s: { r: nextDayPlanContentRowIndex, c: 0 }, e: { r: nextDayPlanContentRowIndex, c: columns.length - 1 } }
    );

    // --- START: Apply Wrap Text and Auto-Height for Merged Cells ---
    // Get the cell reference for the top-left cell of the merge area
    const summaryCellRef = XLSX.utils.encode_cell({ r: summaryContentRowIndex, c: 0 });
    const nextDayPlanCellRef = XLSX.utils.encode_cell({ r: nextDayPlanContentRowIndex, c: 0 });

    // The wrap text style is already applied to all cells in the loop above,
    // so we don't need to apply a separate style here anymore.

    // Note: We don't need to set a fixed row height (`!rows`).
    // The `wrapText: true` style tells Excel to auto-adjust the row height upon opening the file.
    // --- END: Merge Cells ---


    // 4. Add worksheet to the workbook
    XLSX.utils.book_append_sheet(wb, ws, "EOD Report");

    // 5. Trigger the download
    const fileName = `EOD_Report_${form.date}.xlsx`;
    XLSX.writeFile(wb, fileName);
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
            <option key={report._id || report.date} value={moment(report.date).tz("Asia/Kolkata").format("YYYY-MM-DD")} className="text-black">
              {report._id === "today"
                ? `Today (${moment(report.date).tz("Asia/Kolkata").format("DD/MM/YYYY")})`
                : moment(report.date).tz("Asia/Kolkata").format("DD/MM/YYYY")}
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
              value={form.date ? moment(form.date).tz("Asia/Kolkata").format("DD/MM/YYYY") : ""}
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
            {/* <thead>
              <tr>
                <th className="border p-2 text-sm">Time</th>
                <th className="border p-2 text-sm">Task / Project</th>
                <th className="border p-2 text-sm">Description</th>
                <th className="border p-2 text-sm">Status</th>
                <th className="border p-2 text-sm">Remarks</th>
              </tr>
            </thead> */}
            <thead>
              <tr>
                {columns.map(col => (
                  <th key={col} className="border p-2 text-sm">
                    {col.charAt(0).toUpperCase() + col.slice(1)}
                  </th>
                ))}
              </tr>
            </thead>
            {/* <tbody>
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
            </tbody> */}
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  {columns.map((col) => (
                    // ⭐ MAIN FIX: Render 'time' column as read-only text, not an input.
                    // This prevents its value from being lost or misinterpreted by the backend.
                    col === "time" ? (
                      <td key={col} className="border p-2 text-sm font-semibold">
                        {row.time}
                      </td>
                    ) : (
                    <td key={col} className="border p-2 text-sm">
                      {col === "status" ? (
                        <select
                          value={row[col] || ""}
                          disabled={formDisabled}
                          onChange={(e) => handleRowChange(i, col, e.target.value)}
                          className={`w-full p-1 border rounded-sm text-sm ${getStatusColor(row[col])}`}
                        >
                          <option value="">Select</option>
                          <option value="Done">Done</option>
                          <option value="Pending">Pending</option>
                          <option value="Working">Working</option>
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={row[col] || ""}
                          readOnly={formDisabled || row.task?.includes("Break")}
                          onChange={(e) => handleRowChange(i, col, e.target.value)}
                          className={`w-full p-1 border rounded-sm text-sm ${row.task?.includes("Break") ? "bg-gray-300 text-black" : ""
                            }`}
                        />
                      )}
                    </td>
                    )
                  ))}
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

        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"
          >
            <Download size={18} />
            Download EOD
          </button>
          <button
            type="submit"
            disabled={formDisabled || isLoading}
            className={`flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg ${formDisabled ? "opacity-60 cursor-not-allowed" : "hover:bg-blue-700"}`}
          >
            <Save size={18} />
            {form._id ? "Update Report" : "Save Report"}
          </button>
        </div>
      </form>
    </div>
  );
}
