import React, { useState, useEffect, useRef } from "react";
import {
  User, Home, FileText, BookOpen, Banknote, Phone, Calendar,
  CheckCircle, Save, XCircle, Upload, RefreshCcw, Edit, AlertTriangle
} from "lucide-react";
import toast from "react-hot-toast";
import API from "../../utils/api";

export default function EmployeeProfile() {
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async (showToast = false) => {
    try {
      const res = await API.get("/profile");
      setProfile(res.data);
      setForm(res.data || {});
      if (showToast) toast.success("Profile data refreshed!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to load profile");
    } finally {
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
      toast.success("Image selected. Click 'Submit for Approval' to save.");
    } catch (err) {
      console.error("Image upload error:", err);
      toast.error("Image upload failed.");
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await API.put("/profile", form);
      setProfile(res.data.employee);
      setForm(res.data.employee);
      setEditing(false);
      toast.success(res.data.message || "Update request sent successfully!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send update request.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center mt-10">Loading profile...</div>;
  if (!profile) return <div className="text-center mt-10">Could not load profile.</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold">My Profile</h2>
        <div className="flex gap-2">
          <button onClick={() => fetchProfile(true)} className="flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-gray-100 text-sm">
            <RefreshCcw size={16} /> Refresh
          </button>
          {!editing ? (
            <button
              onClick={() => setEditing(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:bg-gray-400"
              disabled={(profile.editCount || 0) >= 2}
            >
              <Edit size={16} /> Edit Profile
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2">
                <Save size={16} /> Submit for Approval
              </button>
              <button onClick={() => { setEditing(false); setForm(profile); }} className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 flex items-center gap-2">
                <XCircle size={16} /> Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Profile Header */}
      <div className="flex flex-col items-center mb-6">
        <img
          src={form.image || profile.image || "https://via.placeholder.com/150"}
          alt="Profile"
          className="w-32 h-32 rounded-full border-4 border-indigo-500 object-cover mb-3"
        />
        {editing && (
          <div className="mb-3">
            <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Upload size={16} /> Upload Image
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
          </div>
        )}
        <div className="flex items-center gap-2 font-semibold">
          {profile.status === "Pending" ? (
            <span className="text-yellow-500 flex items-center gap-1"><AlertTriangle size={16} /> Awaiting Approval</span>
          ) : profile.verified ? (
            <span className="text-green-500 flex items-center gap-1"><CheckCircle size={16} /> Verified by HR</span>
          ) : (
            <span className="text-red-500 flex items-center gap-1"><XCircle size={16} /> Not Verified</span>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-2">Update attempts used: {profile.editCount || 0} / 2</p>
      </div>

      {/* Profile Cards */}
      <div className="grid md:grid-cols-3  gap-6"> 
        <ProfileCard icon={<User />} title="Basic Info" fields={[["name", "Full Name"], ["email", "Email"], ["phone", "Contact"], ["position", "Position"]]} editing={editing} form={form} employee={profile} handleChange={handleChange}/>
        <ProfileCard icon={<BookOpen />} title="Education" fields={[["highestQualification", "Highest Qualification"], ["yearOfPassing", "Year of Passing"]]} editing={editing} form={form} employee={profile} handleChange={handleChange} />
        <ProfileCard icon={<Home />} title="Address" fields={[["address", "Address"]]} editing={editing} form={form} employee={profile} handleChange={handleChange} />
        <ProfileCard icon={<Banknote />} title="Bank Details" fields={[["accountHolder", "Account Holder"], ["bankName", "Bank Name"], ["accountNumber", "Account Number"], ["ifsc", "IFSC Code"]]} editing={editing} form={form} employee={profile} handleChange={handleChange} />
        <ProfileCard icon={<FileText />} title="Identification" fields={[["idType", "ID Type"], ["idNumber", "ID Number"]]} editing={editing} form={form} employee={profile} handleChange={handleChange} />
        <ProfileCard icon={<Phone />} title="Emergency Contact" fields={[["emergencyName", "Emergency Name"], ["emergencyRelation", "Relation"], ["emergencyNumber", "Emergency Number"]]} editing={editing} form={form} employee={profile} handleChange={handleChange} />
        <ProfileCard icon={<Calendar />} title="Additional Info" fields={[["birthday", "Birthday", "date"], ["department", "Department"], ["jobType", "Job Type"]]} editing={editing} form={form} employee={profile} handleChange={handleChange} />
      </div>
    </div>
  );
}

function ProfileCard({ icon, title, fields, editing, form, employee, handleChange }) {
  return (
    <div className=" rounded-2xl shadow-md p-6 border border-gray-200">
      <div className="flex items-center gap-2 mb-4">
        {React.cloneElement(icon, { className: "text-blue-500" })}
        <h3 className="font-semibold ">{title}</h3>
      </div>
      <div className="space-y-3">
        {fields.map(([key, label, type = "text"]) => (
          editing ? (
            <div key={key} className="space-y-1">
              <label className="text-xs font-medium  block mb-1">{label}</label>
              <input
                type={type}
                name={key}
                value={type === "date" && form[key] ? new Date(form[key]).toISOString().split('T')[0] : form[key] || ""}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={`Enter ${label}`}
                disabled={key === 'email'} // Prevent email from being edited
              />
            </div>
          ) : (
            <div key={key} className="py-2 border-b border-gray-100 last:border-b-0">
              <span className=" text-sm block">{label}:</span>
              <span className="font-medium ">
                {type === "date" && employee[key] ? new Date(employee[key]).toLocaleDateString() : employee[key] || "—"}
              </span>
            </div>
          )
        ))}
      </div>
    </div>
  );
}
