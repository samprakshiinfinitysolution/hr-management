// import React, { useState, useEffect } from 'react';
// import API from "../../utils/api";
// import { Close, Email, Phone, Visibility, CalendarMonth, People, CheckCircle, Cancel, AccessTime, EditCalendar } from "@mui/icons-material";
// import { toast, Toaster } from "react-hot-toast";
// import dayjs from "dayjs";

// // Reusable Table Component
// const AttendanceTable = ({ records, loading, userType, onRowClick }) => {
//   if (loading) return <p className="text-center py-8">Loading...</p>;
//   if (records.length === 0) return (
//     <div className="p-8 text-center">
//       <CalendarMonth className="mx-auto h-12 w-12 mb-4 text-gray-400" />
//       <p>No attendance data found.</p>
//     </div>
//   );

//   return (
//     <div className="overflow-x-auto">
//       <table className="w-full min-w-[1024px]"> {/* Min-width for horizontal scroll on small screens */}
//         <thead>
//           <tr className="bg-gray-300 text-black">
//             <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider rounded-tl-lg">Employee</th>
//             <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">{userType === 'employee' ? 'Department' : 'Role'}</th>
//             <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
//             <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Check-In</th>
//             <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Check-Out</th>
//             <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Total Time</th>
//             <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Total Break</th>
//             <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider rounded-tr-lg">Actions</th>
//           </tr>
//         </thead>
//         <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
//           {records.map((record) => (
//             <tr key={record.id} className="hover:bg-gray-300 hover:text-black dark:hover:bg-gray-300 dark:hover:text-black">
//               <td className="px-4 py-4 whitespace-nowrap">
//                 <div className="text-sm font-medium">{record.name || record.user?.name}</div>
//                 <div className="text-sm text-gray-500">{record.email || record.user?.email}</div>
//               </td>
//               <td className="px-6 py-4 whitespace-nowrap text-sm">{userType === 'employee' ? record.Department : record.role.toUpperCase()}</td>
//               <td className="px-6 py-4 whitespace-nowrap">
//                 <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(record.status)}`}>
//                   {record.status}
//                 </span>
//               </td>
//               <td className="px-4 py-4 whitespace-nowrap text-sm">{record.avgCheckIn}</td>
//               <td className="px-4 py-4 whitespace-nowrap text-sm">{record.avgCheckOut}</td>
//               <td className="px-4 py-4 whitespace-nowrap text-sm">{record.totalWorkTime || "-"}</td>
//               <td className="px-4 py-4 whitespace-nowrap text-sm">{record.totalBreakTime}</td>
//               <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
//                 <button onClick={() => onRowClick(record)} className="text-blue-600 hover:text-blue-900">
//                   <Visibility fontSize="small" />
//                 </button>
//               </td>
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// };

// const getStatusColor = (status) => {
//   switch (status) {
//     case "Present": return "bg-green-100 text-green-800";
//     case "Late":
//     case "Late Login": return "bg-yellow-100 text-yellow-800";
//     case "Absent": return "bg-red-100 text-red-800";
//     default: return "bg-gray-100 text-gray-800";
//   }
// };

// const AttendanceTracker = () => {
//   const [activeTab, setActiveTab] = useState('employees');
//   const [selectedDate, setSelectedDate] = useState(new Date());
//   const [selectedEmployee, setSelectedEmployee] = useState(null);
//   const [employeeRecords, setEmployeeRecords] = useState([]);
//   const [adminRecords, setAdminRecords] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");
//   const [allEmployees, setAllEmployees] = useState([]);
//   const [filterEmployeeId, setFilterEmployeeId] = useState("");
//   const [isManualEntryModalOpen, setManualEntryModalOpen] = useState(false);
//   const [manualEntryData, setManualEntryData] = useState({
//     status: 'Present',
//     checkIn: '',
//     checkOut: '',
//     breakStart: '',
//     breakEnd: '',
//     remark: '',
//   });

//   // Helper to calculate total work time between checkIn and checkOut
//   const calculateWorkDuration = (checkIn, checkOut) => {
//     if (!checkIn || !checkOut) return "-";
//     const start = new Date(checkIn);
//     const end = new Date(checkOut);
//     if (isNaN(start) || isNaN(end) || end <= start) return "-";
//     const totalMs = end - start;
//     const hrs = Math.floor(totalMs / 3600000);
//     const mins = Math.floor((totalMs % 3600000) / 60000);
//     return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
//   };

//   // Helper to calculate total break time
//   const calculateTotalBreak = (breaks = []) => {
//     if (!breaks || breaks.length === 0) return "-";

//     const totalMs = breaks.reduce((acc, b) => {
//       if (b.start && b.end) {
//         return acc + (new Date(b.end) - new Date(b.start));
//       }
//       return acc;
//     }, 0);

//     const minutes = Math.floor(totalMs / 60000);
//     return `${minutes} min`;
//   };

//   // Helper: robust half-day detection from attendance record
//   const isHalfDayRecord = (attendance) => {
//     if (!attendance) return false;
//     const v = ((attendance.status || attendance.remark || '') + '').toString().toLowerCase();
//     return v.includes('half');
//   };

//   useEffect(() => {
//     const loadAllEmployees = async () => {
//       try {
//         const res = await API.get("/admin/employees");
//         setAllEmployees(res.data || []);
//       } catch (err) {
//         console.log("Failed to load employees");
//       }
//     };
//     loadAllEmployees();
//   }, []);

//   useEffect(() => {
//     const fetchEmployeeAttendance = async (date) => {
//       setLoading(true);
//       try {
//         const formattedDate = dayjs(date).format("YYYY-MM-DD");
//         // 1. Fetch all employees under the current admin's scope
//         const employeesRes = await API.get("/admin/employees");
//         const allEmployees = employeesRes.data;

