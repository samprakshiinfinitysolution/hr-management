import React, { useState, useEffect } from "react";
import { LogIn, LogOut, Calendar, UserStar, Check, X, Coffee, Briefcase } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import API from "../../utils/api";

export default function EmpAttendance() {
  // helper: local yyyy-mm-dd (uses user's local timezone)
  const getLocalDate = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  // helper: get current time as HH:mm (24-hour format)
  const get24HourTime = () => {
    const d = new Date();
    const h = String(d.getHours()).padStart(2, "0");
    const m = String(d.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  };

  // helper: normalize any date string/ISO from backend to local yyyy-mm-dd
  const toLocalDateStr = (dateLike) => {
    if (!dateLike) return null;
    const d = new Date(dateLike);
    if (isNaN(d)) {
      const maybe = String(dateLike).split("T")[0];
      return maybe;
    }
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  const [loginTime, setLoginTime] = useState(null);
  const [checkoutTime, setCheckoutTime] = useState(null);
  const [lunchStartTime, setLunchStartTime] = useState(null);
  const [lunchEndTime, setLunchEndTime] = useState(null);
  const [selectedDate, setSelectedDate] = useState(getLocalDate());
  const [history, setHistory] = useState([]);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [hasLoggedInToday, setHasLoggedInToday] = useState(false);

  const navigate = useNavigate();
  const { user, token } = useSelector((state) => state.auth);

  // ✅ FIXED: prevent redirect on refresh using localStorage check
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedRole = localStorage.getItem("role");

    if (!storedToken || storedRole !== "employee") {
      navigate("/employee-login");
    }
  }, [navigate]);

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  // Fetch Attendance History
  const fetchHistory = async () => {
    try {
      const res = await API.get("/attendance/me");
      const arr = Array.isArray(res.data) ? res.data : [];

      const normalized = arr.map((r) => ({
        ...r,
        date: r.date ? r.date : r.attendanceDate ? r.attendanceDate : null,
        login: r.checkIn ? new Date(r.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
        lunchStart: r.lunchStartTime ? new Date(r.lunchStartTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
        lunchEnd: r.lunchEndTime ? new Date(r.lunchEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
        logout: r.logout || r.checkOut || null,
      }));

      const sortedHistory = normalized.sort((a, b) => new Date(b.date) - new Date(a.date));
      setHistory(sortedHistory);

      const todayRec = sortedHistory.find((r) => {
        const rDate = toLocalDateStr(r.date);
        return rDate === selectedDate;
      });

      if (todayRec) {
        setLoginTime(todayRec.login || null);
        setCheckoutTime(todayRec.logout || null);
        setLunchStartTime(todayRec.lunchStart || null);
        setLunchEndTime(todayRec.lunchEnd || null);
        setHasLoggedInToday(!!todayRec.login);
      } else {
        setLoginTime(null);
        setCheckoutTime(null);
        setHasLoggedInToday(false);
        setLunchStartTime(null);
        setLunchEndTime(null);
      }
    } catch (err) {
      console.error("fetchHistory error:", err);
      toast.error("Error fetching attendance records");
    }
  };

  const getRemark = (login, logout) => {
    if (!login || !logout) return "Incomplete";
    const [loginHour, loginMin] = login.split(":").map(Number);
    const [logoutHour, logoutMin] = logout.split(":").map(Number);
    const loginMins = loginHour * 60 + loginMin;
    const logoutMins = logoutHour * 60 + logoutMin;
    if (loginMins > 10 * 60 + 10) return "Late Login"; // After 10:10 AM
    if (logoutMins < 16 * 60) return "Half Day";
    if (logoutMins < 17 * 60 + 45) return "Early Checkout";
    return "Present";
  };

  const handleLogin = async () => {
    if (selectedDate !== getLocalDate()) {
      toast.error("Can only mark attendance for today");
      return;
    }

    if (hasLoggedInToday) {
      toast("✅ Already logged in today! No API call made.");
      return;
    }

    try {
      const now = new Date();
      const absentTime = new Date();
      absentTime.setHours(13, 30, 0, 0); // 1:30 PM

      if (now > absentTime) {
        toast.error("Cannot check-in after 1:30 PM. You will be marked absent.");
        return;
      }

      const timeStr = get24HourTime();
      setLoginTime(timeStr);

      await API.post("/attendance/checkin", { date: selectedDate, login: timeStr });
      toast.success(`✅ Logged in successfully at ${timeStr}`);
      setHasLoggedInToday(true);

      await fetchHistory();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to mark login");
      setLoginTime(null);
      setHasLoggedInToday(false);
    }
  };

  const handleCheckout = async () => {
    if (selectedDate !== getLocalDate()) {
      toast.error("Can only mark attendance for today");
      return;
    }
    try {
      const now = get24HourTime();
      setCheckoutTime(now);

      await API.post("/attendance/checkout", { date: selectedDate, logout: now });
      const remark = getRemark(loginTime, now);
      if (remark === "Half Day") toast.error("🟡 Half Day — checkout before 4:00 PM");
      else if (remark === "Early Checkout") toast("⚠️ Early checkout before 5:45 PM", { icon: "🕔" });
      else toast.success(`🕒 Checked out successfully at ${now}`);

      setHistory((prev) => {
        const todayRecordExists = prev.some(r => toLocalDateStr(r.date) === selectedDate);
        const newHistory = todayRecordExists
          ? prev.map(r => toLocalDateStr(r.date) === selectedDate ? { ...r, logout: now } : r)
          : [{ date: selectedDate, login: loginTime, logout: now }, ...prev];
        return newHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
      });

      await fetchHistory();
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to mark checkout");
    }
  };

  const handleLunchStart = async () => {
    if (selectedDate !== getLocalDate()) {
      toast.error("Can only mark lunch break for today");
      return;
    }
    try {
      const timeStr = get24HourTime();
      await API.post("/attendance/lunch-start", { date: selectedDate, time: timeStr });
      toast.success(`🍱 Lunch break started at ${timeStr}`);
      setLunchStartTime(timeStr);
      await fetchHistory();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to start lunch break");
    }
  };

  const handleLunchEnd = async () => {
    if (selectedDate !== getLocalDate()) {
      toast.error("Can only mark back to work for today");
      return;
    }
    try {
      const timeStr = get24HourTime();
      await API.post("/attendance/lunch-end", { date: selectedDate, time: timeStr });
      toast.success(`👍 Back to work at ${timeStr}`);
      setLunchEndTime(timeStr);
      await fetchHistory();
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to end lunch break");
    }
  };


  return (
    <div className="flex justify-center items-start w-full">
      <Toaster />
      <div className="w-full max-w-md sm:max-w-lg md:max-w-3xl  rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col items-center mb-6">
          <UserStar className="text-green-500 w-12 h-12 mb-2" />
          <h1 className="text-3xl font-bold text-center">Attendance Tracker</h1>
          <p className=" text-sm text-center mt-1">
            Mark your login & checkout time every day.
          </p>
        </div>

        <div className="mb-6">
          <label className="flex items-center gap-2 font-medium mb-2 ">
            <Calendar className="text-[#007fff]" size={20} /> Select Date (View Only)
          </label>
          <input
            type="date"
            className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-[#007fff] focus:outline-none"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={getLocalDate()}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
          <button
            onClick={handleLogin}
            disabled={!!loginTime}
            className={`flex-1 flex items-center justify-center gap-2 px-5 py-2 rounded-lg font-semibold text-white transition ${
              loginTime
                ? "bg-green-400 dark:bg-green-700 cursor-not-allowed"
                : "bg-green-500 hover:bg-green-600"
            }`}
          >
            <LogIn size={20} /> {loginTime ? "Logged In" : "Login"}
          </button>
          <button
            onClick={handleCheckout}
            disabled={!loginTime || !!checkoutTime}
            className={`flex-1 flex items-center justify-center gap-2 px-5 py-2 rounded-lg font-semibold text-white transition ${
              !loginTime || checkoutTime
                ? "bg-red-400 dark:bg-red-800 cursor-not-allowed"
                : "bg-red-500 hover:bg-red-600"
            }`}
          >
            <LogOut size={20} /> {checkoutTime ? "Checked Out" : "Checkout"}
          </button>
        </div>

        {/* Lunch Break Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
          <button
            onClick={handleLunchStart}
            disabled={!loginTime || !!lunchStartTime || !!checkoutTime}
            className={`flex-1 flex items-center justify-center gap-2 px-5 py-2 rounded-lg font-semibold text-white transition ${
              !loginTime || !!lunchStartTime || !!checkoutTime
                ? "bg-gray-400 dark:bg-gray-700 cursor-not-allowed"
                : "bg-yellow-500 hover:bg-yellow-600"
            }`}
          >
            <Coffee size={20} /> {lunchStartTime ? "On Break" : "On Lunch Break"}
          </button>
          <button
            onClick={handleLunchEnd}
            disabled={!lunchStartTime || !!lunchEndTime || !!checkoutTime}
            className={`flex-1 flex items-center justify-center gap-2 px-5 py-2 rounded-lg font-semibold text-white transition ${
              !lunchStartTime || !!lunchEndTime || !!checkoutTime
                ? "bg-gray-400 dark:bg-gray-700 cursor-not-allowed"
                : "bg-cyan-500 hover:bg-cyan-600"
            }`}
          >
            <Briefcase size={20} /> {lunchEndTime ? "Resumed" : "Back to Work"}
          </button>
        </div>

        <div className="rounded-xl p-4 mb-6">
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Check className="text-green-600" /> Today’s Summary
          </h2>
          <div className="space-y-2 ">
            <p>
              <span className="font-semibold">Date:</span> {selectedDate}
            </p>
            <p>
              <span className="font-semibold">Login Time:</span>{" "}
              <span className={loginTime ? "text-green-600 font-medium" : ""}>{loginTime || "-"}</span>
            </p>
            <p>
              <span className="font-semibold">Checkout Time:</span>{" "}
              <span className={checkoutTime ? "text-red-600 font-medium" : ""}>
                {checkoutTime || "-"}
              </span>
            </p>
            <p>
              <span className="font-semibold">Lunch Start:</span>{" "}
              <span className={lunchStartTime ? "text-yellow-600 font-medium" : ""}>
                {lunchStartTime || "-"}
              </span>
            </p>
            <p>
              <span className="font-semibold">Back to Work:</span>{" "}
              <span className={lunchEndTime ? "text-cyan-600 font-medium" : ""}>{lunchEndTime || "-"}</span>
            </p>
          </div>
        </div>

        <div className="flex justify-center mb-6">
          <button
            onClick={() => setIsSummaryOpen(true)}
            className="flex items-center justify-center gap-2 px-5 py-2 rounded-lg font-semibold bg-[#007fff] hover:bg-blue-700 text-white w-full sm:w-auto"
          >
            <Check size={20} /> View Last 10 Days
          </button>
        </div>

        {isSummaryOpen && (
          <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4 bg-black/50">
            <div className="rounded-lg p-6 max-w-lg w-full bg-white text-black dark:bg-gray-800 dark:text-white">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Attendance Summary</h2>
                <button onClick={() => setIsSummaryOpen(false)} className="hover:text-gray-700">
                  <X size={20} />
                </button>
              </div>
              <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">Last 10 Days Overview</p>
              {history.length === 0 ? (
                <p className="text-center py-4">No records yet</p>
              ) : (
                <div className="space-y-2 overflow-x-auto">
                  {history.slice(0, 10).map((r, i) => {
                    const remark = getRemark(r.login, r.logout);
                    const color =
                      remark === "Late Login"
                        ? "text-red-500"
                        : remark === "Half Day"
                        ? "text-yellow-500"
                        : remark === "Early Checkout"
                        ? "text-red-400"
                        : remark === "Present"
                        ? "text-green-600"
                        : "text-gray-500";
                    return (
                      <div
                        key={i}
                        className="flex justify-between items-center border-b border-gray-200 dark:border-gray-700 py-2 px-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition text-sm sm:text-base"
                      >
                        <span className="font-medium w-1/3">{toLocalDateStr(r.date)}</span>
                        <span className="text-green-600 font-semibold w-1/4">{r.login || "-"}</span>
                        <span className="text-red-600 font-semibold w-1/4">{r.logout || "-"}</span>
                        <span className={`font-semibold w-1/3 ${color}`}>{remark}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setIsSummaryOpen(false)}
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
