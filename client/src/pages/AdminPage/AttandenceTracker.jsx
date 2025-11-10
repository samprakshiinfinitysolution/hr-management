import React, { useState, useEffect } from 'react';
import API from "../../utils/api";
import { Close, Email, Phone, Visibility, CalendarMonth, People, CheckCircle, Cancel, AccessTime } from "@mui/icons-material"; // Assuming you use these
import { toast, Toaster } from "react-hot-toast";
import dayjs from "dayjs";

// Reusable Table Component
const AttendanceTable = ({ records, loading, userType, onRowClick }) => {
  if (loading) return <p className="text-center py-8">Loading...</p>;
  if (records.length === 0) return (
    <div className="p-8 text-center">
      <CalendarMonth className="mx-auto h-12 w-12 mb-4 text-gray-400" />
      <p>No attendance data found.</p>
    </div>
  );

  return (
    <div className="overflow-x-auto ">
      <table className="w-full">
        <thead >
          <tr className="bg-gray-300 text-black">
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider rounded-tl-lg">Employee</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">{userType === 'employee' ? 'Department' : 'Role'}</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Check-In</th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Check-Out</th>
            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider rounded-tr-lg">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {records.map((record) => (
            <tr key={record.id} className="hover:bg-gray-300 hover:text-black dark:hover:bg-gray-300 dark:hover:text-black">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium">{record.name || record.user?.name}</div>
                <div className="text-sm text-gray-500">{record.email || record.user?.email}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">{userType === 'employee' ? record.Department : record.role.toUpperCase()}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(record.status)}`}>
                  {record.status}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">{record.avgCheckIn}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">{record.avgCheckOut}</td>
              <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <button onClick={() => onRowClick(record)} className="text-blue-600 hover:text-blue-900">
                  <Visibility fontSize="small" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const getStatusColor = (status) => {
  switch (status) {
    case "Present": return "bg-green-100 text-green-800";
    case "Late":
    case "Late Login": return "bg-yellow-100 text-yellow-800";
    case "Absent": return "bg-red-100 text-red-800";
    default: return "bg-gray-100 text-gray-800";
  }
};

const AttendanceTracker = () => {
  const [activeTab, setActiveTab] = useState('employees');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeRecords, setEmployeeRecords] = useState([]);
  const [adminRecords, setAdminRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchEmployeeAttendance = async (date) => {
      setLoading(true);
      try {
        const formattedDate = dayjs(date).format("YYYY-MM-DD");
        // 1. Fetch all employees
        const employeesRes = await API.get("/admin/employees");
        const allEmployees = employeesRes.data;

        // 2. Fetch attendance for the selected date
        const attendanceRes = await API.get(`/attendance?date=${formattedDate}`);
        const attendanceMap = new Map(attendanceRes.data.map(att => [att.user?._id, att]));

        // 3. Merge the two lists
        const mergedRecords = allEmployees.map(emp => {
          const attendance = attendanceMap.get(emp._id);
          if (attendance) {
            // Employee has an attendance record
            return {
              id: emp._id,
              name: emp.name,
              Department: emp.department || "-",
              role: emp.position || "-",
              email: emp.email,
              phone: emp.phone,
              avgCheckIn: attendance.checkIn ? dayjs(attendance.checkIn).format("HH:mm") : "-",
              avgCheckOut: attendance.checkOut ? dayjs(attendance.checkOut).format("HH:mm") : "-",
              status: attendance.status || "Present", // Default to Present if record exists
            };
          } else {
            // Employee is absent
            return { ...emp, id: emp._id, status: "Absent", avgCheckIn: "-", avgCheckOut: "-" };
          }
        });

        setEmployeeRecords(mergedRecords);
        setError("");
      } catch (err) {
        setError(err.response?.data?.message || "Failed to fetch employee attendance");
        toast.error(err.response?.data?.message || "Failed to fetch employee attendance");
      } finally {
        setLoading(false);
      }
    };

    const fetchAdminAttendance = async (date) => {
      setLoading(true);
      try {
        // 1. Fetch all sub-admins (HRs/Managers)
        const subAdminsRes = await API.get("/admin/sub-admins");
        const allSubAdmins = subAdminsRes.data;

        // 2. Fetch all admin attendance records for the day
        const formattedDate = dayjs(date).format("YYYY-MM-DD");
        const attendanceRes = await API.get(`/attendance/admin/all?date=${formattedDate}`);
        const attendanceMap = new Map(attendanceRes.data.map(att => [att.user?._id, att]));

        // 3. Merge the two lists
        const mergedRecords = allSubAdmins.map(admin => {
          const attendance = attendanceMap.get(admin._id);
          if (attendance) {
            return {
              ...admin,
              id: admin._id,
              avgCheckIn: attendance.checkIn ? dayjs(attendance.checkIn).format("HH:mm") : "-",
              avgCheckOut: attendance.checkOut ? dayjs(attendance.checkOut).format("HH:mm") : "-",
              status: attendance.status || "Present",
            };
          } else {
            return { ...admin, id: admin._id, status: "Absent", avgCheckIn: "-", avgCheckOut: "-" };
          }
        });
        setAdminRecords(mergedRecords);
        setError("");
      } catch (err) {
        setError(err.response?.data?.message || "Failed to fetch HR/Manager attendance");
        toast.error(err.response?.data?.message || "Failed to fetch HR/Manager attendance");
      } finally {
        setLoading(false);
      }
    };

    if (activeTab === 'employees') {
      fetchEmployeeAttendance(selectedDate);
    } else {
      fetchAdminAttendance(selectedDate); // Pass selectedDate as an argument
    }
  }, [selectedDate, activeTab]);

  const handleDateChange = (e) => {
    setSelectedDate(dayjs(e.target.value).toDate());
  };

  const currentRecords = activeTab === 'employees' ? employeeRecords : adminRecords;

  const attendanceSummary = [
    { title: "Total", value: currentRecords.length, icon: <People className="text-blue-500" /> },
    { title: "Present", value: currentRecords.filter((e) => e.status === "Present").length, icon: <CheckCircle className="text-green-500" /> },
    { title: "Absent", value: currentRecords.filter((e) => e.status === "Absent").length, icon: <Cancel className="text-red-500" /> },
    { title: "Late", value: currentRecords.filter((e) => e.status === "Late" || e.status === "Late Login").length, icon: <AccessTime className="text-yellow-500" /> },
  ];

  return (
    <div className="min-h-screen p-6">
      <Toaster />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">📅 Attendance Tracker</h1>
        <div>
          <label className="text-sm font-medium mr-2">Select Date:</label>
          <input
            type="date"
            value={dayjs(selectedDate).format("YYYY-MM-DD")}
            onChange={handleDateChange}
            className="p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:border-gray-600"
          />
        </div>
      </div>

      {error && (
        <div className="border border-red-200 rounded-lg p-4 mb-4">
          <p className="font-medium">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-4 py-1 rounded bg-red-500 text-white hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
        <button
          onClick={() => setActiveTab('employees')}
          className={`py-2 px-4 text-sm font-medium ${activeTab === 'employees' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-400'}`}
        >
          Employees
        </button>
        <button
          onClick={() => setActiveTab('admins')}
          className={`py-2 px-4 text-sm font-medium ${activeTab === 'admins' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-400'}`}
        >
          HR & Managers
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <p>Loading attendance data...</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {attendanceSummary.map((summary, index) => (
              <div key={index} className="shadow rounded-lg p-4 flex items-center gap-4 ">
                <div>{summary.icon}</div>
                <div>
                  <h3 className="text-sm font-medium">{summary.title}</h3>
                  <p className="text-2xl font-semibold">{summary.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Attendance Table */}
          <div className="shadow-lg rounded-lg overflow-hidden ">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 ">
              <h3 className="text-xl font-semibold">{activeTab === 'employees' ? 'Employee Attendance' : 'HR & Manager Attendance'}</h3>
              <p className="mt-1">Total: {currentRecords.length} records</p>
            </div>
            <AttendanceTable
              records={currentRecords}
              loading={loading}
              userType={activeTab === 'employees' ? 'employee' : 'admin'}
              onRowClick={setSelectedEmployee}
            />
          </div>
        </>
      )}

      {/* Employee Details Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4 bg-black/50">
          <div className="rounded-lg p-6 max-w-md w-full bg-white text-black dark:bg-gray-800 dark:text-white">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Details</h2>
              <button onClick={() => setSelectedEmployee(null)} className="hover:text-gray-700">
                <Close fontSize="small" />
              </button>
            </div>
            <div className="space-y-3">
              <p><strong>Name:</strong> {selectedEmployee.name}</p>
              {selectedEmployee.Department && <p><strong>Department:</strong> {selectedEmployee.Department}</p>}
              <p><strong>Role:</strong> {selectedEmployee.role}</p>
              {selectedEmployee.joinDate && <p><strong>Join Date:</strong> {selectedEmployee.joinDate}</p>}
              <p className="flex items-center gap-2"><Email fontSize="small" /> <strong>Email:</strong> {selectedEmployee.email}</p>
              {selectedEmployee.phone && <p className="flex items-center gap-2"><Phone fontSize="small" /> <strong>Phone:</strong> {selectedEmployee.phone}</p>}
              <p><strong>Status:</strong> <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedEmployee.status)}`}>{selectedEmployee.status}</span></p>
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={() => setSelectedEmployee(null)} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AttendanceTracker;
