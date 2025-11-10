import React, { useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Sun, Moon, Bell, BellOff, User, Eye, EyeOff } from "lucide-react";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { logout, verifyUser } from "../../features/auth/authSlice";
import {
  toggleDarkMode,
  toggleEmailNotifications,
  toggleProfileVisibility,
} from "../../features/auth/settingsSlice";

import API from "../../utils/api";

export default function EmployeeSettings() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isDarkMode, emailNotifications, profilePublic } = useSelector(
    (state) => state.settings
  );

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileEmail, setProfileEmail] = useState("");

  useEffect(() => {
    // fetch profile to show email/name
    const loadProfile = async () => {
      try {
        const res = await API.get("/profile");
        setProfileEmail(res.data.email || "");
      } catch (err) {
        // ignore silently
      }
    };
    loadProfile();
  }, []);

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();

    // client-side validation
    if (!password || password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Password and Confirm Password do not match.");
      return;
    }

    setLoading(true);
    try {
      const res = await API.put("/profile/change-password", { password });
      toast.success(res.data.message || "Password updated successfully.");
      // optional: if backend returns token, update it
      if (res.data.token) {
        localStorage.setItem("token", res.data.token);
        dispatch(verifyUser());
      }
      // keep user on page (or logout if you prefer)
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto  rounded-2xl space-y-6">
      <h1 className="text-2xl font-bold">Employee Settings</h1>

      {/* show email */}
      <div className="p-4 border rounded-xl">
        <div className="text-sm text-gray-500">Signed in as</div>
        <div className="font-medium">{profileEmail || "—"}</div>
      </div>

      {/* Dark Mode */}
      <button
        onClick={() => {
          dispatch(toggleDarkMode());
          toast.success(!isDarkMode ? "Dark mode enabled" : "Light mode enabled");
        }}
        className="w-full flex items-center border justify-between p-4  rounded-xl hover:shadow-md transition text-left"
      >
        <div className="flex items-center gap-3">
          {isDarkMode ? <Moon className="text-yellow-400" /> : <Sun className="text-yellow-400" />}
          <span className="font-medium">Dark Mode</span>
        </div>
        <span className="font-semibold">{isDarkMode ? "On" : "Off"}</span>
      </button>

      {/* Notifications */}
      <button
        onClick={() => {
          dispatch(toggleEmailNotifications());
          toast.success(`${!emailNotifications ? "Notifications enabled" : "Notifications disabled"}`);
        }}
        className="w-full flex items-center justify-between p-4  border rounded-xl hover:shadow-md transition text-left"
      >
        <div className="flex items-center gap-3">
          {emailNotifications ? <Bell className="text-blue-500" /> : <BellOff className="text-red-500" />}
          <span className="font-medium">Notifications</span>
        </div>
        <span className="font-semibold">{emailNotifications ? "On" : "Off"}</span>
      </button>

      {/* Change Password Section */}
      <div className="p-4 border dark:border-gray-700 rounded-xl space-y-4">
        <h2 className="font-semibold text-lg">Change Password</h2>
        <form onSubmit={handlePasswordUpdate} className="space-y-3">
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              placeholder="New Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 rounded border  dark:border-gray-600 pr-10"
              disabled={loading}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          <div className="relative">
            <input
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirm New Password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-3 rounded border  dark:border-gray-600 pr-10"
              disabled={loading}
            />
             <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2">
              {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>

      {/* Profile Visibility */}
      {/* <button
        onClick={() => {
          dispatch(toggleProfileVisibility());
          toast.success(`Profile is now ${!profilePublic ? "Public" : "Private"}`);
        }}
        className="w-full flex items-center justify-between p-4  rounded-xl hover:shadow-md transition text-left"
      >
        <div className="flex items-center gap-3">
          <User className="text-green-500" />
          <span className="font-medium">Profile Visibility</span>
        </div>
        <span className="font-semibold">{profilePublic ? "Public" : "Private"}</span>
      </button> */}
    </div>
  );
}
