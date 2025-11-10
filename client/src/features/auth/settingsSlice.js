import { createSlice } from "@reduxjs/toolkit";

// 🌙 Initial state setup
const initialState = {
  isDarkMode: false,           // Dark / Light mode toggle
  emailNotifications: true,    // Email notification toggle
  profileVisible: true,        // Profile visibility toggle
};

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    // 🌗 Toggle Dark Mode
    toggleDarkMode: (state) => {
      state.isDarkMode = !state.isDarkMode;
      // Optionally save preference in localStorage
      localStorage.setItem("isDarkMode", state.isDarkMode);
    },
    setDarkMode: (state, action) => {
      state.isDarkMode = action.payload;
    },

    // 🔔 Toggle Email Notifications
    toggleEmailNotifications: (state) => {
      state.emailNotifications = !state.emailNotifications;
      localStorage.setItem("emailNotifications", state.emailNotifications);
    },

    // 👤 Toggle Profile Visibility (for employee/admin profile section)
    toggleProfileVisibility: (state) => {
      state.profileVisible = !state.profileVisible;
      localStorage.setItem("profileVisible", state.profileVisible);
    },

    // ♻️ Load persisted settings on refresh
 loadSettingsFromStorage: (state) => {
  const darkMode = localStorage.getItem("isDarkMode") === "true"; // ✅ match key name
  const emailNotifications = localStorage.getItem("emailNotifications") === "true";
  const profileVisible = localStorage.getItem("profileVisible") === "true";

  state.isDarkMode = darkMode;
  state.emailNotifications = emailNotifications;
  state.profileVisible = profileVisible;

  // Apply mode instantly
  if (darkMode) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
},

  },
});

export const {
  toggleDarkMode,setDarkMode,
  toggleEmailNotifications,
  toggleProfileVisibility,
  loadSettingsFromStorage,
} = settingsSlice.actions;


export default settingsSlice.reducer;