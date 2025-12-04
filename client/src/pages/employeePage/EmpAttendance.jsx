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
  const [selectedDate, setSelectedDate] = useState(getLocalDate());
  const [history, setHistory] = useState([]);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [hasLoggedInToday, setHasLoggedInToday] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [breaks, setBreaks] = useState([]);
  const [activeBreak, setActiveBreak] = useState(false);
  const [attendanceSettings, setAttendanceSettings] = useState({});
  const [startBreakLoading, setStartBreakLoading] = useState(false);
  const [endBreakLoading, setEndBreakLoading] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [monthData, setMonthData] = useState([]);
  const [summary, setSummary] = useState({});
  const [selectedDay, setSelectedDay] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());


  const navigate = useNavigate();
  const { user, token } = useSelector((state) => state.auth);

  useEffect(() => {
    fetchHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  const openCalendar = async () => {
    await fetchMonthAttendance(currentMonth);
    setShowCalendarModal(true);
  };
  // Fetch Attendance History
  const fetchHistory = async () => {
    try {
      const res = await API.get("/attendance/me");
      const { records = [], settings = {} } = res.data;
      setAttendanceSettings(settings);

      const normalized = records.map((r) => ({
        ...r,
        date: r.date ? r.date : r.attendanceDate ? r.attendanceDate : null,
        login: r.checkIn ? new Date(r.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
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
        setHasLoggedInToday(!!todayRec.login);
        setBreaks(todayRec.breaks || []);
        const currentBreak = (todayRec.breaks || []).find(b => b.start && !b.end);
        setActiveBreak(!!currentBreak);
      } else {
        setLoginTime(null);
        setCheckoutTime(null);
        setHasLoggedInToday(false);
        setBreaks([]);
        setActiveBreak(false);
      }
    } catch (err) {
      console.error("fetchHistory error:", err);
      toast.error("Error fetching attendance records");
    }
  };

  const fetchMonthAttendance = async (monthDate) => {
    try {
      const start = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const end = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);

      const res = await API.get("/attendance/me", {
        params: {
          startDate: start.toISOString(),
          endDate: end.toISOString()
        }
      });

      const records = res.data.records || [];

      // Count summary dynamically
      let sum = {
        present: 0,
        late: 0,
        half: 0,
        early: 0,
        absent: 0,
        totalDays: end.getDate(),
      };

      const formatted = [];
      const recordMap = {};

      records.forEach((r) => {
        const d = r.date.split("T")[0];
        recordMap[d] = r;
      });

      for (let i = 1; i <= end.getDate(); i++) {
        const currentDate = new Date(start.getFullYear(), start.getMonth(), i);
        const dayStr = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const rec = recordMap[dayStr];

        let status = "Holiday"; // Default for Sunday
        const isSunday = currentDate.getDay() === 0;

        if (!isSunday) {
          if (rec) {
            status = rec.status || "Present";

            if (status === "Present") sum.present++;
            else if (status === "Late" || status === "Late Login") sum.late++;
            else if (status === "Half Day") sum.half++;
            else if (status === "Early Checkout") sum.early++;
          } else {
            status = "Absent";
            sum.absent++;
          }
        } else {
          status = "Sunday";
        }

        formatted.push({
          date: dayStr,
          status,
          login: rec?.login || "-",
          logout: rec?.logout || "-",
          breaks: rec?.breaks || []
        });
      }

      setSummary(sum);
      setMonthData(formatted);

    } catch (err) {
      console.error(err);
      toast.error("Failed to load month attendance");
    }
  };


  // Dynamic remark logic based on admin settings
  const getRemark = (login, logout, settings) => {
    if (!login || !logout) return "Incomplete";

    const toMins = (hhmm) => {
      if (!hhmm) return 0;
      const [h, m] = String(hhmm).split(":").map(Number);
      return h * 60 + m;
    };

    const loginMins = toMins(login);
    const logoutMins = toMins(logout);

    // Use default values if settings are not available
    const officeStart = toMins(settings.officeStartTime || "10:00");
    const lateGrace = Number(settings.lateGraceMinutes || 15);
    const halfDayLoginCutoff = toMins(settings.halfDayLoginCutoff || "11:00");

    const halfDayCheckoutCutoff = toMins(settings.halfDayCheckoutCutoff || "17:00");
    const officeEnd = toMins(settings.officeEndTime || "18:00");

    // LOGIN LOGIC
    if (loginMins > halfDayLoginCutoff) return "Half Day";
    if (loginMins > officeStart + lateGrace) return "Late Login";

    // LOGOUT LOGIC
    if (logoutMins < halfDayCheckoutCutoff) return "Half Day";
    if (logoutMins < officeEnd) return "Early Checkout";

    // If status was already set to Half Day on login, keep it.
    const todayRec = history.find(r => toLocalDateStr(r.date) === selectedDate);
    if (todayRec && todayRec.status === 'Half Day') return 'Half Day';

    return "Present"; // Default if no other conditions met
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

    if (loginLoading) return;
    try {
      setLoginLoading(true);
      const now = new Date();
      const absentTime = new Date();
      // absentTime.setHours(13, 30, 0, 0); // 1:30 PM

      // if (now > absentTime) {
      //   toast.error("Cannot check-in after 1:30 PM. You will be marked absent.");
      //   return;
      // }

      const timeStr = get24HourTime();
      setLoginTime(timeStr);

      console.log("Employee: calling /attendance/checkin");
      const res = await API.post("/attendance/checkin", { date: selectedDate, login: timeStr });
      console.log("Employee: /attendance/checkin response:", res?.data);
      toast.success(`✅ Logged in successfully at ${timeStr}`);

      const att = res?.data?.att;
      if (att) {
        const normalized = {
          ...att,
          date: att.date || att.attendanceDate || null,
          login: att.checkIn ? new Date(att.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : timeStr,
          logout: att.logout || att.checkOut || null,
        };
        setHasLoggedInToday(true);
        setBreaks(att.breaks || []);
        setActiveBreak((att.breaks || []).some(b => b.start && !b.end));
        setHistory(prev => {
          const exists = prev.some(r => toLocalDateStr(r.date) === toLocalDateStr(normalized.date));
          if (exists) {
            return prev.map(r => toLocalDateStr(r.date) === toLocalDateStr(normalized.date) ? normalized : r).sort((a, b) => new Date(b.date) - new Date(a.date));
          }
          return [normalized, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date));
        });
      } else {
        setHasLoggedInToday(true);
        await fetchHistory();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || err.response?.data?.message || "Failed to mark login");
      setLoginTime(null);
      setHasLoggedInToday(false);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleCheckout = async () => {
    if (selectedDate !== getLocalDate()) {
      toast.error("Can only mark attendance for today");
      return;
    }
    if (checkoutLoading) return;
    try {
      setCheckoutLoading(true);
      const now = get24HourTime();
      setCheckoutTime(now);

      console.log("Employee: calling /attendance/checkout");
      const res = await API.post("/attendance/checkout", { date: selectedDate, logout: now });
      console.log("Employee: /attendance/checkout response:", res?.data);
      const remark = getRemark(loginTime, now, attendanceSettings);
      // if (remark === "Half Day") toast.error("🟡 Half Day — checkout before 4:00 PM");
      // else if (remark === "Early Checkout") toast("⚠️ Early checkout before 5:45 PM", { icon: "🕔" });
      // else toast.success(`🕒 Checked out successfully at ${now}`);
      if (remark === "Half Day") {
        toast.error(`🟡 Half Day — checkout before ${attendanceSettings.halfDayCheckoutCutoff}`);
      }
      else if (remark === "Early Checkout") {
        toast(`⚠️ Early Checkout — office end time is ${attendanceSettings.officeEndTime}`, {
          icon: "🕔"
        });
      }
      else {
        toast.success(`🕒 Checked out successfully at ${now}`);
      }

      const att = res?.data?.att;
      if (att) {
        const normalized = {
          ...att,
          date: att.date || att.attendanceDate || null,
          login: att.checkIn ? new Date(att.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : loginTime,
          logout: att.logout || att.checkOut || now,
        };
        setBreaks(att.breaks || []);
        setActiveBreak((att.breaks || []).some(b => b.start && !b.end));
        setHistory(prev => {
          const exists = prev.some(r => toLocalDateStr(r.date) === toLocalDateStr(normalized.date));
          if (exists) {
            return prev.map(r => toLocalDateStr(r.date) === toLocalDateStr(normalized.date) ? normalized : r).sort((a, b) => new Date(b.date) - new Date(a.date));
          }
          return [normalized, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date));
        });
        setCheckoutTime(normalized.logout || checkoutTime);
      } else {
        await fetchHistory();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || "Failed to mark checkout");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleStartBreak = async () => {
    if (selectedDate !== getLocalDate()) {
      toast.error("Can only start a break for today");
      return;
    }
    if (startBreakLoading) return; // prevent duplicate clicks
    try {
      setStartBreakLoading(true);
      console.log("Employee: calling /attendance/start-break");
      const res = await API.post("/attendance/start-break");
      console.log("Employee: /attendance/start-break response:", res?.data);
      toast.success(`🍱 Break started!`);
      // Update local state from server response to avoid extra GET
      const att = res?.data?.att;
      if (att) {
        const normalized = {
          ...att,
          date: att.date || att.attendanceDate || null,
          login: att.checkIn ? new Date(att.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
          logout: att.logout || att.checkOut || null,
        };
        setBreaks(att.breaks || []);
        setActiveBreak((att.breaks || []).some(b => b.start && !b.end));
        setHistory(prev => {
          const exists = prev.some(r => toLocalDateStr(r.date) === toLocalDateStr(normalized.date));
          if (exists) {
            return prev.map(r => toLocalDateStr(r.date) === toLocalDateStr(normalized.date) ? normalized : r).sort((a, b) => new Date(b.date) - new Date(a.date));
          }
          return [normalized, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date));
        });
        setLoginTime(normalized.login || loginTime);
        setCheckoutTime(normalized.logout || checkoutTime);
        setHasLoggedInToday(!!normalized.login || hasLoggedInToday);
      } else {
        // fallback: mark active and refetch history
        setActiveBreak(true);
        await fetchHistory();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to start break");
    } finally {
      setStartBreakLoading(false);
    }
  };

  const handleEndBreak = async () => {
    if (selectedDate !== getLocalDate()) {
      toast.error("Can only end a break for today");
      return;
    }
    if (endBreakLoading) return; // prevent duplicate clicks
    try {
      setEndBreakLoading(true);
      console.log("Employee: calling /attendance/end-break");
      const res = await API.post("/attendance/end-break");
      console.log("Employee: /attendance/end-break response:", res?.data);
      toast.success(`👍 Back to work!`);
      const att = res?.data?.att;
      if (att) {
        const normalized = {
          ...att,
          date: att.date || att.attendanceDate || null,
          login: att.checkIn ? new Date(att.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : null,
          logout: att.logout || att.checkOut || null,
        };
        setBreaks(att.breaks || []);
        setActiveBreak((att.breaks || []).some(b => b.start && !b.end));
        setHistory(prev => {
          const exists = prev.some(r => toLocalDateStr(r.date) === toLocalDateStr(normalized.date));
          if (exists) {
            return prev.map(r => toLocalDateStr(r.date) === toLocalDateStr(normalized.date) ? normalized : r).sort((a, b) => new Date(b.date) - new Date(a.date));
          }
          return [normalized, ...prev].sort((a, b) => new Date(b.date) - new Date(a.date));
        });
        setLoginTime(normalized.login || loginTime);
        setCheckoutTime(normalized.logout || checkoutTime);
      } else {
        setActiveBreak(false);
        await fetchHistory();
      }
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || "Failed to end break");
    } finally {
      setEndBreakLoading(false);
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
            className={`flex-1 flex items-center justify-center gap-2 px-5 py-2 rounded-lg font-semibold text-white transition ${loginTime
              ? "bg-green-400 dark:bg-green-700 cursor-not-allowed"
              : "bg-green-500 hover:bg-green-600"
              }`}
          >
            <LogIn size={20} /> {loginTime ? "Logged In" : "Login"}
          </button>
          <button
            onClick={() => setShowLogoutModal(true)}   // ⬅ Instead of handleCheckout()
            disabled={!loginTime || !!checkoutTime}
            className={`flex-1 flex items-center justify-center gap-2 px-5 py-2 rounded-lg font-semibold text-white transition ${!loginTime || checkoutTime
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
            onClick={handleStartBreak}
            disabled={!loginTime || activeBreak || !!checkoutTime}
            className={`flex-1 flex items-center justify-center gap-2 px-5 py-2 rounded-lg font-semibold text-white transition ${!loginTime || activeBreak || !!checkoutTime
              ? "bg-gray-400 dark:bg-gray-700 cursor-not-allowed"
              : "bg-yellow-500 hover:bg-yellow-600"
              }`}
          >
            <Coffee size={20} /> {activeBreak ? "On Break" : "Start Break"}
          </button>
          <button
            onClick={handleEndBreak}
            disabled={!loginTime || !activeBreak || !!checkoutTime}
            className={`flex-1 flex items-center justify-center gap-2 px-5 py-2 rounded-lg font-semibold text-white transition ${!loginTime || !activeBreak || !!checkoutTime
              ? "bg-gray-400 dark:bg-gray-700 cursor-not-allowed"
              : "bg-cyan-500 hover:bg-cyan-600"
              }`}
          >
            <Briefcase size={20} /> {"End Break"}
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
            {breaks.map((b, i) => (
              <p key={i}>
                <span className="font-semibold">Break {i + 1}:</span>{" "}
                <span className="text-yellow-600 font-medium">
                  {b.start ? new Date(b.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                  {' - '}
                  {b.end ? new Date(b.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (activeBreak && i === breaks.length - 1 ? 'In Progress' : '-')}
                </span>
              </p>
            ))}

          </div>
        </div>

        <div className="flex justify-center mb-6">
          <button
            onClick={openCalendar}
            className="flex items-center justify-center gap-2 px-5 py-2 rounded-lg font-semibold bg-[#007fff] hover:bg-blue-700 text-white w-full sm:w-auto"
          >
            📅 View Monthly Attendance
          </button>

        </div>
        {showLogoutModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl w-full max-w-sm text-center">
              <h3 className="text-xl font-semibold mb-4 text-red-600">
                Confirm Checkout
              </h3>

              <p className="mb-6 text-gray-700 dark:text-gray-300">
                Are you sure you want to checkout?
              </p>

              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setShowLogoutModal(false)}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-600 rounded-lg hover:bg-gray-400 dark:hover:bg-gray-500"
                >
                  Cancel
                </button>

                <button
                  onClick={() => {
                    setShowLogoutModal(false);
                    handleCheckout();
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Yes, Checkout
                </button>
              </div>
            </div>
          </div>
        )}

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
                    const remark = getRemark(r.login, r.logout, attendanceSettings);
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

        {showCalendarModal && (
          <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-900 text-black dark:text-white w-full max-w-5xl rounded-xl p-6 shadow-xl max-h-[90vh] overflow-y-auto">

              {/* Header */}
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">
                  Attendance — {currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h2>
                <button onClick={() => setShowCalendarModal(false)} className="hover:text-red-800 text-red-500 cursor-pointer" >
                  <X size={28} />
                </button>
              </div>

              {/* Month Nav */}
              <div className="flex gap-4 mb-4">
                <button
                  onClick={() => {
                    const m = new Date(currentMonth);
                    m.setMonth(m.getMonth() - 1);
                    setCurrentMonth(m);
                    fetchMonthAttendance(m);
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg"
                >
                  ← Previous Month
                </button>

                <button
                  onClick={() => {
                    const m = new Date(currentMonth);
                    m.setMonth(m.getMonth() + 1);
                    setCurrentMonth(m);
                    fetchMonthAttendance(m);
                  }}
                  className="px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg"
                >
                  Next Month →
                </button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-3 mt-4">

                {monthData.map((day, idx) => {
                  const isSunday = day.status === "Sunday";
                  const statusColor = isSunday
                    ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400"
                    : day.status === "Present" ? "bg-green-200 text-green-800"
                      : day.status === "Late" || day.status === "Late Login" ? "bg-yellow-200 text-yellow-800"
                        : day.status === "Early Checkout" ? "bg-orange-200 text-orange-800"
                          : day.status === "Half Day" ? "bg-purple-200 text-purple-800"
                            : "bg-gray-200 text-gray-900";

                  return (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border cursor-pointer hover:bg-blue-100 dark:hover:bg-gray-700 ${isSunday ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-gray-600'}`}
                      onClick={() => setSelectedDay(day)}
                    >
                      <p className={`font-bold text-center text-lg ${isSunday ? 'text-red-500' : ''}`}>{day.date.split("-")[2]}</p>
                      <p className={`text-xs text-center mt-1 px-1 rounded ${statusColor}`}>
                        {day.status}
                      </p>
                    </div>
                  );
                })}

              </div>

              {/* Selected Day Details */}
              {selectedDay && (
                <div className="mt-6 p-4 rounded-lg border bg-gray-50 dark:bg-gray-800">
                  <h3 className="text-xl font-semibold mb-2">
                    Details for {selectedDay.date}
                  </h3>

                  <p><strong>Login:</strong> {selectedDay.login}</p>
                  <p><strong>Logout:</strong> {selectedDay.logout}</p>

                  <h4 className="mt-3 font-bold">Breaks:</h4>

                  {selectedDay.breaks.length === 0 && (
                    <p className="text-sm text-gray-500">No breaks taken</p>
                  )}

                  {selectedDay.breaks.map((b, i) => (
                    <div key={i} className="text-sm ml-4">
                      Break {i + 1}:{" "}
                      {new Date(b.start).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {" - "}
                      {b.end
                        ? new Date(b.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : "In Progress"}
                    </div>
                  ))}
                </div>
              )}

              {/* Summary */}
              <div className="mt-6 grid grid-cols-5 gap-3 text-center text-sm font-semibold">
                <div className="bg-green-200 text-green-800 p-2 rounded-lg">Present: {summary.present}</div>
                <div className="bg-yellow-200 text-yellow-800 p-2 rounded-lg">Late: {summary.late}</div>
                <div className="bg-red-200 text-red-800 p-2 rounded-lg">Half Day: {summary.half}</div>
                <div className="bg-orange-200 text-orange-800 p-2 rounded-lg">Early: {summary.early}</div>
                <div className="bg-gray-200 text-gray-900 p-2 rounded-lg">Absent: {summary.absent}</div>
              </div>

            </div>
          </div>
        )}


      </div>
    </div>
  );
}
