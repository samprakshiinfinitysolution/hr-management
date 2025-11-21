
import { useEffect, useState } from "react";
import API from "../../utils/api";

export default function AdminEmpReports() {
  const [records, setRecords] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    reportType: "attendance",
    dateType: "month",
    personType: "all",
    month: "",
    startDate: "",
    endDate: "",
    search: "",
  });

  useEffect(() => {
    fetchData();
  }, [filters.reportType, filters.month, filters.startDate, filters.endDate]);

  async function fetchData() {
    try {
      let endpoint = "";
      const params = new URLSearchParams();

      // Month / Range handling
      if (filters.dateType === "month" && filters.month) {
        const [year, month] = filters.month.split("-");
        const startDate = new Date(year, month - 1, 1).toISOString();
        const endDate = new Date(year, month, 0, 23, 59, 59).toISOString();
        params.append("startDate", startDate);
        params.append("endDate", endDate);
      } else if (filters.dateType === "range" && filters.startDate && filters.endDate) {
        const startDate = new Date(filters.startDate).toISOString();
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59);
        params.append("startDate", startDate);
        params.append("endDate", endDate.toISOString());
      }

      switch (filters.reportType) {
        case "attendance":
          endpoint = "/attendance";
          break;
        case "hr":
          endpoint = "/attendance/admin/all";
          break;
        case "employee":
          endpoint = "/admin/employees";
          break;
        case "salary":
          endpoint = "/salary";
          break;
        default:
          throw new Error("Invalid report type");
      }

      const res = await API.get(endpoint, { params });

      // ⭐ NEW — GET SETTINGS + RECORDS from backend
      const settings = res.data.settings || {};
      const adminBreakAllowed = settings.breakDurationMinutes || 40;

      let dataToProcess = [];
      if (filters.reportType === "employee" && res.data.employees) {
        dataToProcess = res.data.employees;
      } else if (filters.reportType === "attendance" && Array.isArray(res.data.records)) {
        dataToProcess = res.data.records;
      } else if (filters.reportType === "hr") {
        // admin attendance endpoint may return array or { records }
        dataToProcess = Array.isArray(res.data) ? res.data : (res.data?.records || []);
      } else if (Array.isArray(res.data)) {
        dataToProcess = res.data;
      }

      // ⭐ Ensure HR / Manager attendance is included
      // Some attendance endpoints return only employee attendance. The app also exposes
      // `/attendance/admin/all` which returns HR/Manager (Admin model) attendance for a date.
      // When reporting on attendance we should include those records for personType 'hr' or 'all'.
      if (filters.reportType === "attendance") {
        try {
          const adminAttendanceRes = await API.get('/attendance/admin/all', { params });
          const adminArray = Array.isArray(adminAttendanceRes.data)
            ? adminAttendanceRes.data
            : (adminAttendanceRes.data?.records || []);

          if (filters.personType === 'hr') {
            // Show HR/Manager attendance. HR records might exist in both employee-attendance
            // and admin-attendance endpoints, so collect from both sources.
            const isHRRole = (rec) => {
              const role = (rec.user?.role || rec.role || rec.employeeId?.role || rec.position || "").toString().toLowerCase();
              return /\b(hr|human|resource|people)\b/.test(role) || /manager/.test(role);
            };

            const employeeHR = (Array.isArray(dataToProcess) ? dataToProcess : []).filter(isHRRole);
            const combined = [...employeeHR, ...adminArray];
            const byUser = new Map();
            combined.forEach(item => {
              const uid = item.user?._id || item.user || item._id || JSON.stringify(item);
              if (!byUser.has(uid)) byUser.set(uid, item);
            });
            dataToProcess = Array.from(byUser.values());
          } else if (filters.personType === 'all') {
            // Merge employees + admins — avoid simple duplicates by user id if possible
            const combined = [...dataToProcess, ...adminArray];
            const byUser = new Map();
            combined.forEach(item => {
              const uid = item.user?._id || item.user || item._id || JSON.stringify(item);
              if (!byUser.has(uid)) byUser.set(uid, item);
            });
            dataToProcess = Array.from(byUser.values());
          }
        } catch (e) {
          // Non-fatal: if admin attendance fetch fails, keep original employee-only data
          console.warn('Failed to fetch admin attendance for reports', e?.message || e);
        }
      }

      // If reportType is 'hr' we already fetched admin endpoint above; ensure we don't run the duplicate admin fetch

      // ⭐ Working hours calculation (excess break logic)
      const computeWorkingHours = (rec) => {
        if (!rec.checkIn || !rec.checkOut) return 0;

        const allowedBreak = adminBreakAllowed;

        const start = new Date(rec.checkIn).getTime();
        const end = new Date(rec.checkOut).getTime();
        const totalMinutes = Math.floor((end - start) / 1000 / 60);

        let breakTaken = 0;
        if (Array.isArray(rec.breaks)) {
          rec.breaks.forEach(b => {
            if (!b.start || !b.end) return;
            const bs = new Date(b.start).getTime();
            const be = new Date(b.end).getTime();
            if (be > bs) {
              breakTaken += Math.floor((be - bs) / 1000 / 60);
            }
          });
        }

        const excessBreak = Math.max(0, breakTaken - allowedBreak);
        const workingMinutes = Math.max(0, totalMinutes - excessBreak);

        return workingMinutes / 60;
      };

      const computeBreakMinutes = (rec) => {
        let total = 0;
        if (!Array.isArray(rec.breaks)) return total;
        rec.breaks.forEach((b) => {
          if (!b.start || !b.end) return;
          const s = new Date(b.start).getTime();
          const e = new Date(b.end).getTime();
          if (e > s) total += Math.floor((e - s) / 1000 / 60);
        });
        return total;
      };

      const computeFullDuration = (ci, co) => {
        if (!ci || !co) return "-";
        const s = new Date(ci).getTime();
        const e = new Date(co).getTime();
        const diff = e - s;
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
      };

      const formatBreak = (mins) => {
        if (!mins) return "0m";
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return h > 0 ? `${h}h ${m}m` : `${m}m`;
      };

      // Deduplicate records.
      // For HR-specific views we want one row per admin (dedupe by user id only).
      // For attendance ranges we preserve separate rows per date (dedupe by user+date).
      const dedupeByDate = !(filters.reportType === 'hr' || filters.personType === 'hr');

      const makeKey = (rec) => {
        if (!rec) return JSON.stringify(rec);
        const userObj = rec.user || rec.employeeId || {};
        const id = userObj._id || rec._id || userObj.id || rec.id;
        const date = rec.date ? new Date(rec.date).toISOString().slice(0,10) : '';
        if (id) return dedupeByDate ? `${String(id)}|date:${date}` : String(id);
        const email = (userObj.email || rec.email || '').toString().trim().toLowerCase();
        if (email) return dedupeByDate ? `email:${email}|date:${date}` : `email:${email}`;
        const name = (userObj.name || rec.name || '').toString().trim().toLowerCase();
        return dedupeByDate ? `name:${name}|date:${date}` : `name:${name}`;
      };

      const deduped = Array.from(new Map((dataToProcess || []).map(r => [makeKey(r), r])).values());

      // ⭐ FINAL formatted list
      const formatted = deduped.map(r => {
        const workingDecimal = computeWorkingHours(r);
        const breakMinutes = computeBreakMinutes(r);

        const formatHours = (dec) => {
          const h = Math.floor(dec);
          const m = Math.round((dec - h) * 60);
          return `${h}h ${m}m`;
        };

        // Attendance records sometimes embed the user in `user`, sometimes are direct employee objects.
        const userObj = r.user || r.employeeId || {};
        return {
          id: r._id || userObj._id || r.user?._id,
          name: userObj.name || r.name || "Unknown",
          email: userObj.email || r.email || "-",

          date: r.date,
          checkIn: r.checkIn,
          checkOut: r.checkOut,

          totalWorkTime: computeFullDuration(r.checkIn, r.checkOut),

          totalBreaks: Array.isArray(r.breaks) ? r.breaks.length : 0,
          breakMinutes,
          breakFormatted: formatBreak(breakMinutes),

          totalHours: workingDecimal,

          role: userObj.role || r.role || "-",
          month: r.month ? `${r.month}/${r.year}` : "",
          rawMonth: r.month,
          rawYear: r.year,
          status: r.status || (r.sentAt ? "Sent" : "Pending"),

          phone: userObj.phone || r.phone || "-",
          position: r.position || "-",
          salary: r.salary || "-",
          amount: r.netSalary || "0",
        };
      });

      setRecords(formatted);
      applyFilters(formatted);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || `Error fetching ${filters.reportType} data`);
      setFiltered([]);
    }
  }

  // helper: format date as dd/mm/yyyy
  const formatDateDDMMYYYY = (dateLike) => {
    if (!dateLike) return "-";
    const d = new Date(dateLike);
    if (isNaN(d)) return String(dateLike);
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  // helper: decimal hours → "Xh Ym"
  const formatHoursToHrsMins = (hoursVal) => {
    if (hoursVal === null || hoursVal === undefined || hoursVal === "") return "-";
    const num = Number(hoursVal);
    if (isNaN(num)) return String(hoursVal);
    const hrs = Math.floor(num);
    let mins = Math.round((num - hrs) * 60);
    if (mins === 60) {
      mins = 0;
      return `${hrs + 1}h 0m`;
    }
    return `${hrs}h ${mins}m`;
  };

  const applyFilters = (data) => {
    let filteredData = [...data];

    if (filters.search) {
      filteredData = filteredData.filter((r) =>
        (r.name || "").toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // Filter employees vs HR & Managers
    if (filters.reportType === "attendance" && filters.personType && filters.personType !== "all") {
      const type = filters.personType;
      filteredData = filteredData.filter((r) => {
        const role = (r.role || "").toLowerCase();
        const isHR = /hr|human|resource|people/.test(role);
        const isManager = /manager/.test(role);

        if (type === "hr") {
          // include HR-like roles and managers
          return isHR || isManager;
        }
        // For 'employee' type: exclude HR-like roles and managers
        return !(isHR || isManager);
      });
    }

    // Salary month filter
    if (filters.reportType === "salary" && filters.dateType === "month" && filters.month) {
      const [year, month] = filters.month.split("-");
      filteredData = filteredData.filter(
        (item) => item.rawYear == year && item.rawMonth == Number(month)
      );
    }

    setFiltered(filteredData);
    setError(filteredData.length === 0 ? "No records match the filters" : "");
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => {
      const newFilters = { ...prev, [name]: value };
      if (name === "dateType") {
        newFilters.month = "";
        newFilters.startDate = "";
        newFilters.endDate = "";
      }
      return newFilters;
    });
  };

  const handleFilter = async () => {
    if (filters.dateType === "month" && !filters.month) {
      setError("Please select a month");
      return;
    }
    if (filters.dateType === "range" && (!filters.startDate || !filters.endDate)) {
      setError("Please select both start and end dates");
      return;
    }
    fetchData();
  };

  const downloadCSV = () => {
    if (filtered.length === 0) {
      setError("No data to download");
      return;
    }

    let headers = [];
    let rows = [];

    switch (filters.reportType) {
      case "attendance":
      case "hr":
        headers = ["Name,Email,Date,CheckIn,CheckOut,TotalTime,TotalBreaks,Hours"];
        rows = filtered.map((r) => {
          const date = r.date ? formatDateDDMMYYYY(r.date) : "-";
          const checkIn = r.checkIn ? new Date(r.checkIn).toLocaleTimeString() : "-";
          const checkOut = r.checkOut ? new Date(r.checkOut).toLocaleTimeString() : "-";
          const breakStr = `${r.totalBreaks || 0} (${r.breakFormatted || '0m'})`;
          return `${r.name},${r.email},${date},${checkIn},${checkOut},${r.totalWorkTime || "-"},${breakStr},${formatHoursToHrsMins(r.totalHours)}`;
        });
        break;

      case "employee":
        headers = ["Name,Email,Phone,Position,Salary"];
        rows = filtered.map((r) =>
          `${r.name},${r.email},${r.phone},${r.position},${r.salary}`
        );
        break;

      case "salary":
        headers = ["Name,Email,Month,Amount,Status"];
        rows = filtered.map((r) => {
          return `${r.name},${r.email},${r.month || "-"},${r.amount},${r.status || "-"}`;
        });
        break;
    }

    const csv = headers.concat(rows).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filters.reportType}_report_${filters.month || "range"}.csv`;
    a.click();
  };
  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto">
      <h1 className="text-xl sm:text-2xl font-bold mb-4">📊 Reports</h1>
      <p className="text-sm sm:text-base mb-6">
        Filter and download reports for attendance, employees, or salaries.
      </p>

      {error && (
        <div className="border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 bg-red-500 text-white px-4 py-1 rounded hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter Controls */}
      <div className="flex flex-col md:flex-row flex-wrap gap-3 sm:gap-4 mb-6 p-4 rounded-lg shadow bg">
        <select
          name="reportType"
          value={filters.reportType}
          onChange={handleFilterChange}
          className="border p-2 rounded w-full md:w-1/5"
        >
          <option value="attendance" className="text-gray-950">Attendance</option>
          <option value="employee" className="text-gray-950">Employee</option>
          <option value="hr" className="text-gray-950">HR & Managers</option>
          <option value="salary" className="text-gray-950">Salary</option>
        </select>

        <select
          name="dateType"
          value={filters.dateType}
          onChange={handleFilterChange}
          className="border p-2 rounded w-full md:w-1/5"
        >
          <option value="month" className="text-gray-950">Month</option>
          <option value="range" className="text-gray-950">Custom Range</option>
        </select>

        {filters.reportType === "attendance" && (
          <select
            name="personType"
            value={filters.personType}
            onChange={handleFilterChange}
            className="border p-2 rounded w-full md:w-1/5"
          >
            <option value="all" className="text-black">All</option>
            <option value="employee"className="text-black">Employees</option>
            <option value="hr"className="text-black">HR & Managers</option>
          </select>
        )}

        {filters.dateType === "month" ? (
          <input
            type="month"
            name="month"
            value={filters.month}
            onChange={handleFilterChange}
            className="border p-2 rounded w-full md:w-1/5"
          />
        ) : (
          <>
            <input
              type="date"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
              className="border p-2 rounded w-full md:w-1/5"
            />
            <input
              type="date"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
              className="border p-2 rounded w-full md:w-1/5"
            />
          </>
        )}

        <input
          type="text"
          name="search"
          placeholder="Search by name"
          value={filters.search}
          onChange={handleFilterChange}
          className="border p-2 rounded w-full md:w-1/5"
        />

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <button
            onClick={handleFilter}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 w-full sm:w-auto"
          >
            Filter
          </button>

          <button
            onClick={downloadCSV}
            disabled={filtered.length === 0}
            className={`px-4 py-2 rounded transition-colors w-full sm:w-auto ${filtered.length === 0
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700 text-white"
              }`}
          >
            Download CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg shadow">
        <div className="max-h-[60vh] overflow-y-auto">
          <table className="w-full min-w-max border border-gray-300 text-sm sm:text-base">
            <thead className="bg-gray-300 text-black sticky top-0">
              <tr>
                <th className="p-2 text-left">Name</th>
                <th className="p-2 text-left">Email</th>

                {filters.reportType === "attendance" && (
                  <>
                    <th className="p-2 text-left">Date</th>
                    <th className="p-2 text-left">Check In</th>
                    <th className="p-2 text-left">Check Out</th>
                    <th className="p-2 text-left">Total Time</th>
                    <th className="p-2 text-left">Total Breaks</th>
                    <th className="p-2 text-left"> Total Working Hours</th>
                  </>
                )}

                {filters.reportType === "employee" && (
                  <>
                    <th className="p-2 text-left">Phone</th>
                    <th className="p-2 text-left">Position</th>
                    <th className="p-2 text-left">Salary</th>
                  </>
                )}

                {filters.reportType === "salary" && (
                  <>
                    <th className="p-2 text-left">Month</th>
                    <th className="p-2 text-left">Net Salary</th>
                    <th className="p-2 text-left">Status</th>
                  </>
                )}
              </tr>
            </thead>

            <tbody>
              {filtered.length > 0 ? (
                filtered.map((r, i) => (
                  <tr key={i} className="border-b hover:bg-gray-100 hover:text-gray-950">
                    <td className="p-2">{r.name}</td>
                    <td className="p-2">{r.email}</td>

                    {filters.reportType === "attendance" && (
                      <>
                        <td className="p-2">{r.date ? formatDateDDMMYYYY(r.date) : "-"}</td>
                        <td className="p-2">{r.checkIn ? new Date(r.checkIn).toLocaleTimeString() : "-"}</td>
                        <td className="p-2">{r.checkOut ? new Date(r.checkOut).toLocaleTimeString() : "-"}</td>

                        {/* Total Time */}
                        <td className="p-2">{r.totalWorkTime || "-"}</td>

                        {/* Total Break Count + duration */}
                        <td className="p-2">{(r.totalBreaks || 0) + ' (' + (r.breakFormatted || '0m') + ')'}</td>

                        {/* Hours (Working Hours after excess break deduction) */}
                        {/* <td className="p-2">{formatHoursToHrsMins(r.totalHours)}</td> */}
                        <td className="p-2">
                          {formatHoursToHrsMins(r.totalHours)}
                        </td>
                      </>
                    )}

                    {filters.reportType === "employee" && (
                      <>
                        <td className="p-2">{r.phone}</td>
                        <td className="p-2">{r.position}</td>
                        <td className="p-2">{r.salary}</td>
                      </>
                    )}

                    {filters.reportType === "salary" && (
                      <>
                        <td className="p-2">{r.month}</td>
                        <td className="p-2">{r.amount}</td>
                        <td className="p-2">{r.status}</td>
                      </>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center p-4">
                    No records match the filters
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
