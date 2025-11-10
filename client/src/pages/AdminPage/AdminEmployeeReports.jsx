import { useEffect, useState } from "react";
import API from "../../utils/api";

export default function AdminEmpReports() {
  const [records, setRecords] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    reportType: "attendance",
    dateType: "month",
    month: "",
    startDate: "",
    endDate: "",
    search: "",
    sort: "a-z",
  });

  useEffect(() => {
    setFilters((prev) => ({ ...prev, month: "", startDate: "", endDate: "", search: "" }));
    fetchData();
  }, [filters.reportType]);

  async function fetchData() {
    try {
      let endpoint = "";
      const params = new URLSearchParams();

      // Handle dateType: month -> convert to startDate and endDate
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

      let dataToProcess = [];
      if (filters.reportType === "employee" && res.data.employees) {
        dataToProcess = res.data.employees;
      } else if (Array.isArray(res.data)) {
        dataToProcess = res.data;
      }

      // Map data to unified structure
      const formatted = dataToProcess.map((r) => {
        // helper to safely read populated or raw id fields
        const getName = (rec) => {
          if (!rec) return "Unknown";
          if (rec.user && typeof rec.user === "object") return rec.user.name || "Unknown";
          if (rec.employeeId && typeof rec.employeeId === "object") return rec.employeeId.name || "Unknown";
          return rec.name || (rec.user && typeof rec.user === "string" ? "Unknown" : "Unknown");
        };
        const getEmail = (rec) => {
          if (!rec) return "-";
          if (rec.user && typeof rec.user === "object") return rec.user.email || "-";
          if (rec.employeeId && typeof rec.employeeId === "object") return rec.employeeId.email || "-";
          return rec.email || "-";
        };

        return {
          id: r._id,
          name: getName(r),
          email: getEmail(r),
          Department: r.user?.department || r.employee?.department || r.department || "-",
          role: r.user?.position || r.employee?.position || r.role || "-",
          date: r.date,
          checkIn: r.checkIn,
          checkOut: r.checkOut,
          totalHours: r.totalHours || 0,
          status: r.status || (r.sentAt ? "Sent" : "Pending"),
          phone: r.phone || "-",
          position: r.position || "-",
          salary: r.salary || "-",
          month: r.month ? `${r.month}/${r.year}` : "",
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

  const applyFilters = (data) => {
    let filteredData = [...data];

    if (filters.search) {
      filteredData = filteredData.filter((r) =>
        (r.name || "").toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    filteredData.sort((a, b) => {
      const nameA = (a.name || "").toLowerCase();
      const nameB = (b.name || "").toLowerCase();
      return filters.sort === "a-z" ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
    });

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
        headers = ["Name,Email,Date,CheckIn,CheckOut,TotalHours"];
        rows = filtered.map((r) => {
          const date = r.date ? new Date(r.date).toLocaleDateString() : "-";
          const checkIn = r.checkIn ? new Date(r.checkIn).toLocaleTimeString() : "-";
          const checkOut = r.checkOut ? new Date(r.checkOut).toLocaleTimeString() : "-";
          return `${r.name},${r.email},${date},${checkIn},${checkOut},${r.totalHours}`;
        });
        break;
      case "employee":
        headers = ["Name,Email,Phone,Position,Salary"];
        rows = filtered.map((r) => `${r.name},${r.email},${r.phone},${r.position},${r.salary}`);
        break;
      case "salary":
        headers = ["Name,Email,Month,Amount,Status"];
        rows = filtered.map((r) => {
          return `${r.name},${r.email},${r.month || "-"},${r.amount},${r.status || "-"}`;
        });
        break;
      default:
        return;
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
      className="border  p-2 rounded w-full md:w-1/5"
    >
      <option value="attendance"className="text-gray-950">Attendance</option>
      <option value="employee"className="text-gray-950">Employee</option>
      <option value="salary"className="text-gray-950">Salary</option>
    </select>

    <select
      name="dateType"
      value={filters.dateType}
      onChange={handleFilterChange}
      className="border p-2 rounded w-full md:w-1/5"
    >
      <option value="month"className="text-gray-950">Month</option>
      <option value="range"className="text-gray-950">Custom Range</option>
    </select>

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

    <select
      name="sort"
      value={filters.sort}
      onChange={handleFilterChange}
      className="border  p-2 rounded w-full md:w-1/5"
    >
      <option value="a-z"className="text-gray-950">A-Z</option>
      <option value="z-a"className="text-gray-950">Z-A</option>
    </select>

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
        className={`px-4 py-2 rounded transition-colors w-full sm:w-auto ${
          filtered.length === 0
            ? "bg-gray-300 text-gray-500 cursor-not-allowed"
            : "bg-green-600 hover:bg-green-700 text-white"
        }`}
      >
        Download CSV
      </button>
    </div>
  </div>

  {/* Responsive Table */}
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
              <th className="p-2 text-left">Hours</th>
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
                  <td className="p-2">{r.date ? new Date(r.date).toLocaleDateString() : "-"}</td>
                  <td className="p-2">{r.checkIn ? new Date(r.checkIn).toLocaleTimeString() : "-"}</td>
                  <td className="p-2">{r.checkOut ? new Date(r.checkOut).toLocaleTimeString() : "-"}</td>
                  <td className="p-2">{r.totalHours || "0"}</td>
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
            <td
              colSpan={filters.reportType === "attendance" ? 6 : 5}
              className="text-center p-4"
            >
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
