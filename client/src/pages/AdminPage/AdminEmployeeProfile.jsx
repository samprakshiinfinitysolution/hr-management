import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import {
  User, Home, FileText, BookOpen, Banknote, Phone, Calendar,
  CheckCircle, Save, XCircle, Upload, RefreshCcw, Edit,
} from "lucide-react";
import toast from "react-hot-toast";
import API from "../../utils/api";

export default function AdminEmployeeProfile() {
  const { id } = useParams();
  const [employee, setEmployee] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showPending, setShowPending] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (id) fetchEmployee();
  }, [id]);

  const fetchEmployee = async () => {
    try {
      const res = await API.get(`/admin/employee/${id}`);
      const employeeData = res.data;
      setEmployee(employeeData);
      setForm(employeeData);
      setLoading(false);
    } catch (err) {
      console.error("Fetch employee error:", err);
      toast.error("Failed to load employee profile");
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("profileImage", file);

    try {
      const res = await API.post("/upload/profile", formData);
      const { fileUrl } = res.data;
      setForm(prev => ({ ...prev, image: fileUrl }));
      toast.success("Image uploaded. Click 'Save Changes' to apply.");
    } catch (err) {
      console.error("Image upload error:", err);
      toast.error("Image upload failed.");
    }
  };

  const handleSave = async () => {
    const requiredFields = [
      "name", "email", "phone", "position", "address", "emergencyName",
      "emergencyRelation", "emergencyNumber",
      "highestQualification", "yearOfPassing", "accountHolder",
      "accountNumber", "ifsc", "bankName", "idType", "idNumber", "birthday"
    ];

    for (const field of requiredFields) {
      if (!form[field] || form[field] === "") {
        toast.error(`${field.replace(/([A-Z])/g, ' $1')} is required`);
        return;
      }
    }

    // console.log("Client: Form state before saving:", form); 
    try {
      await API.put(`/admin/employee/${id}`, form);
      setEditing(false);
      toast.success("Employee profile updated successfully!");
      fetchEmployee();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile");
    }
  };

  const handleVerify = async () => {
    try {
      await API.put(`/admin/employee/${id}/verify`);
      toast.success("Employee verified successfully!");
      setEmployee(prev => ({ ...prev, verified: true }));
    } catch (err) {
      toast.error("Verification failed");
    }
  };

  const handleApprove = async () => {
    try {
      await API.put(`/admin/employee/${id}/approve`);
      toast.success("Changes approved!");
      fetchEmployee();
    } catch (err) {
      toast.error("Approval failed");
    }
  };

  const handleReject = async () => {
    try {
      await API.put(`/admin/employee/${id}/reject`);
      toast.success("Changes rejected!");
      fetchEmployee();
    } catch (err) {
      toast.error("Rejection failed");
    }
  };

  if (loading) return <div className="text-center mt-10">Loading...</div>;
  if (!employee) return <div className="text-center mt-10">Employee not found</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold">Employee Profile (Admin View)</h2>
        <div className="flex gap-2">
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-1 px-3 py-2 rounded-lg  text-sm"
          >
            <RefreshCcw size={16} /> Refresh
          </button>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <Edit size={16} /> Edit Profile
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <Save size={16} /> Save Changes
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setForm(employee);
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 flex items-center gap-2"
              >
                <XCircle size={16} /> Cancel
              </button>
            </div>
          )}
          {!employee.verified && (
            <button
              onClick={handleVerify}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              disabled={editing}
            >
              Verify Employee
            </button>
          )}
        </div>
      </div>

      {/* Profile Header */}
      <div className="flex flex-col items-center mb-6">
        <img
          src={form.image || "https://via.placeholder.com/150"}
          alt="Profile"
          className="w-32 h-32 rounded-full border-4 border-indigo-500 object-cover mb-3"
        />
        
        {editing && (
          <div className="mb-3">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Upload size={16} /> Upload Image
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}

        <div className="flex items-center gap-2">
          {employee.verified ? (
            <>
              <CheckCircle className="text-green-500" size={20} />
              <span className="text-green-600 font-semibold">Verified by HR</span>
            </>
          ) : (
            <span className="text-yellow-600 font-semibold">Not Verified</span>
          )}
        </div>

        {employee.status === "Pending" && employee.pendingUpdates && Object.keys(employee.pendingUpdates).length > 0 && (
          <div className="mt-4 p-4 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-lg">
            <h4 className="font-bold flex items-center gap-2"><Edit size={16}/> Pending Update from Employee</h4>
            <p className="text-sm mb-2">This employee has submitted profile changes for approval.</p>
            <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              {Object.entries(employee.pendingUpdates).map(([key, value]) => (
                <div key={key}>
                  <strong className="capitalize">{key.replace(/([A-Z])/g, ' $1')}:</strong>
                  <span className="ml-2 p-1 bg-yellow-200 rounded">{String(value)}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={handleApprove} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-semibold">
                Approve Changes
              </button>
              <button onClick={handleReject} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-semibold">
                Reject
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Profile Cards */}
      <div className="grid md:grid-cols-3 gap-6">
        <ProfileCard
          icon={<User className="text-blue-500" />}
          title="Basic Info"
          fields={[
            ["name", "Full Name"],
            ["email", "Email"],
            ["phone", "Contact"],
            ["position", "Position"],
          ]}
          editing={editing}
          form={form}
          employee={employee}
          handleChange={handleChange}
        />

        <ProfileCard
          icon={<BookOpen className="text-green-500" />}
          title="Education"
          fields={[
            ["highestQualification", "Highest Qualification"],
            ["yearOfPassing", "Year of Passing"],
          ]}
          editing={editing}
          form={form}
          employee={employee}
          handleChange={handleChange}
        />

        <ProfileCard
          icon={<Home className="text-purple-500" />}
          title="Address"
          fields={[["address", "Address"]]}
          editing={editing}
          form={form}
          employee={employee}
          handleChange={handleChange}
        />

        <ProfileCard
          icon={<Banknote className="text-indigo-500" />}
          title="Bank Details"
          fields={[
            ["accountHolder", "Account Holder"],
            ["bankName", "Bank Name"],
            ["accountNumber", "Account Number"],
            ["ifsc", "IFSC Code"],
          ]}
          editing={editing}
          form={form}
          employee={employee}
          handleChange={handleChange}
        />

        <ProfileCard
          icon={<FileText className="text-red-500" />}
          title="Identification"
          fields={[
            ["idType", "ID Type"],
            ["idNumber", "ID Number"],
          ]}
          editing={editing}
          form={form}
          employee={employee}
          handleChange={handleChange}
        />

        <ProfileCard
          icon={<Phone className="text-yellow-500" />}
          title="Emergency Contact"
          fields={[
            ["emergencyName", "Emergency Name"],
            ["emergencyRelation", "Relation"],
            ["emergencyNumber", "Emergency Number"],
          ]}
          editing={editing}
          form={form}
          employee={employee}
          handleChange={handleChange}
        />

        <ProfileCard
          icon={<Calendar className="text-pink-500" />}
          title="Additional Info"
          fields={[
            ["birthday", "Birthday", "date"],
            ["department", "Department"],
            ["jobType", "Job Type"],
          ]}
          editing={editing}
          form={form}
          employee={employee}
          handleChange={handleChange}
        />
      </div>
    </div>
  );
}

function ProfileCard({ icon, title, fields, editing, form, employee, handleChange }) {
  return (
    <div className=" rounded-2xl shadow-md p-6 border  border-gray-200">
      <div className="flex items-center gap-2 mb-4">
        {icon}
        <h3 className="font-semibold ">{title}</h3>
      </div>
      
      <div className="space-y-3">
        {fields.map(([key, label, type = "text"]) => (
          editing ? (
            <div key={key} className="space-y-1"> 
              <label className="text-xs font-medium  block mb-1">
                {label} {["name", "email", "phone", "position", "address", 
                          "emergencyName", "emergencyRelation", "emergencyNumber",
                          "highestQualification", "yearOfPassing", "accountHolder",
                          "accountNumber", "ifsc", "bankName", 
                          "idType", "idNumber", "birthday"
                          ].includes(key) && <span className="text-red-500"> *</span>}
              </label>
              {key === "idType" ? (
                <select
                  name={key}
                  value={form[key] || ""}
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select ID Type</option>
                  <option value="Aadhaar">Aadhaar Card</option>
                  <option value="Voter ID">Voter ID</option>
                  <option value="PAN Card">PAN Card</option>
                  <option value="Driving License">Driving License</option>
                  <option value="Other">Other</option>
                </select>
              ) : (
                <input
                  type={type}
                  name={key}
                  value={
                    type === "date" && form[key] 
                      ? new Date(form[key]).toISOString().split('T')[0] 
                      : form[key] || ""
                  }
                  onChange={handleChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={`Enter ${label}`}
                />
              )}
            </div>
          ) : (
            <div key={key} className="py-2 border-b border-gray-100 last:border-b-0">
              <span className="text-sm block">{label}:</span>
              <span className="font-medium">
                {type === "date" && employee[key] 
                  ? new Date(employee[key]).toLocaleDateString() 
                  : employee[key] || "—"
                }
              </span>
            </div>
          )
        ))}
      </div>
    </div>
  );
}