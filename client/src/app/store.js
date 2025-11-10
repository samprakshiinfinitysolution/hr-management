import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/auth/authSlice";
import dashboardReducer from "../features/auth/dashboardSlice";
import employeeReducer from "../features/auth/employeeSlice";
import settingsReducer from "../features/auth/settingsSlice";

// Middleware to persist settings to localStorage
const localStorageMiddleware = (store) => (next) => (action) => {
  const result = next(action);
  if (action.type.startsWith("settings/")) {
    try {
      localStorage.setItem(
        "settings",
        JSON.stringify(store.getState().settings)
      );
    } catch (e) {
      console.error("Error saving settings:", e);
    }
  }
  return result;
};

export const store = configureStore({
  reducer: {
    auth: authReducer,
    dashboard: dashboardReducer,
    employee: employeeReducer,
    settings: settingsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(localStorageMiddleware),
});
