// pages/AdminPage/AdminSettings.jsx
import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Sun, Moon, Bell, BellOff, Eye, EyeOff, X } from "lucide-react";
import { toast } from "react-hot-toast";
import {
  toggleDarkMode,
  toggleEmailNotifications,
} from "../../features/auth/settingsSlice";
import API from "../../utils/api"; 
import { Trash2, Pencil, Save, ShieldCheck } from "lucide-react";


export default function AdminSettings() {
  const dispatch = useDispatch();
  const { isDarkMode, emailNotifications } = useSelector((state) => state.settings);
  const userRole = localStorage.getItem("role")?.toLowerCase();
  const isAdmin = userRole === "admin";

  // Profile
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePassword, setProfilePassword] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [showProfilePassword, setShowProfilePassword] = useState(false);

  // Employee
  const [empId, setEmpId] = useState("");
  const [empName, setEmpName] = useState("");
  const [empEmail, setEmpEmail] = useState("");
  const [empPassword, setEmpPassword] = useState("");
  const [loadingEmp, setLoadingEmp] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [showEmpPassword, setShowEmpPassword] = useState(false);

  // HR/Manager Admin
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminRole, setAdminRole] = useState("hr");
  const [loadingAdminCreate, setLoadingAdminCreate] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // Sub-Admins (HR/Manager) List
  const [subAdmins, setSubAdmins] = useState([]);
  const [loadingSubAdmins, setLoadingSubAdmins] = useState(false);
  const [adminToDelete, setAdminToDelete] = useState(null);

  //hr/manger edit/update
  const [adminToEdit, setAdminToEdit] = useState(null);
  const [editAdminName, setEditAdminName] = useState("");
  const [editAdminEmail, setEditAdminEmail] = useState("");
  const [editAdminPassword, setEditAdminPassword] = useState("");
  const [editAdminRole, setEditAdminRole] = useState(""); // New state for editing role
  const [loadingEditAdmin, setLoadingEditAdmin] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false); // Missing state variable

  //default time
  const [defaultSettings, setdefaultSettings] = useState({
    officeStartTime: "10:00",
    lateGraceMinutes: 15,
    halfDayCutoff: "11:00",
    officeEndTime: "18:00",
    earlyCheckoutGraceMinutes: 0,
    halfDayCheckoutCutoff: "17:00",
    autoCheckoutTime: "18:00",
  });
  // Office Time Settings
 const [officeSettings, setOfficeSettings] = useState({
   officeStartTime: " ",
    lateGraceMinutes: " ",
    halfDayCutoff: " ",
    officeEndTime: " ",
    earlyCheckoutGraceMinutes: 0,
    halfDayCheckoutCutoff: " ",
    autoCheckoutTime: "",
});
  const [loadingOfficeSettings, setLoadingOfficeSettings] = useState(true);
  // Load data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await API.get("/admin/me");
        setProfileName(res.data.name || "");
        setProfileEmail(res.data.email || "");
      } catch (err) {
        toast.error("Failed to load profile");
      }
    };

    const fetchEmployees = async () => {
      try {
        const res = await API.get("/admin/employees");
        setEmployees(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        toast.error("Failed to load employees");
      }
    };

    const fetchSubAdmins = async () => {
      if (isAdmin) {
        setLoadingSubAdmins(true);
        try {
          const res = await API.get("/admin/sub-admins");
          setSubAdmins(res.data);
        } catch (err) {
          toast.error("Failed to load HR/Manager list");
        } finally {
          setLoadingSubAdmins(false);
        }
      }
    };

    const fetchOfficeSettings = async () => {
  if (!isAdmin) return;

  setLoadingOfficeSettings(true);
  try {
    const { data } = await API.get("/admin/settings");

    if (data && data.attendanceSettings) {
      // ✅ Load saved data from DB
      setOfficeSettings((prev) => ({
        ...prev,
        ...data.attendanceSettings,
      }));
    } else {
      // ✅ If DB has nothing yet, fall back to defaults
      setOfficeSettings(defaultSettings);
    }
  } catch (error) {
    console.error("Failed to fetch office settings:", error);
    toast.error("Could not fetch office time settings.");
  } finally {
    setLoadingOfficeSettings(false);
  }
};


    fetchProfile();
    fetchEmployees();
    fetchSubAdmins();
    fetchOfficeSettings();
  }, []);

  // Prefill employee
  useEffect(() => {
    if (empId) {
      const emp = employees.find(e => e._id === empId);
      if (emp) {
        setEmpName(emp.name || "");
        setEmpEmail(emp.email || "");
        setEmpPassword("");
      }
    } else {
      setEmpName(""); setEmpEmail(""); setEmpPassword("");
    }
  }, [empId, employees]);

  // Prefill HR/Manager edit modal when adminToEdit changes
  useEffect(() => {
    if (adminToEdit) {
      setEditAdminName(adminToEdit.name || "");
      setEditAdminEmail(adminToEdit.email || "");
      // Clear password field for security
      setEditAdminRole(adminToEdit.role || "hr"); // Set initial role
      setEditAdminPassword("");
    }
  }, [adminToEdit]);

  // Toggles
  const handleDarkMode = () => {
    dispatch(toggleDarkMode());
    toast.success(isDarkMode ? "Light mode" : "Dark mode");
  };

  const handleNotifications = () => {
    dispatch(toggleEmailNotifications());
    toast.success(emailNotifications ? "Notifications off" : "Notifications on");
  };

  // Office Settings Handlers
  const handleOfficeSettingsChange = (e) => {
    const { name, value, type } = e.target;
    setOfficeSettings((prev) => ({
      ...prev,
      [name]: type === "number" ? parseInt(value, 10) : value,
    }));
  };

 const handleOfficeSettingsSave = async (e) => {
  e.preventDefault();

  toast.promise(API.put("/admin/settings", officeSettings), {
    loading: "Saving office settings...",
    success: async (res) => {
      if (res.data?.attendanceSettings) {
        setOfficeSettings(res.data.attendanceSettings);
      }

      // ✅ Immediately fetch fresh data from DB to ensure state matches saved values
      const { data } = await API.get("/admin/settings");
      if (data?.attendanceSettings) {
        setOfficeSettings(data.attendanceSettings);
      }

      return "Office settings updated successfully!";
    },
    error: "Failed to update office settings.",
  });
};

  // Profile update
  const handleProfileUpdate = async () => {
    const hasName = profileName.trim() !== "";
    const hasPassword = profilePassword.trim() !== "";
    const hasEmail = isAdmin && profileEmail.trim() !== "";

    if (!hasName && !hasPassword && !hasEmail) {
      toast.error("Enter at least one field");
      return;
    }

    const payload = { name: profileName };
    if (hasPassword) payload.password = profilePassword;
    if (isAdmin && hasEmail) payload.email = profileEmail;

    setLoadingProfile(true);
    try {
      await API.put("/admin/profile", payload);
      toast.success("Profile updated");
      setProfilePassword(""); // Only clear password field
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setLoadingProfile(false);
    }
  };

  // Employee update
  const handleEmployeeUpdate = async () => {
    if (!empId || (!empName && !empEmail && !empPassword)) {
      toast.error("Select employee & fill field");
      return;
    }
    setLoadingEmp(true);
    try {
      await API.put(`/admin/employee/${empId}`, { name: empName, email: empEmail, password: empPassword });
      toast.success("Employee updated");
      setEmpId(""); setEmpName(""); setEmpEmail(""); setEmpPassword("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setLoadingEmp(false);
    }
  };

  // Create HR/Manager
  const handleCreateHRorManager = async () => {
    if (!adminName || !adminEmail || !adminPassword) {
      toast.error("Fill all fields");
      return;
    }
    setLoadingAdminCreate(true);
    try {
      await API.post("/admin/create-hr-manager", { name: adminName, email: adminEmail, password: adminPassword, role: adminRole });
      toast.success(`${adminRole.toUpperCase()} created`);
      setAdminName(""); setAdminEmail(""); setAdminPassword(""); setAdminRole("hr");
    } catch (err) {
      toast.error(err.response?.data?.message || "Create failed");
    } finally {
      setLoadingAdminCreate(false);
    }
  };
  // 🔹 Update HR/Manager details
  const handleUpdateSubAdmin = async () => {
    if (!adminToEdit) return;
    if (!editAdminName && !editAdminEmail && !editAdminPassword) {
      toast.error("Please fill at least one field");
      return;
    }
    setLoadingEditAdmin(true);
    try {
      await API.put(`/admin/sub-admin/${adminToEdit._id}`, {
        name: editAdminName,
        email: editAdminEmail,
        password: editAdminPassword,
        role: editAdminRole, // Include role in the payload
      });
      toast.success(`${adminToEdit.role.toUpperCase()} updated successfully`);
      setSubAdmins((prev) =>
        prev.map((a) =>
          a._id === adminToEdit._id
            ? { ...a, name: editAdminName || a.name, email: editAdminEmail || a.email, role: editAdminRole || a.role }
            : a
        )
      );
      setAdminToEdit(null);
      setEditAdminName("");
      setEditAdminEmail("");
      setEditAdminRole(""); // Clear role state
      setEditAdminPassword("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Update failed");
    } finally {
      setLoadingEditAdmin(false);
    }
  };

  // Delete HR/Manager
  const handleDeleteSubAdmin = async () => {
    if (!adminToDelete) return;
    try {
      await API.delete(`/admin/sub-admin/${adminToDelete._id}`);
      toast.success(`${adminToDelete.role.toUpperCase()} deleted successfully`);
      setSubAdmins(subAdmins.filter(admin => admin._id !== adminToDelete._id));
      setAdminToDelete(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Deletion failed");
    }
  };


  return (
    <div className={`p-6 max-w-3xl mx-auto space-y-6 ${isDarkMode ? "bg-gray-800 text-white" : "bg-white text-gray-800"} rounded-2xl shadow-2xl`}>
      <h1 className="text-2xl font-bold">Settings</h1>

      {/* Dark Mode */}
      <button onClick={handleDarkMode} className="w-full flex items-center justify-between p-4 rounded-xl hover:shadow-md">
        <div className="flex items-center gap-3">
          {isDarkMode ? <Moon className="text-yellow-400" /> : <Sun className="text-yellow-400" />}
          <span className="font-medium">Dark Mode</span>
        </div>
        <span className="font-semibold">{isDarkMode ? "On" : "Off"}</span>
      </button>

      {/* Notifications */}
      <button onClick={handleNotifications} className="w-full flex items-center justify-between p-4  rounded-xl hover:shadow-md">
        <div className="flex items-center gap-3">
          {emailNotifications ? <Bell className="text-blue-500" /> : <BellOff className="text-red-500" />}
          <span className="font-medium">Email Notifications</span>
        </div>
        <span className="font-semibold">{emailNotifications ? "On" : "Off"}</span>
      </button>

      {/* ADMIN ONLY SECTIONS */}
      {isAdmin && (
        <>
          {/* Office Time Settings */}
          <div className="p-4 rounded-xl space-y-3 border">
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <ShieldCheck size={20} className="text-blue-500" />
              Attendance & Office Timings
            </h2>
            {loadingOfficeSettings ? <p>Loading office settings...</p> : (
              <form onSubmit={handleOfficeSettingsSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SettingInput
                    label="Office Start Time"
                    name="officeStartTime"
                    type="time"
                    value={officeSettings.officeStartTime}
                    onChange={handleOfficeSettingsChange}
                  />
                  <SettingInput
                    label="Late Grace Period (minutes)"
                    name="lateGraceMinutes"
                    type="number"
                    value={officeSettings.lateGraceMinutes}
                    onChange={handleOfficeSettingsChange}
                  />
                  <SettingInput
                    label="Half-day Login Cutoff"
                    name="halfDayCutoff"
                    type="time"
                    value={officeSettings.halfDayCutoff}
                    onChange={handleOfficeSettingsChange}
                  />
                  <SettingInput
                    label="Office End Time"
                    name="officeEndTime"
                    type="time"
                    value={officeSettings.officeEndTime}
                    onChange={handleOfficeSettingsChange}
                  />
                  <SettingInput
                    label="Half-day Checkout Cutoff"
                    name="halfDayCheckoutCutoff"
                    type="time"
                    value={officeSettings.halfDayCheckoutCutoff}
                    onChange={handleOfficeSettingsChange}
                  />
                  <SettingInput
                    label="Auto-Checkout Time"
                    name="autoCheckoutTime"
                    type="time"
                    value={officeSettings.autoCheckoutTime}
                    onChange={handleOfficeSettingsChange}
                  />
                </div>
                <button type="submit" className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center justify-center gap-2">
                  <Save size={16} /> Save Office Settings
                </button>
              </form>
            )}
          </div>

          {/* Profile */}
          <div className="p-4  rounded-xl space-y-3">
            <h2 className="font-semibold text-lg">Admin Profile</h2>
            <input type="text" placeholder="Name" value={profileName} onChange={e => setProfileName(e.target.value)} className="w-full p-2 rounded border " disabled={loadingProfile} />
            <input type="email" placeholder="Email" value={profileEmail} onChange={e => setProfileEmail(e.target.value)} className="w-full p-2 rounded border " disabled={loadingProfile} />
            <div className="relative">
              <input type={showProfilePassword ? "text" : "password"} placeholder="Password" value={profilePassword} onChange={e => setProfilePassword(e.target.value)} className="w-full p-2 rounded border  pr-10" disabled={loadingProfile} />
              <button type="button" onClick={() => setShowProfilePassword(!showProfilePassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                {showProfilePassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
            <button onClick={handleProfileUpdate} disabled={loadingProfile} className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              {loadingProfile ? "Updating…" : "Update"}
            </button>
          </div>

          {/* Employee Update */}
          <div className="p-4   rounded-xl space-y-3">
            <h2 className="font-semibold text-lg">Update Employee</h2>
            <select value={empId} onChange={e => setEmpId(e.target.value)} className="w-full p-2 rounded border " disabled={loadingEmp}>
              <option value="" className="text-gray-950">Select</option>
              {employees.map(emp => <option key={emp._id} value={emp._id} className="text-gray-950">{emp.name}</option>)}
            </select>
            <input type="text" placeholder="Name" value={empName} onChange={e => setEmpName(e.target.value)} className="w-full p-2 rounded border" disabled={loadingEmp} />
            <input type="email" placeholder="Email" value={empEmail} onChange={e => setEmpEmail(e.target.value)} className="w-full p-2 rounded border" disabled={loadingEmp} />
            <div className="relative">
              <input type={showEmpPassword ? "text" : "password"} placeholder="Password" value={empPassword} onChange={e => setEmpPassword(e.target.value)} className="w-full p-2 rounded border pr-10" disabled={loadingEmp} />
              <button type="button" onClick={() => setShowEmpPassword(!showEmpPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                {showEmpPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
            <button onClick={handleEmployeeUpdate} disabled={loadingEmp} className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700">
              {loadingEmp ? "Updating…" : "Update"}
            </button>
          </div>

          {/* Create HR/Manager */}
          <div className="p-4  rounded-xl space-y-3">
            <h2 className="font-semibold text-lg text-purple-400">Create HR/Manager</h2>
            <input type="text" placeholder="Name" value={adminName} onChange={e => setAdminName(e.target.value)} className="w-full p-2 rounded border" disabled={loadingAdminCreate} />
            <input type="email" placeholder="Email" value={adminEmail} onChange={e => setAdminEmail(e.target.value)} className="w-full p-2 rounded border" disabled={loadingAdminCreate} />
            <div className="relative">
              <input type={showAdminPassword ? "text" : "password"} placeholder="Password" value={adminPassword} onChange={e => setAdminPassword(e.target.value)} className="w-full p-2 rounded border pr-10" disabled={loadingAdminCreate} />
              <button type="button" onClick={() => setShowAdminPassword(!showAdminPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
                {showAdminPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
            <select value={adminRole} onChange={e => setAdminRole(e.target.value)} className="w-full p-2 rounded border" disabled={loadingAdminCreate}>
              <option value="hr" className="text-gray-950">HR</option>
              <option value="manager" className="text-gray-950">Manager</option>
            </select>
            <button onClick={handleCreateHRorManager} disabled={loadingAdminCreate} className="w-full py-2 bg-purple-600 text-white rounded hover:bg-purple-700">
              {loadingAdminCreate ? "Creating…" : "Create"}
            </button>
          </div>

          <div className="p-4  rounded-xl space-y-3">
            <h2 className="font-semibold text-lg">Manage HR & Managers</h2>
            {loadingSubAdmins ? <p>Loading...</p> : (
              <div className="space-y-2">
                {subAdmins.length > 0 ? subAdmins.map(admin => (
                  <div key={admin._id} className="flex justify-between items-center p-2 rounded">
                    <div>
                      <p className="font-medium">{admin.name} <span className="text-xs bg-blue-200 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full">{admin.role}</span></p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{admin.email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Edit Button */}
                      <button
                        onClick={() => setAdminToEdit(admin)}
                        className="p-2 text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900 rounded-full"
                        title={`Edit ${admin.name}`}
                      >
                        <Pencil size={18} />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={() => setAdminToDelete(admin)}
                        className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900 rounded-full"
                        title={`Delete ${admin.name}`}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                )) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No HR or Managers found.</p>
                )}
              </div>
            )}
          </div>

        </>
      )}

      {/* HR / Manager: Only Dark + Notif + Profile Update */}
      {!isAdmin && (
        <div className="p-4  rounded-xl space-y-3">
          <h2 className="font-semibold text-lg">My Profile</h2>
          <input type="text" placeholder="Name" value={profileName} onChange={e => setProfileName(e.target.value)} className="w-full p-2 rounded border" disabled={loadingProfile} />
          <div className="relative">
            <input type={showProfilePassword ? "text" : "password"} placeholder="New Password" value={profilePassword} onChange={e => setProfilePassword(e.target.value)} className="w-full p-2 rounded border pr-10" disabled={loadingProfile} />
            <button type="button" onClick={() => setShowProfilePassword(!showProfilePassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
              {showProfilePassword ? <EyeOff /> : <Eye />}
            </button>
          </div>
          <button onClick={handleProfileUpdate} disabled={loadingProfile} className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            {loadingProfile ? "Updating…" : "Update Profile"}
          </button>
        </div>
      )}
      {/* ✏️ Edit HR/Manager Modal */}
      {adminToEdit && (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4 bg-black/50">
          <div className="rounded-lg p-6 max-w-md w-full bg-white text-black dark:bg-gray-800 dark:text-white">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Edit {adminToEdit.role.toUpperCase()}</h2>
              <button onClick={() => setAdminToEdit(null)} className="hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Name"
                value={editAdminName}
                onChange={(e) => setEditAdminName(e.target.value)}
                className="w-full p-2 rounded border"
                disabled={loadingEditAdmin}
              />
              <input
                type="email"
                placeholder="Email"
                value={editAdminEmail}
                onChange={(e) => setEditAdminEmail(e.target.value)}
                className="w-full p-2 rounded border"
                disabled={loadingEditAdmin}
              />
              <div className="relative">
                <input
                  type={showEditPassword ? "text" : "password"}
                  placeholder="New Password"
                  value={editAdminPassword}
                  onChange={(e) => setEditAdminPassword(e.target.value)}
                  className="w-full p-2 rounded border pr-10"
                  disabled={loadingEditAdmin}
                />
                <button
                  type="button"
                  onClick={() => setShowEditPassword(!showEditPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showEditPassword ? <EyeOff /> : <Eye />}
                </button>
              </div>
              {/* Role Selection */}
              <select
                value={editAdminRole}
                onChange={(e) => setEditAdminRole(e.target.value)}
                className="w-full p-2 rounded border"
                disabled={loadingEditAdmin}
              >
                <option value="hr" className="text-gray-950">
                  HR
                </option>
                <option value="manager" className="text-gray-950">
                  Manager
                </option>
              </select>
            </div>

            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => setAdminToEdit(null)}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateSubAdmin}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                {loadingEditAdmin ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {adminToDelete && (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4 bg-black/50">
          <div className="rounded-lg p-6 max-w-md w-full bg-white text-black dark:bg-gray-800 dark:text-white">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Confirm Deletion</h2>
              <button onClick={() => setAdminToDelete(null)} className="hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <p className="mb-6">Are you sure you want to delete the user <strong className="text-red-500">{adminToDelete.name}</strong> ({adminToDelete.role})? This action cannot be undone.</p>
            <div className="flex justify-end space-x-4">
              <button
                onClick={() => setAdminToDelete(null)}
                className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSubAdmin}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const SettingInput = ({ label, name, type, value, onChange }) => (
  <div>
    <label htmlFor={name} className="block text-sm font-medium mb-1">
      {label}
    </label>
    <input
      id={name}
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      className="w-full p-2 border rounded-md bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
    />
  </div>
);
