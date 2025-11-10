import React, { useState, useEffect } from "react";
import { Calendar, Check, X, PlusCircle } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useSelector } from "react-redux";
import API from "../../utils/api";

export default function LeaveCalendar() {
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Set time to midnight for accurate date comparison
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState("");
  const [form, setForm] = useState({ date: "", reason: "" });
  const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
  const [leaves, setLeaves] = useState([]);
  const [employee, setEmployee] = useState(null); // To store employee data
  const { isDarkMode } = useSelector((state) => state.settings);
  const [summary, setSummary] = useState({
    totalLeaves: 0,
    approved: 0,
    rejected: 0,
    pending: 0,
  });

  // Helper to get date as YYYY-MM-DD string to avoid timezone issues
  const getLocalDateString = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  const monthName = new Date(year, month).toLocaleString("default", {
    month: "long",
  });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  // Fetch leaves when component mounts
  useEffect(() => {
    fetchLeaves();
    fetchEmployee(); // Fetch current employee's data
  }, []);

  const fetchLeaves = async () => {
    try {
      const res = await API.get("/leave/me");
      setLeaves(res.data || []);
    } catch (err) {
      toast.error("Error fetching leaves");
    }
  };

  const fetchEmployee = async () => {
    try {
      const res = await API.get("/profile");
      setEmployee(res.data);
    } catch (err) {
      console.error("Failed to fetch employee profile for notifications");
    }
  };

  const fetchLeaveSummary = async () => {
    try {
      const res = await API.get("/leave/summary");
      setSummary(res.data);
      setIsSummaryModalOpen(true);
    } catch (err) {
      toast.error("Error fetching leave summary");
    }
  };

  const handleDayClick = (day) => {
    const date = new Date(year, month, day);
    const dateString = getLocalDateString(date);

    const isSunday = date.getDay() === 0;

    if (date < today) {
      toast.error("Cannot apply leave for past days!");
      return;
    }
    if (isSunday) {
      toast.error("Sunday is a week off!");
      return;
    }

    const existingLeave = leaves.find((l) => l.date === dateString);
    if (existingLeave) {
      toast(`Leave status: ${existingLeave.status}`, {
        icon:
          existingLeave.status === "Approved"
            ? "✅"
            : existingLeave.status === "Rejected"
            ? "❌"
            : "🕓",
      });
      return;
    }

    setForm({ date: dateString, reason: "" });
    setSelectedDate(dateString);
    setIsApplyModalOpen(true);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post("/leave/", form);

      toast.success("Leave applied successfully");
      setIsApplyModalOpen(false);
      fetchLeaves();
      setForm({ date: "", reason: "" });
    } catch (err) {
      toast.error("Error applying leave");
    }
  };

  const getBadgeClasses = (status) => {
    switch (status) {
      case "Approved":
        return "bg-green-500 text-white";
      case "Rejected":
        return "bg-red-500 text-white";
      case "Pending":
        return "bg-yellow-500 text-white";
      default:
        return "bg-gray-300 text-gray-700";
    }
  };

  const renderCalendarDays = () => {
    const days = [];
    const totalCells = daysInMonth + firstDayOfMonth;

    for (let i = 0; i < totalCells; i++) {
      if (i < firstDayOfMonth) {
        days.push(<div key={`empty-${i}`} className="h-20"></div>);
      } else {
        const day = i - firstDayOfMonth + 1;
        const date = new Date(year, month, day);
        // Use local date string for comparison to avoid timezone issues
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, "0");
        const d = String(date.getDate()).padStart(2, "0");
        const dateString = `${y}-${m}-${d}`;
        const isSunday = date.getDay() === 0;
        const leave = leaves.find((l) => l.date === dateString);

        days.push(
          <div
            key={day}
            onClick={() => handleDayClick(day)}
            className={`border dark:border-gray-700 rounded-xl aspect-square flex flex-col items-center justify-center cursor-pointer hover:shadow-lg dark:hover:bg-gray-800 transition p-1 ${
              isSunday ? "bg-red-50 dark:bg-red-900/20" : leave ? "" : "bg-blue-50 dark:bg-blue-900/20"
            }`}
          >
            <span className="font-semibold text-sm sm:text-base">{day}</span>
            {isSunday ? (
              <span className="mt-1 text-xs text-red-500 dark:text-red-400 font-semibold">
                <span className="hidden sm:inline">WEEK </span>OFF
              </span>
            ) : leave ? (
              <span
                className={`mt-1 px-1 sm:px-2 py-1 rounded-full text-xs font-medium ${getBadgeClasses(
                  leave.status
                )}`}
              >
                {leave.status.toUpperCase()}
              </span>
            ) : (
              <span className="mt-1 text-xs text-blue-500 dark:text-blue-400">WORK</span>
            )}
          </div>
        );
      }
    }
    return days;
  };

  return (
    <div className="p-4 md:p-6 min-h-screen rounded-2xl">
      <Toaster />

      {/* Header */}
      <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2">
        <Calendar /> {monthName} {year}
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-6">Tap a date to apply or view leave</p>

      {/* Action Buttons */}
      <div className="flex gap-4 mb-6 flex-wrap">
        <button
          onClick={() => {
            setForm({ date: getLocalDateString(today), reason: "" });
            setIsApplyModalOpen(true);
          }}
          className="flex items-center gap-2 bg-[#007fff] hover:bg-[#006ae0] text-white rounded-xl shadow-lg px-4 py-2 cursor-pointer transition-all text-sm sm:text-base"
        >
          <PlusCircle /> Apply Leave
        </button>

        <button
          onClick={fetchLeaveSummary}
          className="flex items-center gap-2 bg-gray-800 dark:bg-gray-700 text-white rounded-xl shadow-lg px-4 py-2 cursor-pointer transition-all text-sm sm:text-base"
        >
          <Check /> Leave Summary
        </button>
      </div>

      {/* Weekdays */}
      <div className="grid grid-cols-7 text-center font-semibold mb-2 ">
        <div className="hidden sm:block">Sunday</div><div className="sm:hidden">Sun</div>
        <div className="hidden sm:block">Monday</div><div className="sm:hidden">Mon</div>
        <div className="hidden sm:block">Tuesday</div><div className="sm:hidden">Tue</div>
        <div className="hidden sm:block">Wednesday</div><div className="sm:hidden">Wed</div>
        <div className="hidden sm:block">Thursday</div><div className="sm:hidden">Thu</div>
        <div className="hidden sm:block">Friday</div><div className="sm:hidden">Fri</div>
        <div className="hidden sm:block">Saturday</div><div className="sm:hidden">Sat</div>
      </div>

      {/* Calendar */}
      <div className="grid grid-cols-7 gap-1 sm:gap-2">{renderCalendarDays()}</div>

      {/* Apply Leave Modal */}
      {isApplyModalOpen && (
        <div className={`fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4 transition-all ${isDarkMode ? 'dark' : ''}`}>
          <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full max-w-md rounded-2xl p-6 relative animate-fadeIn">
            <button
              className="absolute top-3 right-3 text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white"
              onClick={() => setIsApplyModalOpen(false)}
            >
              <X size={20} />
            </button>

            <h2 className="text-2xl font-bold mb-4">Apply Leave</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="flex flex-col">
                <span className="font-medium">Select Date</span>
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                  className="border dark:border-gray-600 bg-transparent rounded px-3 py-2 mt-1 w-full"
                  min={getLocalDateString(today)}
                  required
                />
              </label>
              <label className="flex flex-col">
                <span className="font-medium">Reason</span>
                <textarea
                  name="reason"
                  value={form.reason}
                  onChange={handleChange}
                  className="border dark:border-gray-600 bg-transparent rounded px-3 py-2 mt-1 w-full"
                  rows={3}
                  required
                />
              </label>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsApplyModalOpen(false)}
                  className="flex items-center gap-1 px-5 py-2 rounded-lg font-semibold bg-gray-400 hover:bg-gray-500 text-white"
                >
                  <X size={16} /> Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1 px-5 py-2 rounded-lg font-semibold bg-[#007fff] hover:bg-blue-700 text-white"
                >
                  <Check size={16} /> Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leave Summary Modal */}
      {isSummaryModalOpen && (
        <div className={`fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4 transition-all ${isDarkMode ? 'dark' : ''}`}>
          <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white w-full max-w-md rounded-2xl p-6 relative animate-fadeIn">
            <button
              className="absolute top-3 right-3 text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-white"
              onClick={() => setIsSummaryModalOpen(false)}
            >
              <X size={20} />
            </button>

            <h2 className="text-2xl font-bold mb-4">Leave Summary</h2>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Counts */}
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                  <div className="font-bold text-xl text-blue-600 dark:text-blue-400">{summary.totalLeaves}</div>
                  <div className="text-xs">Total</div>
                </div>
                <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                  <div className="font-bold text-xl text-green-600 dark:text-green-400">{summary.approved}</div>
                  <div className="text-xs">Approved</div>
                </div>
                <div className="p-2 bg-red-100 dark:bg-red-900/50 rounded-lg">
                  <div className="font-bold text-xl text-red-600 dark:text-red-400">{summary.rejected}</div>
                  <div className="text-xs">Rejected</div>
                </div>
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg">
                  <div className="font-bold text-xl text-yellow-500 dark:text-yellow-400">{summary.pending}</div>
                  <div className="text-xs">Pending</div>
                </div>
              </div>

              {/* Leave List */}
              <div className="space-y-3">
                <h3 className="font-semibold pt-2 border-t dark:border-gray-700">All Leaves</h3>
                {leaves.length > 0 ? (
                  leaves
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map((leave) => (
                      <div key={leave._id} className="p-3 border dark:border-gray-700 rounded-lg text-sm">
                        <div className="flex justify-between items-start">
                          <span className="font-semibold">{new Date(leave.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getBadgeClasses(leave.status)}`}>
                            {leave.status}
                          </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">Reason: {leave.reason}</p>
                      </div>
                    ))
                ) : (
                  <p className="text-center text-gray-500 py-4">No leaves applied yet.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}