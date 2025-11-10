
// pages/AdminDashboard.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../utils/api";
import { Cake, LogIn, LogOut, Clock } from "lucide-react";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";

const AdminAttendanceWidget = () => {
  const [todayAttendance, setTodayAttendance] = useState(null);

  const fetchTodayAttendance = async () => {
    try {
      // Use the correct endpoint for admin/hr/manager attendance
      // The route for this was added in the previous step to attendanceRoutes.js
      // GET /api/attendance/admin/me -> uses getMyAttendance controller
      const res = await API.get("/attendance/admin/me");
      const todayRecord = res.data.find(rec => new Date(rec.date).toDateString() === new Date().toDateString());
      setTodayAttendance(todayRecord);
    } catch (err) {
      // It's okay if it fails, means no record for today yet.
      console.log("No attendance record for today yet.");
    }
  };

  useEffect(() => {
    fetchTodayAttendance();
  }, []);

  const handleCheckIn = async () => {
    try {
      await API.post("/attendance/admin/checkin"); // Send request
      await fetchTodayAttendance(); // Wait for data to be refetched
      toast.success("Checked in successfully!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Check-in failed.");
    }
  };

  const handleCheckOut = async () => {
    try {
      await API.post("/attendance/admin/checkout"); // Send request
      await fetchTodayAttendance(); // Wait for data to be refetched
      toast.success("Checked out successfully!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Check-out failed.");
    }
  };

  return (
    // Use the same styling as other dashboard cards
    <div className={`p-6 rounded-lg shadow-md text-center ${useSelector((state) => state.settings.isDarkMode) ? "bg-gray-800 text-white" : "bg-white text-gray-900"}`}>
      <h3 className="text-lg font-medium mb-4">My Attendance</h3>
      {todayAttendance?.checkOut ? (
        // Show message if both are done
        <div className="flex flex-col items-center justify-center">
          <p className="text-green-500 font-semibold">Attendance for today is complete.</p>
        </div>
      ) : (
        // Show both buttons
        <div className="flex gap-4 justify-center">
          <button onClick={handleCheckIn} disabled={!!todayAttendance?.checkIn} className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 disabled:cursor-not-allowed">
            <LogIn size={18} /> Check In
          </button>
          <button onClick={handleCheckOut} disabled={!todayAttendance?.checkIn} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed">
            <LogOut size={18} /> Check Out
          </button>
        </div>
      )}
      {todayAttendance?.checkIn && <p className="text-sm mt-2 text-gray-500">Checked In at: {new Date(todayAttendance.checkIn).toLocaleTimeString()}</p>}
      {todayAttendance?.checkOut && <p className="text-sm mt-2 text-gray-500">Checked Out at: {new Date(todayAttendance.checkOut).toLocaleTimeString()}</p>}
    </div>
  );
};

