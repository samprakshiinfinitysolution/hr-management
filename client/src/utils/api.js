
import axios from "axios";
import store from "../app/store"; 
import { showLoader, hideLoader } from "../features/auth/loaderSlice";

// Base URL from environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL;

// Axios Instance
const API = axios.create({
  baseURL: API_BASE_URL,
});

// ----------- REQUEST INTERCEPTOR -----------
API.interceptors.request.use(
  (config) => {
    // Loader ON
    store.dispatch(showLoader());

    // Attach token
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    store.dispatch(hideLoader());
    return Promise.reject(error);
  }
);

// ----------- RESPONSE INTERCEPTOR -----------
API.interceptors.response.use(
  (response) => {
    // Loader OFF
    store.dispatch(hideLoader());
    return response;
  },
  (error) => {
    store.dispatch(hideLoader());
    return Promise.reject(error);
  }
);

// ---------- MOCK API (Optional for Testing) ----------
export const MockAPI = {
  get: async (url) => {
    if (url === "/admin/me") {
      return { data: { name: "Admin User" } };
    } else if (url === "/admin/dashboard") {
      return {
        data: {
          totalEmployees: 50,
          attendance: { total: 50, onTime: 40, absent: 5, late: 5 },
          leaves: { pending: 3, approved: 10, rejected: 2 },
        },
      };
    } else if (url === "/admin/birthdays") {
      return {
        data: [
          {
            _id: "1",
            name: "John Doe",
            date: "2025-10-21",
            message: "Happy Birthday!",
            image: "https://i.pravatar.cc/150",
          },
        ],
      };
    } else if (url === "/notifications") {
      return {
        data: [
          {
            _id: "1",
            title: "New Leave Request",
            message: "Pending approval",
            link: "/admin/dashboard/leave",
            read: false,
            createdAt: new Date().toISOString(),
          },
        ],
      };
    }
    return { data: [] };
  },

  post: async () => ({ data: {} }),
  delete: async () => ({ data: {} }),
};

export default API;