//         // 2. Fetch attendance for the selected date
//         const attendanceRes = await API.get(`/attendance?date=${formattedDate}`);
//         // API may return either an array or an object { settings, records }
//         const attendanceArray = Array.isArray(attendanceRes.data)
//           ? attendanceRes.data
//           : (attendanceRes.data?.records || []);
//         const attendanceMap = new Map(attendanceArray.map(att => [att.user?._id, att]));

//         // 3. Merge the two lists
//         const mergedRecords = allEmployees.map(emp => {
//           const attendance = attendanceMap.get(emp._id);
//           if (attendance) {
//             // Employee has an attendance record
//             return {
//               id: emp._id,
//               name: emp.name,
//               Department: emp.department || "-",
//               role: emp.position || "-",
//               email: emp.email,
//               phone: emp.phone,
//               breaks: attendance.breaks || [],
//               avgCheckIn: attendance.checkIn ? dayjs(attendance.checkIn).format("HH:mm") : "-",
//               avgCheckOut: attendance.checkOut ? dayjs(attendance.checkOut).format("HH:mm") : "-",
//               status: attendance.status || "Present", // Default to Present if record exists
//               totalBreakTime: calculateTotalBreak(attendance.breaks),
//               totalWorkTime: calculateWorkDuration(attendance.checkIn, attendance.checkOut),
//               remark: attendance.remark, // Pass remark for editing
//               halfDayCount: isHalfDayRecord(attendance) ? 1 : 0,
//             };
//           } else {
//             // Employee is absent
//             return { ...emp, id: emp._id, status: "Absent", avgCheckIn: "-", avgCheckOut: "-", totalWorkTime: "-", halfDayCount: 0 };
//           }
//         });

//         setEmployeeRecords(mergedRecords);
//         setError("");
//       } catch (err) {
//         setError(err.response?.data?.message || "Failed to fetch employee attendance");
//         toast.error(err.response?.data?.message || "Failed to fetch employee attendance");
//       } finally {
//         setLoading(false);
//       }
//     };

//     const fetchAdminAttendance = async (date) => {
//       setLoading(true);
//       try {
//         // 1. Fetch all sub-admins (HRs/Managers)
//         const subAdminsRes = await API.get("/admin/sub-admins"); // This should be scoped by backend
//         const allSubAdmins = subAdminsRes.data;

//         // 2. Fetch all admin attendance records for the day
//         const formattedDate = dayjs(date).format("YYYY-MM-DD");
//         const attendanceRes = await API.get(`/attendance/admin/all?date=${formattedDate}`);
//         const attendanceArray = Array.isArray(attendanceRes.data)
//           ? attendanceRes.data
//           : (attendanceRes.data?.records || []);
//         const attendanceMap = new Map(attendanceArray.map(att => [att.user?._id, att]));

//         // 3. Merge the two lists
//         const mergedRecords = allSubAdmins.map(admin => {
//           const attendance = attendanceMap.get(admin._id);
//           if (attendance) {
//             return {
//               ...admin,
//               id: admin._id,
//               breaks: attendance.breaks || [],
//               avgCheckIn: attendance.checkIn ? dayjs(attendance.checkIn).format("HH:mm") : "-",
//               avgCheckOut: attendance.checkOut ? dayjs(attendance.checkOut).format("HH:mm") : "-",
//               status: attendance.status || "Present",
//               totalBreakTime: calculateTotalBreak(attendance.breaks),
//               totalWorkTime: calculateWorkDuration(attendance.checkIn, attendance.checkOut),
//               halfDayCount: isHalfDayRecord(attendance) ? 1 : 0,
//             };
//           } else {
//             return { ...admin, id: admin._id, status: "Absent", avgCheckIn: "-", avgCheckOut: "-", totalWorkTime: "-", halfDayCount: 0 };
//           }
//         });
//         setAdminRecords(mergedRecords);
//         setError("");
//       } catch (err) {
//         setError(err.response?.data?.message || "Failed to fetch HR/Manager attendance");
//         toast.error(err.response?.data?.message || "Failed to fetch HR/Manager attendance");
//       } finally {
//         setLoading(false);
//       }
//     };

//     if (activeTab === 'employees') {
//       fetchEmployeeAttendance(selectedDate);
//     } else {
//       fetchAdminAttendance(selectedDate); // Pass selectedDate as an argument
//     }
//   }, [selectedDate, activeTab]);

//   const handleDateChange = (e) => {
//     setSelectedDate(dayjs(e.target.value).toDate());
//   };

//   const handleManualEntryChange = (e) => {
//     const { name, value } = e.target;
//     setManualEntryData(prev => ({ ...prev, [name]: value }));
//   };

//   const handleOpenManualEntryModal = () => {
//     if (!filterEmployeeId) return;

//     const record = employeeRecords.find(rec => rec.id === filterEmployeeId);

//     if (record && record.status !== 'Absent') {
//       const firstBreak = record.breaks && record.breaks.length > 0 ? record.breaks[0] : {};
//       setManualEntryData({
//         status: record.status || 'Present',
//         checkIn: record.avgCheckIn !== '-' ? record.avgCheckIn : '',
//         checkOut: record.avgCheckOut !== '-' ? record.avgCheckOut : '',
//         breakStart: firstBreak.start ? dayjs(firstBreak.start).format('HH:mm') : '',
//         breakEnd: firstBreak.end ? dayjs(firstBreak.end).format('HH:mm') : '',
//         remark: record.remark || '',
//       });
//     } else {
//       // Reset for a new entry (or absent employee)
//       setManualEntryData({
//         status: 'Present',
//         checkIn: '',
//         checkOut: '',
//         breakStart: '',
//         breakEnd: '',
//         remark: '',
//       });
//     }
//     setManualEntryModalOpen(true);
//   };