export default function AdminHome() {
  const isDarkMode = useSelector((state) => state.settings.isDarkMode);
  const user = useSelector((state) => state.auth.user);
  const role = (user?.role || "").toLowerCase();

  const [dashboard, setDashboard] = useState({
    totalEmployees: 0,
    leaveReports: 0,
    attendance: { total: 0, onTime: 0, absent: 0, late: 0 },
  });
  const [birthdays, setBirthdays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [wishesLoading, setWishesLoading] = useState({});
  const [error, setError] = useState("");

  const attendanceGrid = Array(20)
    .fill("")
    .map(() => Math.floor(Math.random() * 200));

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const { data } = await API.get("/admin/dashboard");
        setDashboard({
          totalEmployees: data.totalEmployees || 0,
          attendance: data.attendance || { total: 0, onTime: 0, absent: 0, late: 0 },
          leaveReports: data.pendingLeaveCount || 0,
        });
        setError("");
      } catch (err) {
        setError(err.response?.data?.message || "Failed to fetch dashboard data.");
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  useEffect(() => {
    const fetchBirthdays = async () => {
      try {
        const res = await API.get("/admin/birthdays");
        setBirthdays(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchBirthdays();
  }, []);

  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  })();

  const handleSendWishes = async (id, name) => {
    setWishesLoading((prev) => ({ ...prev, [id]: true }));
    try {
      await API.post(`/admin/birthday-wish/${id}`);
      toast.success(`Birthday wish sent to ${name}!`);
    } catch {
      toast.error("Failed to send birthday wish");
    } finally {
      setWishesLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  return (
    <main className={`mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`}>
      <h2 className={`col-span-full text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-800"}`}>
        {greeting}, {user?.name || "Admin"}
        <p className="text-sm text-gray-400 mt-1">
          Role: {role.toUpperCase()}
        </p>
      </h2>

      {error && (
        <p className="text-red-600 text-center mb-4 bg-red-100 dark:bg-red-800 p-2 rounded col-span-full">
          {error}
        </p>
      )}

      {loading ? (
        <p className={`text-center col-span-full ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>
          Loading...
        </p>
      ) : (
        <>
          {/* Show Attendance Widget only for HR and Manager */}
          {(role === 'hr' || role === 'manager') && (
            <AdminAttendanceWidget />
          )}

          {/* Total Employees */}
          <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? "bg-gray-800 text-white" : "bg-white text-gray-900"}`}>
            <h3 className="text-lg font-medium">Total Employees</h3>
            <p className="text-3xl font-bold mt-4">{dashboard.totalEmployees}</p>
            <Link to="/admin/dashboard/emp-management">
              <button className="mt-6 w-full bg-[#007fff] text-white py-2 rounded hover:bg-blue-700">
                View Details
              </button>
            </Link>
          </div>

          {/* Leave Reports */}
          <div className={`p-6 rounded-lg shadow-md ${isDarkMode ? "bg-gray-800 text-white" : "bg-white text-gray-900"}`}>
            <h3 className="text-lg font-medium">Pending Leave Requests</h3>
            <p className="text-3xl font-bold mt-4">{dashboard.leaveReports}</p>
            <Link to="/admin/dashboard/leave">
              <button className="mt-6 w-full bg-[#007fff] text-white py-2 rounded hover:bg-blue-700">
                Review Leaves
              </button>
            </Link>
          </div>

          {/* Attendance Tracker */}
          <div
            className={`p-6 rounded-lg shadow-md transition-all duration-300 ${isDarkMode ? "bg-gray-800 text-white" : "bg-white text-gray-900"
              }`}
          >
            <h3 className="text-lg font-medium mb-4">Attendance Report</h3>

            {/* Summary Section */}
            <div className="grid grid-cols-4 gap-2">
              {["total", "onTime", "absent", "late"].map((key) => (
                <div key={key} className="text-center">
                  <p className="text-2xl font-bold">{dashboard.attendance[key]}</p>
                  <p
                    className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"
                      }`}
                  >
                    {key === "onTime"
                      ? "On Time"
                      : key.charAt(0).toUpperCase() + key.slice(1)}
                  </p>
                </div>
              ))}
            </div>

            {/* Heatmap/Tracker Grid */}
            <div className="grid grid-cols-10 gap-1 mt-6">
              {attendanceGrid.map((val, idx) => (
                <div
                  key={idx}
                  className="h-6 w-6 rounded transition-all duration-300"
                  style={{
                    backgroundColor: `rgb(0, 127, ${Math.min(
                      255,
                      Math.floor((val / 200) * 255)
                    )})`,
                  }}
                ></div>
              ))}
            </div>
          </div>
          {/* Birthday Events */}
          <div className={`col-span-full p-6 rounded-2xl shadow-lg ${isDarkMode
              ? "bg-gray-800 text-white"
              : "bg-gradient-to-br from-pink-50 to-yellow-50 text-gray-900"
            }`}>
            <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Cake /> Birthday Events
            </h1>
            {birthdays.length === 0 ? (
              <p>No birthdays today</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {birthdays.map((b) => (
                  <div
                    key={b._id}
                    className={`p-4 rounded-lg shadow ${isDarkMode ? "bg-gray-700 text-white" : "bg-white text-gray-900"}`}
                  >
                    <img
                      src={b.image || "https://i.pravatar.cc/150"}
                      alt={b.name}
                      className="w-24 h-24 rounded-full mx-auto mb-2 object-cover"
                    />
                    <h2 className="text-lg font-semibold">{b.name}</h2>
                    <p className="text-sm">{b.date}</p>
                    <button
                      onClick={() => handleSendWishes(b._id, b.name)}
                      disabled={wishesLoading[b._id]}
                      className="mt-2 w-full bg-pink-500 text-white py-1 rounded hover:bg-pink-600"
                    >
                      {wishesLoading[b._id] ? "Sending..." : "Send Wishes"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </main>
  );
}