
// src/utils/api.js
import axios from "axios";
import store from "../app/store";
import { showLoader, hideLoader } from "../features/auth/loaderSlice";

const API_BASE_URL = import.meta.env.VITE_API_URL;

// -----------------------------------------------
//  AXIOS INSTANCE
// -----------------------------------------------
const API = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// -----------------------------------------------
//  LOAD ACCESS TOKEN ON STARTUP
// -----------------------------------------------
const savedAccessToken = localStorage.getItem("accessToken");
if (savedAccessToken) {
  API.defaults.headers.common["Authorization"] = `Bearer ${savedAccessToken}`;
}

// -----------------------------------------------
// REQUEST INTERCEPTOR
// -----------------------------------------------
API.interceptors.request.use(
  (config) => {
    store.dispatch(showLoader());

    const token = localStorage.getItem("accessToken");
    if (token) config.headers.Authorization = `Bearer ${token}`;

    return config;
  },
  (error) => {
    store.dispatch(hideLoader());
    return Promise.reject(error);
  }
);

// -----------------------------------------------
// RESPONSE INTERCEPTOR (AUTO REFRESH FOR ADMIN + EMPLOYEE)
// -----------------------------------------------
API.interceptors.response.use(
  (response) => {
    store.dispatch(hideLoader());
    return response;
  },

  async (error) => {
    store.dispatch(hideLoader());

    const originalRequest = error.config;

    // Do NOT refresh on infinite loop or refresh route itself
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url.includes("/refresh")
    ) {
      originalRequest._retry = true;

      try {
        // ⭐ CHECK USER ROLE (admin | employee)
        const role = localStorage.getItem("role");

        let refreshURL = "";

        if (role === "admin" || role === "hr" || role === "manager") {
          refreshURL = `${API_BASE_URL}/admin/refresh`;
        } else if (role === "employee") {
          refreshURL = `${API_BASE_URL}/refresh`;
        } else {
          throw new Error("Unknown user role for refresh");
        }

        // ⭐ CALL CORRECT REFRESH ENDPOINT
        const refreshResponse = await axios.post(
          refreshURL,
          {},
          { withCredentials: true }
        );

        const newAccessToken = refreshResponse.data.accessToken;

        // Save & assign new token
        localStorage.setItem("accessToken", newAccessToken);
        API.defaults.headers.common["Authorization"] =
          `Bearer ${newAccessToken}`;
        originalRequest.headers["Authorization"] =
          `Bearer ${newAccessToken}`;

        return API(originalRequest);
      } catch (refreshErr) {
        console.error("Refresh failed:", refreshErr);

        // CLEAR AUTH
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        localStorage.removeItem("role");

        // Go to login
        window.location.href = "/";
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export default API;