//   const handleManualAttendanceSubmit = async (e) => {
//     e.preventDefault();
//     if (!filterEmployeeId || !manualEntryData.status) {
//       toast.error("Please select an employee and a status.");
//       return;
//     }

//     const date = dayjs(selectedDate).format("YYYY-MM-DD");
//     const payload = {
//       userId: filterEmployeeId,
//       date: date,
//       status: manualEntryData.status,
//       remark: manualEntryData.remark || `Manually set to ${manualEntryData.status} by admin`,
//       checkIn: manualEntryData.checkIn ? `${date}T${manualEntryData.checkIn}:00` : null,
//       checkOut: manualEntryData.checkOut ? `${date}T${manualEntryData.checkOut}:00` : null,
//       breaks: (manualEntryData.breakStart && manualEntryData.breakEnd) ? [{
//         start: `${date}T${manualEntryData.breakStart}:00`,
//         end: `${date}T${manualEntryData.breakEnd}:00`,
//       }] : [],
//     };

//     try {
//       const toastId = toast.loading("Submitting attendance...");
//       await API.post("/attendance/manual", payload);

//       toast.success("Attendance marked successfully!", { id: toastId });
//       setManualEntryModalOpen(false);

//       // Refresh data for the current view
//       if (activeTab === 'employees') {
//         // Re-trigger the useEffect for fetching data
//         setSelectedDate(new Date(selectedDate.getTime()));
//       } else {
//         // If you implement manual attendance for admins, refresh here too
//       }
//     } catch (err) {
//       toast.error(err.response?.data?.message || "Failed to mark attendance.");
//       console.error("Manual attendance error:", err);
//     }
//   };

//   const currentRecords = activeTab === 'employees' ? employeeRecords : adminRecords;

//   const attendanceSummary = [
//     { title: "Total", value: currentRecords.length, icon: <People className="text-blue-500" /> },
//     { title: "Present", value: currentRecords.filter((e) => e.status === "Present").length, icon: <CheckCircle className="text-green-500" /> },
//     { title: "Absent", value: currentRecords.filter((e) => e.status === "Absent").length, icon: <Cancel className="text-red-500" /> },
//     { title: "Late", value: currentRecords.filter((e) => e.status === "Late" || e.status === "Late Login").length, icon: <AccessTime className="text-yellow-500" /> },
//     { title: "Half Days", value: currentRecords.filter((e) => Number(e.halfDayCount) === 1).length, icon: <CalendarMonth className="text-indigo-500" /> },
//   ];

//   return (
//     <div className="min-h-screen p-6">
//       <Toaster />
//       {/* --- Responsive Header --- */}
//       <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
//         <h1 className="text-2xl md:text-3xl font-bold text-center md:text-left">📅 Attendance Tracker</h1>
//         <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-4">
//           <div className="flex-1">
//             <label htmlFor="employee-filter" className="text-sm font-medium sr-only md:not-sr-only md:mr-2">Employee:</label>
//             <select
//               id="employee-filter"
//               value={filterEmployeeId}
//               onChange={(e) => setFilterEmployeeId(e.target.value)}
//               className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:border-gray-600"
//             >
//               <option value="" className="text-black">All Employees</option>
//               {allEmployees.map((emp) => (
//                 <option key={emp._id} value={emp._id} className='text-black'>
//                   {emp.name} - {emp.position}
//                 </option>
//               ))}
//             </select>
//           </div>

//           <div className="flex-1">
//             <label htmlFor="date-filter" className="text-sm font-medium sr-only md:not-sr-only md:mr-2">Date:</label>
//             <input
//               id="date-filter"
//               type="date"
//               value={dayjs(selectedDate).format("YYYY-MM-DD")}
//               onChange={handleDateChange}
//               className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:border-gray-600"
//             />
//           </div>

//           <button
//             onClick={handleOpenManualEntryModal}
//             disabled={!filterEmployeeId || activeTab !== 'employees'}
//             className="w-full sm:w-auto px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
//           >
//             <EditCalendar fontSize="small" />
//             Mark Attendance
//           </button>
//         </div>
//       </div>

//       {error && (
//         <div className="border border-red-200 rounded-lg p-4 mb-4">
//           <p className="font-medium">{error}</p>
//           <button
//             onClick={() => window.location.reload()}
//             className="mt-2 px-4 py-1 rounded bg-red-500 text-white hover:bg-red-600"
//           >
//             Retry
//           </button>
//         </div>
//       )}

//       {/* Tabs */}
//       <div className="flex border-b border-gray-200 dark:border-gray-700 mb-6">
//         <button
//           onClick={() => setActiveTab('employees')}
//           className={`py-2 px-4 text-sm font-medium ${activeTab === 'employees' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-400'}`}
//         >
//           Employees
//         </button>
//         <button
//           onClick={() => setActiveTab('admins')}
//           className={`py-2 px-4 text-sm font-medium ${activeTab === 'admins' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-400'}`}
//         >
//           HR & Managers
//         </button>
//       </div>

//       {loading ? (
//         <div className="text-center py-8">
//           <p>Loading attendance data...</p>
//         </div>
//       ) : (
//         <>
//           {/* Summary Cards */}
//           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-6">
//             {attendanceSummary.map((summary, index) => (
//               <div key={index} className="shadow rounded-lg p-4 flex items-center gap-4">
//                 <div>{summary.icon}</div>
//                 <div>
//                   <h3 className="text-sm font-medium">{summary.title}</h3>
//                   <p className="text-2xl font-semibold">{summary.value}</p>
//                 </div>
//               </div>
//             ))}
//           </div>

