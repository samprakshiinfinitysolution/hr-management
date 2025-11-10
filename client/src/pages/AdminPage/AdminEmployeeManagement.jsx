import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../../utils/api";
import toast, { Toaster } from "react-hot-toast";
import { BsThreeDotsVertical, BsPencil, BsEye, BsTrash } from "react-icons/bs";
import { Close, Email, Phone } from "@mui/icons-material";

const initialFormState = {
  name: "",
  email: "",
  phone: "",
  position: "",
  salary: "",
  password: "",
  address: "",
  department: "",
  jobType: "",
  emergencyName: "",
  emergencyRelation: "",
  emergencyNumber: "",
  birthday: "",
  image: "",
  highestQualification: "",
  yearOfPassing: "",
  accountHolder: "",
  accountNumber: "",
  ifsc: "",
  bankName: "",
  idType: "",
  idNumber: "",
  alternateNumber: "",
};

export default function AdminEmpManagement() {
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(initialFormState);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [dropdownId, setDropdownId] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const navigate = useNavigate();
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
  const [employeeToDeleteId, setEmployeeToDeleteId] = useState(null);
  const [countdown, setCountdown] = useState(5);
  const isDarkMode = false; // 🐞 FIX: isDarkMode is not defined. Define it here. Ideally, this comes from a theme context.
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (showConfirmationModal && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
    if (!showConfirmationModal) {
      setCountdown(5); // Reset countdown when modal is closed
    }
  }, [showConfirmationModal, countdown]);

  // बाहर क्लिक करने पर ड्रॉपडाउन बंद करने के लिए
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownId(null);
      }
    };

    if (dropdownId) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownId]);


  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      console.log("🔄 Fetching employees from /admin/employees...");
      const res = await API.get("/admin/employees");
      console.log("✅ Employees Response:", res.data);
      setEmployees(Array.isArray(res.data) ? res.data : []);
      setError("");
    } catch (err) {
      console.error("❌ Fetch Employees Error:", {
        status: err.response?.status,
        message: err.response?.data?.message || err.message,
        url: err.response?.config?.url,
      });
      setError(`Error fetching employees: ${err.response?.data?.message || err.message}`);
      if (err.response?.status === 401) {
        setTimeout(() => navigate("/admin-login"), 2000);
      }
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      console.log("📤 Submitting to:", editingId ? `/admin/employee/${editingId}` : "/admin/employee", "Data:", form);
      const requestData = { ...form };
      if (editingId) {
        const res = await API.put(`/admin/employee/${editingId}`, requestData);
        console.log("✅ Employee updated:", res.data);
        toast.success("Employee updated successfully");
      } else {
        const res = await API.post("/admin/employee", requestData);
        console.log("✅ Employee added:", res.data);
        toast.success("Employee added successfully");
      }
      setForm(initialFormState);
      setEditingId(null);
      fetchEmployees();
    } catch (err) {
      console.error("❌ Submit Error:", err.response ? err.response.data : err.message);
      setError(err.response?.data?.message || "Error saving employee. Check console for details.");
    }
  };

  const handleEdit = (emp) => {
    setForm(emp);
    setEditingId(emp._id);
    setDropdownId(null);
  };

  const handleView = (emp) => {
    setSelectedEmployee(emp);
    setDropdownId(null);
  };

  const toggleDropdown = (id) => {
    setDropdownId(dropdownId === id ? null : id);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <Toaster />
      <h1 className="text-2xl font-bold mb-6">👨‍💼 Employee Management</h1>
      {error && (
        <div className=" border border-red-200 rounded-lg p-4 mb-4">
          <p className="text-red-600 font-medium">{error}</p>
          <button
            onClick={fetchEmployees}
            className="mt-2 bg-red-500  px-4 py-1 rounded hover:bg-red-600"
          >
            Retry
          </button>
        </div>
      )}

      <form
  onSubmit={handleSubmit}
  className="mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 rounded-lg shadow"
>
  <input
    type="text"
    name="name"
    placeholder="Name"
    value={form.name}
    onChange={handleChange}
    className={`border p-2 rounded-md ${
      isDarkMode ? "placeholder-gray-300" : " placeholder-gray-500"
    }`}
    required
  />

  <input
    type="email"
    name="email"
    placeholder="Email"
    value={form.email}
    onChange={handleChange}
    className={`border p-2 rounded-md ${
      isDarkMode ? "placeholder-gray-300" : "placeholder-gray-500"
    }`}
    required
  />

  <input
    type="tel"
    name="phone"
    placeholder="Phone"
    value={form.phone}
    onChange={handleChange}
    maxLength={10}
    minLength={10}
    className={`border p-2 rounded-md ${
      isDarkMode ? " placeholder-gray-300" : " placeholder-gray-500"
    }`}
    required
  />

  <input
    type="text"
    name="position"
    placeholder="Position"
    value={form.position}
    onChange={handleChange}
    className={`border p-2 rounded-md ${
      isDarkMode ? "placeholder-gray-300" : " placeholder-gray-500"
    }`}
    required
  />

  <input
    type="tel"
    name="salary"
    placeholder="Salary"
    value={form.salary}
    onChange={handleChange}
    maxLength={6}
    className={`border p-2 rounded-md ${
      isDarkMode ? "placeholder-gray-300" : " placeholder-gray-500"
    }`}
  />

  <input
    type="password"
    name="password"
    placeholder="Password"
    value={form.password}
    onChange={handleChange}
    className={`border p-2 rounded-md ${
      isDarkMode ? "placeholder-gray-300" : " placeholder-gray-500"
    }`}
    required={!editingId}
  />

  <input
    type="text"
    name="department"
    placeholder="Department"
    value={form.department}
    onChange={handleChange}
    className={`border p-2 rounded-md ${
      isDarkMode ? "placeholder-gray-300" : " placeholder-gray-500"
    }`}
  />

  <input
    type="text"
    name="jobType"
    placeholder="Job Type"
    value={form.jobType}
    onChange={handleChange}
    className={`border p-2 rounded-md ${
      isDarkMode ? "placeholder-gray-300" : " placeholder-gray-500"
    }`}
  />

  <button
    type="submit"
    className="bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
  >
    {editingId ? "Update Employee" : "Add Employee"}
  </button>
</form>


      <div className="overflow-auto rounded-lg shadow max-h-[60vh]">
        <table className="w-full border-collapse">
          <thead className=" ">
            <tr className="bg-gray-300 text-black sticky top-0 z-10">
              <th className="p-3 text-left text-sm font-semibold whitespace-nowrap">ID</th>
              <th className="p-3 text-left text-sm font-semibold">Name</th>
              <th className="p-3 text-left text-sm font-semibold">Email</th>
              <th className="p-3 text-left text-sm font-semibold whitespace-nowrap">Phone</th>
              <th className="p-3 text-left text-sm font-semibold  whitespace-nowrap">Position</th>
              <th className="p-3 text-left text-sm font-semibold  whitespace-nowrap">Department</th>
              <th className="p-3 text-left text-sm font-semibold  whitespace-nowrap">Job Type</th>
              <th className="p-3 text-left text-sm font-semibold whitespace-nowrap">Salary</th>
              <th className="p-3 text-center text-sm font-semibold whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.length > 0 ? (
              employees.map((emp, index) => (
                <tr key={emp._id} className="border-b hover:text-black hover:bg-gray-300">
                  <td className="p-3 whitespace-nowrap text-sm text-gray-500">{`EMP${String(index + 1).padStart(3, '0')}`}</td>
                  <td className="p-3 break-words min-w-[150px]">
                    <Link to={`/admin/dashboard/employee/${emp._id}`} className="hover:underline font-medium text-blue-500 hover:text-blue-700">
                      {emp.name}
                    </Link>
                  </td>
                  <td className="p-3 break-words min-w-[200px] hover:text-black">{emp.email}</td>
                  <td className="p-3 whitespace-nowrap  hover:text-black">{emp.phone}</td>
                  <td className="p-3 whitespace-nowrap  hover:text-black">{emp.position}</td>
                  <td className="p-3 whitespace-nowrap  hover:text-black">{emp.department || "-"}</td>
                  <td className="p-3 whitespace-nowrap  hover:text-black">{emp.jobType || "-"}</td>
                  <td className="p-3 whitespace-nowrap  hover:text-black">{emp.salary || "-"}</td>
                  <td className="p-3 text-center relative">
                    <div ref={dropdownId === emp._id ? dropdownRef : null}>
                      <button
                        onClick={() => toggleDropdown(emp._id)}
                        className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                      >
                        <BsThreeDotsVertical size={18} />
                      </button>
                      {dropdownId === emp._id && (
                        <div className={`absolute right-0 w-40 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded-lg shadow-2xl z-20 ${index > employees.length - 3 ? 'bottom-full mb-2' : 'top-full mt-2'}`}>
                          <button
                            onClick={() => handleEdit(emp)}
                            className="flex items-center gap-3 w-full text-left px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <BsPencil size={16} /> Edit
                          </button>
                          <button
                            onClick={() => handleView(emp)}
                            className="flex items-center gap-3 w-full text-left px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <BsEye size={16} /> View
                          </button>
                          <button
                            onClick={() => { setEmployeeToDeleteId(emp._id); setShowConfirmationModal(true); setDropdownId(null); }}
                            className="flex items-center gap-3 w-full text-left px-4 py-2 text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            <BsTrash size={16} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="9" className="text-center p-4 text-gray-500">
                  No employees found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedEmployee && (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4 bg-black/50">
          <div className="rounded-lg p-6 max-w-md w-full bg-white text-black dark:bg-gray-800 dark:text-white">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Employee Details</h2>
              <button onClick={() => setSelectedEmployee(null)} className="hover:text-gray-700">
                <Close fontSize="small" />
              </button>
            </div>
            <div className="space-y-3">
              <p><strong>Name:</strong> {selectedEmployee.name}</p>
              <p className="flex items-center gap-2"><Email fontSize="small" /> <strong>Email:</strong> {selectedEmployee.email}</p>
              <p className="flex items-center gap-2"><Phone fontSize="small" /> <strong>Phone:</strong> {selectedEmployee.phone}</p>
              <p><strong>Position:</strong> {selectedEmployee.position}</p>
              <p><strong>Department:</strong> {selectedEmployee.department || "-"}</p>
            </div>
          </div>
        </div>
      )}
      {showConfirmationModal && (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4 bg-black/50">
          <div className="relative rounded-lg p-6 max-w-md w-full bg-white text-black dark:bg-gray-800 dark:text-white">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Confirm Deletion</h2>
              <button onClick={() => { setShowConfirmationModal(false); setEmployeeToDeleteId(null); }} className="hover:text-gray-700">
                <Close fontSize="small" />
              </button>
            </div>
            <p className="text-gray-700 mb-6">
              Are you sure you want to delete this employee?
            </p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => {
                  setShowConfirmationModal(false);
                  setEmployeeToDeleteId(null);
                }}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await API.delete(`/admin/employee/${employeeToDeleteId}`);
                  toast.success("Employee deleted successfully");
                  fetchEmployees();
                  setShowConfirmationModal(false);
                  setEmployeeToDeleteId(null);
                }}
                disabled={countdown > 0}
                className={`px-4 py-2 text-white rounded-lg transition ${countdown > 0
                    ? "bg-red-400 cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-700"
                  }`}
              >
                {countdown > 0 ? `Yes, Delete (${countdown})` : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
}