//           {/* Attendance Table */}
//           <div className="shadow-lg rounded-lg overflow-hidden">
//             <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700">
//               <h3 className="text-xl font-semibold">{activeTab === 'employees' ? 'Employee Attendance' : 'HR & Manager Attendance'}</h3>
//               <p className="mt-1 text-sm text-gray-600">Total: {currentRecords.length} records</p>
//             </div>
//             <AttendanceTable
//               records={currentRecords}
//               loading={loading}
//               userType={activeTab === 'employees' ? 'employee' : 'admin'}
//               onRowClick={setSelectedEmployee}
//             />
//           </div>
//         </>
//       )}

//       {/* Employee Details Modal */}
//       {selectedEmployee && (
//         <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/50">
//           <div className="rounded-lg p-6 max-w-md w-full bg-white text-black dark:bg-gray-800 dark:text-white">
//             <div className="flex justify-between items-center mb-4">
//               <h2 className="text-xl font-bold">Details</h2>
//               <button onClick={() => setSelectedEmployee(null)} className="hover:text-gray-700">
//                 <Close fontSize="small" />
//               </button>
//             </div>
//             <div className="space-y-3">
//               <p><strong>Name:</strong> {selectedEmployee.name}</p>
//               {selectedEmployee.Department && <p><strong>Department:</strong> {selectedEmployee.Department}</p>}
//               <p><strong>Role:</strong> {selectedEmployee.role}</p>
//               {selectedEmployee.joinDate && <p><strong>Join Date:</strong> {selectedEmployee.joinDate}</p>}
//               <p className="flex items-center gap-2"><Email fontSize="small" /> <strong>Email:</strong> {selectedEmployee.email}</p>
//               {selectedEmployee.breaks?.length > 0 && (
//                 <div>
//                   <strong>Breaks:</strong>
//                   {selectedEmployee.breaks.map((b, i) => (
//                     <p key={i} className="ml-4 text-sm">Break {i + 1}: {dayjs(b.start).format("HH:mm")} - {b.end ? dayjs(b.end).format("HH:mm") : 'Active'}</p>
//                   ))}
//                 </div>
//               )}

//               {selectedEmployee.phone && <p className="flex items-center gap-2"><Phone fontSize="small" /> <strong>Phone:</strong> {selectedEmployee.phone}</p>}
//               <p><strong>Status:</strong> <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedEmployee.status)}`}>{selectedEmployee.status}</span></p>
//             </div>
//             <div className="mt-6 flex justify-end">
//               <button onClick={() => setSelectedEmployee(null)} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">Close</button>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Manual Attendance Entry Modal */}
//       {isManualEntryModalOpen && (
//         <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/50">
//           <div className="rounded-lg p-6 max-w-lg w-full bg-white text-black dark:bg-gray-800 dark:text-white">
//             <div className="flex justify-between items-center mb-4">
//               <h2 className="text-xl font-bold">Manual Attendance Entry</h2>
//               <button onClick={() => setManualEntryModalOpen(false)} className="hover:text-gray-700">
//                 <Close fontSize="small" />
//               </button>
//             </div>
//             <form onSubmit={handleManualAttendanceSubmit} className="space-y-4">
//               <div>
//                 <label className="block text-sm font-medium mb-1">Employee</label>
//                 <p className="p-2 bg-gray-100 dark:bg-gray-700 rounded-md">
//                   {allEmployees.find(e => e._id === filterEmployeeId)?.name || 'N/A'}
//                 </p>
//               </div>
//               <div>
//                 <label className="block text-sm font-medium mb-1">Date</label>
//                 <p className="p-2 bg-gray-100 dark:bg-gray-700 rounded-md">
//                   {dayjs(selectedDate).format("DD MMMM, YYYY")}
//                 </p>
//               </div>
//               <div>
//                 <label htmlFor="status" className="block text-sm font-medium mb-1">Status</label>
//                 <select name="status" id="status" required value={manualEntryData.status} onChange={handleManualEntryChange} className="w-full p-2 border rounded-lg dark:border-gray-600 ">
//                   <option value="Present" className='text-black'>Present</option>
//                   <option value="Late" className='text-black'>Late</option>
//                   <option value="Absent" className='text-black'>Absent</option>
//                   <option value="Half Day" className='text-black'>Half Day</option>
//                 </select>
//               </div>
//               <div className="grid grid-cols-2 gap-4">
//                 <div>
//                   <label htmlFor="checkIn" className="block text-sm font-medium mb-1">Check-in Time</label>
//                   <input type="time" name="checkIn" id="checkIn" value={manualEntryData.checkIn} onChange={handleManualEntryChange} className="w-full p-2 border rounded-lg dark:border-gray-600 " />
//                 </div>
//                 <div>
//                   <label htmlFor="checkOut" className="block text-sm font-medium mb-1">Check-out Time</label>
//                   <input type="time" name="checkOut" id="checkOut" value={manualEntryData.checkOut} onChange={handleManualEntryChange} className="w-full p-2 border rounded-lg dark:border-gray-600 " />
//                 </div>
//               </div>
//               <div className="grid grid-cols-2 gap-4">
//                 <div>
//                   <label htmlFor="breakStart" className="block text-sm font-medium mb-1">Break Start Time</label>
//                   <input type="time" name="breakStart" id="breakStart" value={manualEntryData.breakStart} onChange={handleManualEntryChange} className="w-full p-2 border rounded-lg dark:border-gray-600 " />
//                 </div>
//                 <div>
//                   <label htmlFor="breakEnd" className="block text-sm font-medium mb-1">Break End Time</label>
//                   <input type="time" name="breakEnd" id="breakEnd" value={manualEntryData.breakEnd} onChange={handleManualEntryChange} className="w-full p-2 border rounded-lg dark:border-gray-600 " />
//                 </div>
//               </div>
//               <div>
//                 <label htmlFor="remark" className="block text-sm font-medium mb-1">Remark (Optional)</label>
//                 <input type="text" name="remark" id="remark" placeholder="e.g., Manual entry by admin" value={manualEntryData.remark} onChange={handleManualEntryChange} className="w-full p-2 border rounded-lg dark:border-gray-600 " />
//               </div>
//               <div className="mt-6 flex justify-end gap-4">
//                 <button type="button" onClick={() => setManualEntryModalOpen(false)} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
//                 <button type="submit" className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700">Submit Attendance</button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// export default AttendanceTracker;




//new
// AttendanceTracker (updated) - replace your existing AttendanceTracker component file with this
import React, { useState, useEffect } from 'react';
import API from "../../utils/api";
import { Close, Email, Phone, Visibility, CalendarMonth, People, CheckCircle, Cancel, AccessTime, EditCalendar } from "@mui/icons-material";
import { Download } from 'lucide-react'; // Import Download icon
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
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1024px]">
        <thead>
          <tr className="bg-gray-300 text-black">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider rounded-tl-lg">Employee</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">{userType === 'employee' ? 'Department' : 'Role'}</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Check-In</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Check-Out</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Total Time</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">Total Break</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider rounded-tr-lg">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {records.map((record) => (
            <tr key={record.id} className="hover:bg-gray-300 hover:text-black dark:hover:bg-gray-300 dark:hover:text-black">
              <td className="px-4 py-4 whitespace-nowrap">
                <div className="text-sm font-medium">{record.name || record.user?.name}</div>
                <div className="text-sm text-gray-500">{record.email || record.user?.email}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm">{userType === 'employee' ? record.Department : (record.role || "-").toUpperCase()}</td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(record.status)}`}>
                  {record.status}
                </span>
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm">{record.avgCheckIn}</td>
              <td className="px-4 py-4 whitespace-nowrap text-sm">{record.avgCheckOut}</td>
              <td className="px-4 py-4 whitespace-nowrap text-sm">{record.totalWorkTime || "-"}</td>
              <td className="px-4 py-4 whitespace-nowrap text-sm">
                {record.totalBreakTime || "-"}
              </td>

              <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
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
  const [allEmployees, setAllEmployees] = useState([]);
  const [filterEmployeeId, setFilterEmployeeId] = useState("");
  const [isManualEntryModalOpen, setManualEntryModalOpen] = useState(false);
  const [manualEntryData, setManualEntryData] = useState({
    status: 'Present',
    checkIn: '',
    checkOut: '',
    // breaks is now array of { start: "HH:mm", end: "HH:mm" }
    breaks: [],
    remark: '',
  });

  // Helper to calculate total work time between checkIn and checkOut
  const calculateWorkDuration = (checkIn, checkOut) => {
    if (!checkIn || !checkOut) return "-";
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    if (isNaN(start) || isNaN(end) || end <= start) return "-";
    const totalMs = end - start;
    const hrs = Math.floor(totalMs / 3600000);
    const mins = Math.floor((totalMs % 3600000) / 60000);
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  // Helper to calculate total break time
  const calculateTotalBreak = (breaks = []) => {
  if (!Array.isArray(breaks) || breaks.length === 0) return "-";

  let totalMs = 0;

  breaks.forEach(b => {
    if (!b.start || !b.end) return;

    const start = new Date(b.start);
    const end = new Date(b.end);

    if (!isNaN(start) && !isNaN(end) && end > start) {
      totalMs += (end - start);
    }
  });

  const minutes = Math.floor(totalMs / 60000);
  return `${minutes} min`;
};

  // Helper: robust half-day detection from attendance record
  const isHalfDayRecord = (attendance) => {
    if (!attendance) return false;
    const v = ((attendance.status || attendance.remark || '') + '').toString().toLowerCase();
    return v.includes('half');
  };

  useEffect(() => {
    const loadAllEmployees = async () => {
      try {
        const res = await API.get("/admin/employees");
        setAllEmployees(res.data || []);
      } catch (err) {
        console.log("Failed to load employees");
      }
    };
    loadAllEmployees();
  }, []);

  useEffect(() => {
    const fetchEmployeeAttendance = async (date) => {
      setLoading(true);
      try {
        const formattedDate = dayjs(date).format("YYYY-MM-DD");
        // 1. Fetch all employees under the current admin's scope
        const employeesRes = await API.get("/admin/employees");
        const allEmployees = employeesRes.data;

        // 2. Fetch attendance for the selected date
        const attendanceRes = await API.get(`/attendance?date=${formattedDate}`);
        // API may return either an array or an object { settings, records }
        const attendanceArray = Array.isArray(attendanceRes.data)
          ? attendanceRes.data
          : (attendanceRes.data?.records || []);
        const attendanceMap = new Map(attendanceArray.map(att => [String(att.user?._id || att.user), att]));

        // 3. Merge the two lists
        const mergedRecords = allEmployees.map(emp => {
          const attendance = attendanceMap.get(String(emp._id));
          if (attendance) {
            return {
              id: emp._id,
              name: emp.name,
              Department: emp.department || "-",
              role: emp.position || "-",
              email: emp.email,
              phone: emp.phone,
              breaks: attendance.breaks || [],
              avgCheckIn: attendance.checkIn ? dayjs(attendance.checkIn).format("HH:mm") : "-",
              avgCheckOut: attendance.checkOut ? dayjs(attendance.checkOut).format("HH:mm") : "-",
              status: attendance.status || "Present",
              totalBreakTime: calculateTotalBreak(attendance.breaks),
              totalWorkTime: calculateWorkDuration(attendance.checkIn, attendance.checkOut),
              remark: attendance.remark,
              halfDayCount: isHalfDayRecord(attendance) ? 1 : 0,
            };
          } else {
            return { ...emp, id: emp._id, status: "Absent", avgCheckIn: "-", avgCheckOut: "-", totalWorkTime: "-", halfDayCount: 0, breaks: [] };
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
        const subAdminsRes = await API.get("/admin/sub-admins");
        const allSubAdmins = subAdminsRes.data;

        const formattedDate = dayjs(date).format("YYYY-MM-DD");
        const attendanceRes = await API.get(`/attendance/admin/all?date=${formattedDate}`);
        const attendanceArray = Array.isArray(attendanceRes.data)
          ? attendanceRes.data
          : (attendanceRes.data?.records || []);
        const attendanceMap = new Map(attendanceArray.map(att => [String(att.user?._id || att.user), att]));

        const mergedRecords = allSubAdmins.map(admin => {
          const attendance = attendanceMap.get(String(admin._id));
          if (attendance) {
            return {
              ...admin,
              id: admin._id,
              breaks: attendance.breaks || [],
              avgCheckIn: attendance.checkIn ? dayjs(attendance.checkIn).format("HH:mm") : "-",
              avgCheckOut: attendance.checkOut ? dayjs(attendance.checkOut).format("HH:mm") : "-",
              status: attendance.status || "Present",
              totalBreakTime: calculateTotalBreak(attendance.breaks),
              totalWorkTime: calculateWorkDuration(attendance.checkIn, attendance.checkOut),
              halfDayCount: isHalfDayRecord(attendance) ? 1 : 0,
            };
          } else {
            return { ...admin, id: admin._id, status: "Absent", avgCheckIn: "-", avgCheckOut: "-", totalWorkTime: "-", halfDayCount: 0, breaks: [] };
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
      fetchAdminAttendance(selectedDate);
    }
  }, [selectedDate, activeTab]);

  const handleDateChange = (e) => {
    setSelectedDate(dayjs(e.target.value).toDate());
  };

  // generic field change for manual entry (non-break fields)
  const handleManualEntryChange = (e) => {
    const { name, value } = e.target;
    setManualEntryData(prev => ({ ...prev, [name]: value }));
  };

  // BREAKS handlers
  const handleBreakChange = (index, field, value) => {
    setManualEntryData(prev => {
      const next = { ...prev };
      next.breaks = Array.isArray(next.breaks) ? [...next.breaks] : [];
      next.breaks[index] = { ...(next.breaks[index] || {}), [field]: value };
      return next;
    });
  };

  const addBreakRow = () => {
    setManualEntryData(prev => ({ ...prev, breaks: [...(prev.breaks || []), { start: '', end: '' }] }));
  };

  const removeBreakRow = (index) => {
    setManualEntryData(prev => {
      const next = { ...prev };
      next.breaks = (next.breaks || []).filter((_, i) => i !== index);
      return next;
    });
  };

  const handleOpenManualEntryModal = () => {
    if (!filterEmployeeId) return;

    const record = employeeRecords.find(rec => String(rec.id) === String(filterEmployeeId));

    if (record && record.status !== 'Absent') {
      // map all breaks into HH:mm strings (use countedEnd or end if present)
      const mappedBreaks = (record.breaks || []).map(b => ({
        start: b.start ? dayjs(b.start).format('HH:mm') : '',
        end: b.end ? dayjs(b.end).format('HH:mm') : ''
      }));

      setManualEntryData({
        status: record.status || 'Present',
        checkIn: record.avgCheckIn !== '-' ? record.avgCheckIn : '',
        checkOut: record.avgCheckOut !== '-' ? record.avgCheckOut : '',
        breaks: mappedBreaks.length > 0 ? mappedBreaks : [],
        remark: record.remark || '',
      });
    } else {
      // Reset for a new entry (or absent employee)
      setManualEntryData({
        status: 'Present',
        checkIn: '',
        checkOut: '',
        breaks: [],
        remark: '',
      });
    }
    setManualEntryModalOpen(true);
  };

  const handleManualAttendanceSubmit = async (e) => {
    e.preventDefault();
    if (!filterEmployeeId || !manualEntryData.status) {
      toast.error("Please select an employee and a status.");
      return;
    }

    const date = dayjs(selectedDate).format("YYYY-MM-DD");

    // build breaks array: only include valid rows (both start and end)
    const payloadBreaks = (manualEntryData.breaks || []).map(b => {
      const start = b.start ? `${date}T${b.start}:00` : null;
      const end = b.end ? `${date}T${b.end}:00` : null;
      return { start, end };
    }).filter(b => b.start && b.end);

    const payload = {
      userId: filterEmployeeId,
      date: date,
      status: manualEntryData.status,
      remark: manualEntryData.remark || `Manually set to ${manualEntryData.status} by admin`,
      checkIn: manualEntryData.checkIn ? `${date}T${manualEntryData.checkIn}:00` : null,
      checkOut: manualEntryData.checkOut ? `${date}T${manualEntryData.checkOut}:00` : null,
      breaks: payloadBreaks
    };

    try {
      const toastId = toast.loading("Submitting attendance...");
      await API.post("/attendance/manual", payload);

      toast.success("Attendance marked successfully!", { id: toastId });
      setManualEntryModalOpen(false);

      // Refresh data for the current view
      if (activeTab === 'employees') {
        setSelectedDate(new Date(selectedDate.getTime()));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to mark attendance.");
      console.error("Manual attendance error:", err);
    }
  };

  // ⭐ New Feature: Export to Excel
  const handleExportToExcel = () => {
    if (currentRecords.length === 0) {
      toast.error("No data available to export.");
      return;
    }

    // Dynamically import the library to reduce initial bundle size
    import('xlsx-js-style').then(XLSX => {
      // 1. Format data for the worksheet
      const dataToExport = currentRecords.map(rec => ({
        "Employee Name": rec.name,
        "Email": rec.email,
        "Role": rec.role,
        "Status": rec.status,
        "Check-In": rec.avgCheckIn,
        "Check-Out": rec.avgCheckOut,
        "Work Duration": rec.totalWorkTime,
        "Break Duration": rec.totalBreakTime,
        "Remark": rec.remark || ''
      }));

      // 2. Create a new worksheet
      const ws = XLSX.utils.json_to_sheet(dataToExport);

      // 3. Style the header row
      const headerStyle = {
        font: { bold: true, color: { rgb: "FFFFFFFF" } },
        fill: { fgColor: { rgb: "FF4F81BD" } } // A nice blue color
      };

      const range = XLSX.utils.decode_range(ws['!ref']);
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const addr = XLSX.utils.encode_cell({ r: 0, c: C });
        if (!ws[addr]) continue;
        ws[addr].s = headerStyle;
      }

      // 4. Set column widths
      ws['!cols'] = [
        { wch: 25 }, // Employee Name
        { wch: 30 }, // Email
        { wch: 15 }, // Role
        { wch: 12 }, // Status
        { wch: 12 }, // Check-In
        { wch: 12 }, // Check-Out
        { wch: 15 }, // Work Duration
        { wch: 15 }, // Break Duration
        { wch: 30 }, // Remark
      ];

      // 5. Create a workbook and trigger download
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Attendance");
      const fileName = `Attendance_${activeTab}_${dayjs(selectedDate).format("YYYY-MM-DD")}.xlsx`;
      XLSX.writeFile(wb, fileName);
    });
  };

  const currentRecords = activeTab === 'employees' ? employeeRecords : adminRecords;

  const attendanceSummary = [
    { title: "Total", value: currentRecords.length, icon: <People className="text-blue-500" /> },
    { title: "Present", value: currentRecords.filter((e) => e.status === "Present").length, icon: <CheckCircle className="text-green-500" /> },
    { title: "Absent", value: currentRecords.filter((e) => e.status === "Absent").length, icon: <Cancel className="text-red-500" /> },
    { title: "Late", value: currentRecords.filter((e) => e.status === "Late" || e.status === "Late Login").length, icon: <AccessTime className="text-yellow-500" /> },
    { title: "Half Days", value: currentRecords.filter((e) => Number(e.halfDayCount) === 1).length, icon: <CalendarMonth className="text-indigo-500" /> },
  ];

  return (
    <div className="min-h-screen p-6">
      <Toaster />
      {/* --- Responsive Header --- */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
        <h1 className="text-2xl md:text-3xl font-bold text-center md:text-left">📅 Attendance Tracker</h1>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-center gap-4">
          <div className="flex-1">
            <label htmlFor="employee-filter" className="text-sm font-medium sr-only md:not-sr-only md:mr-2">Employee:</label>
            <select
              id="employee-filter"
              value={filterEmployeeId}
              onChange={(e) => setFilterEmployeeId(e.target.value)}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:border-gray-600"
            >
              <option value="" className="text-black">All Employees</option>
              {allEmployees.map((emp) => (
                <option key={emp._id} value={emp._id} className='text-black'>
                  {emp.name} - {emp.position}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label htmlFor="date-filter" className="text-sm font-medium sr-only md:not-sr-only md:mr-2">Date:</label>
            <input
              id="date-filter"
              type="date"
              value={dayjs(selectedDate).format("YYYY-MM-DD")}
              onChange={handleDateChange}
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:border-gray-600"
            />
          </div>

          <button
            onClick={handleOpenManualEntryModal}
            disabled={!filterEmployeeId || activeTab !== 'employees'}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <EditCalendar fontSize="small" />
            Mark Attendance
          </button>

          <button
            onClick={handleExportToExcel}
            className="w-full sm:w-auto px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 flex items-center justify-center gap-2"
          >
            <Download size={18} />
            Export
          </button>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-6">
            {attendanceSummary.map((summary, index) => (
              <div key={index} className="shadow rounded-lg p-4 flex items-center gap-4">
                <div>{summary.icon}</div>
                <div>
                  <h3 className="text-sm font-medium">{summary.title}</h3>
                  <p className="text-2xl font-semibold">{summary.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Attendance Table */}
          <div className="shadow-lg rounded-lg overflow-hidden">
            <div className="p-4 md:p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-semibold">{activeTab === 'employees' ? 'Employee Attendance' : 'HR & Manager Attendance'}</h3>
              <p className="mt-1 text-sm text-gray-600">Total: {currentRecords.length} records</p>
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
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/50">
          <div className="rounded-lg p-6 max-w-md w-full bg-white text-black dark:bg-gray-800 dark:text-white">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Details</h2>
              <button onClick={() => setSelectedEmployee(null)} className="hover:text-gray-700">
                <Close fontSize="small" className='hover:text-red-800' />
              </button>
            </div>
            <div className="space-y-3">
              <p><strong>Name:</strong> {selectedEmployee.name}</p>
              {selectedEmployee.Department && <p><strong>Department:</strong> {selectedEmployee.Department}</p>}
              <p><strong>Role:</strong> {selectedEmployee.role}</p>
              {selectedEmployee.joinDate && <p><strong>Join Date:</strong> {selectedEmployee.joinDate}</p>}
              <p className="flex items-center gap-2"><Email fontSize="small" /> <strong>Email:</strong> {selectedEmployee.email}</p>
              {selectedEmployee.breaks?.length > 0 && (
                <div>
                  <strong>Breaks:</strong>

                  {selectedEmployee.breaks.map((b, i) => {
                    const start = b.start ? dayjs(b.start).format("HH:mm") : "-";

                    const actualEnd = b.end ? dayjs(b.end).format("HH:mm") : "Active";

                    const actualMin = b.end ?
                      Math.floor((new Date(b.end) - new Date(b.start)) / 60000) : 0;

                    return (
                      <p key={i} className="ml-4 text-sm">
                        <strong>Break {i + 1}:</strong> {start} - {actualEnd}
                        <span className="text-blue-500 ml-2">({actualMin} min used)</span>
                        {"  "}
                        {b.exceeded && <span className="text-yellow-500 font-semibold">(Exceeded)</span>}
                      </p>
                    );
                  })}
                </div>
              )}



              {selectedEmployee.phone && <p className="flex items-center gap-2"><Phone fontSize="small" /> <strong>Phone:</strong> {selectedEmployee.phone}</p>}
              <p><strong>Status:</strong> <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedEmployee.status)}`}>{selectedEmployee.status}</span></p>
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={() => setSelectedEmployee(null)} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Attendance Entry Modal (Scrollable + Multiple Breaks) */}
      {isManualEntryModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4 bg-black/50">

          {/* ✨ MAIN MODAL BOX (Scrollable Container Inside) */}
          <div className="bg-white dark:bg-gray-800 text-black dark:text-white rounded-lg w-full max-w-lg shadow-xl 
                max-h-[90vh] overflow-hidden flex flex-col">

            {/* 🔹 HEADER (Fixed) */}
            <div className="flex justify-between items-center p-4 border-b border-gray-300">
              <h2 className="text-xl font-bold">Manual Attendance Entry</h2>
              <button onClick={() => setManualEntryModalOpen(false)} className="hover:text-red-800">
                <Close fontSize="small" />
              </button>
            </div>

            {/* 🔹 SCROLLABLE CONTENT AREA */}
            <div className="overflow-y-auto p-4 space-y-4 flex-1">

              <form onSubmit={handleManualAttendanceSubmit} id="manualEntryForm" className="space-y-4">

                {/* Employee */}
                <div>
                  <label className="block text-sm font-medium mb-1">Employee</label>
                  <p className="p-2 bg-gray-100 dark:bg-gray-700 rounded-md">
                    {allEmployees.find(e => e._id === filterEmployeeId)?.name || 'N/A'}
                  </p>
                </div>

                {/* Date */}
                <div>
                  <label className="block text-sm font-medium mb-1">Date</label>
                  <p className="p-2 bg-gray-100 dark:bg-gray-700 rounded-md">
                    {dayjs(selectedDate).format("DD MMMM, YYYY")}
                  </p>
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    name="status"
                    value={manualEntryData.status}
                    onChange={handleManualEntryChange}
                    className="w-full p-2 border rounded-lg dark:border-gray-600"
                    required
                  >
                    <option value="Present" className="text-black">Present</option>
                    <option value="Late" className="text-black">Late</option>
                    <option value="Absent" className="text-black">Absent</option>
                    <option value="Half Day" className="text-black">Half Day</option>
                  </select>
                </div>

                {/* Checkin/Checkout */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Check-in Time</label>
                    <input
                      type="time"
                      name="checkIn"
                      value={manualEntryData.checkIn}
                      onChange={handleManualEntryChange}
                      className="w-full p-2 border rounded-lg dark:border-gray-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Check-out Time</label>
                    <input
                      type="time"
                      name="checkOut"
                      value={manualEntryData.checkOut}
                      onChange={handleManualEntryChange}
                      className="w-full p-2 border rounded-lg dark:border-gray-600"
                    />
                  </div>
                </div>

                {/* ⭐ MULTIPLE BREAKS SECTION */}
                <div>
                  <label className="block text-sm font-medium mb-2">Breaks</label>

                  <div className="space-y-2">
                    {manualEntryData.breaks && manualEntryData.breaks.length > 0 ? (
                      manualEntryData.breaks.map((br, idx) => (
                        <div key={idx} className="grid grid-cols-3 gap-2 items-center">

                          <input
                            type="time"
                            value={br.start || ""}
                            onChange={(e) => handleBreakChange(idx, "start", e.target.value)}
                            className="p-2 border rounded-lg dark:border-gray-600"
                          />

                          <input
                            type="time"
                            value={br.end || ""}
                            onChange={(e) => handleBreakChange(idx, "end", e.target.value)}
                            className="p-2 border rounded-lg dark:border-gray-600"
                          />

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => removeBreakRow(idx)}
                              className="px-2 py-1 rounded bg-red-200 hover:bg-red-300 text-sm text-red-950"
                            >
                              Remove
                            </button>

                            {idx === manualEntryData.breaks.length - 1 && (
                              <button
                                type="button"
                                onClick={addBreakRow}
                                className="px-2 py-1 rounded bg-green-200 hover:bg-green-300 text-sm text-green-950"
                              >
                                Add
                              </button>
                            )}
                          </div>

                        </div>
                      ))
                    ) : (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={addBreakRow}
                          className="px-4 py-2 rounded bg-green-500 text-white hover:bg-green-600"
                        >
                          Add Break
                        </button>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-gray-500 mt-1">
                    Only breaks with both start and end will be saved.
                  </p>
                </div>

                {/* Remark */}
                <div>
                  <label className="block text-sm font-medium mb-1">Remark (Optional)</label>
                  <input
                    type="text"
                    name="remark"
                    value={manualEntryData.remark}
                    onChange={handleManualEntryChange}
                    className="w-full p-2 border rounded-lg dark:border-gray-600"
                    placeholder="e.g., Manual entry by admin"
                  />
                </div>

              </form>
            </div>

            {/* 🔹 FOOTER (Fixed) */}
            <div className="p-4 border-t flex justify-end gap-4 bg-white dark:bg-gray-800">
              <button
                type="button"
                onClick={() => setManualEntryModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
              >
                Cancel
              </button>

              <button
                type="submit"
                form="manualEntryForm"
                className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Submit Attendance
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

export default AttendanceTracker;
