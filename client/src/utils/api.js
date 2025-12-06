
// import axios from "axios";
// import store from "../app/store"; 
// import { showLoader, hideLoader } from "../features/auth/loaderSlice";

// // Base URL from environment variable
// const API_BASE_URL = import.meta.env.VITE_API_URL;

// // Axios Instance
// const API = axios.create({
//   baseURL: API_BASE_URL,
// });

// // ----------- REQUEST INTERCEPTOR -----------
// API.interceptors.request.use(
//   (config) => {
//     // Loader ON
//     store.dispatch(showLoader());

//     // Attach token
//     const token = localStorage.getItem("token");
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }

//     return config;
//   },
//   (error) => {
//     store.dispatch(hideLoader());
//     return Promise.reject(error);
//   }
// );

// // ----------- RESPONSE INTERCEPTOR -----------
// API.interceptors.response.use(
//   (response) => {
//     // Loader OFF
//     store.dispatch(hideLoader());
//     return response;
//   },
//   (error) => {
//     store.dispatch(hideLoader());
//     return Promise.reject(error);
//   }
// );

// // ---------- MOCK API (Optional for Testing) ----------
// export const MockAPI = {
//   get: async (url) => {
//     if (url === "/admin/me") {
//       return { data: { name: "Admin User" } };
//     } else if (url === "/admin/dashboard") {
//       return {
//         data: {
//           totalEmployees: 50,
//           attendance: { total: 50, onTime: 40, absent: 5, late: 5 },
//           leaves: { pending: 3, approved: 10, rejected: 2 },
//         },
//       };
//     } else if (url === "/admin/birthdays") {
//       return {
//         data: [
//           {
//             _id: "1",
//             name: "John Doe",
//             date: "2025-10-21",
//             message: "Happy Birthday!",
//             image: "https://i.pravatar.cc/150",
//           },
//         ],
//       };
//     } else if (url === "/notifications") {
//       return {
//         data: [
//           {
//             _id: "1",
//             title: "New Leave Request",
//             message: "Pending approval",
//             link: "/admin/dashboard/leave",
//             read: false,
//             createdAt: new Date().toISOString(),
//           },
//         ],
//       };
//     }
//     return { data: [] };
//   },

//   post: async () => ({ data: {} }),
//   delete: async () => ({ data: {} }),
// };

// export default API;



// src/utils/api.js
// src/utils/api.js
import axios from "axios";
import store from "../app/store";
import { showLoader, hideLoader } from "../features/auth/loaderSlice";

const API_BASE_URL = import.meta.env.VITE_API_URL;

// -----------------------------------------------
//                AXIOS INSTANCE
// -----------------------------------------------
const API = axios.create({
  baseURL: API_BASE_URL,
});

// -----------------------------------------------
//  🔥 Set access token on app load
// -----------------------------------------------
const savedAccessToken = localStorage.getItem("accessToken");
if (savedAccessToken) {
  API.defaults.headers.common["Authorization"] =
    `Bearer ${savedAccessToken}`;
}

// -----------------------------------------------
//            REQUEST INTERCEPTOR
// -----------------------------------------------
API.interceptors.request.use(
  (config) => {
    store.dispatch(showLoader());

    const accessToken = localStorage.getItem("accessToken");
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => {
    store.dispatch(hideLoader());
    return Promise.reject(error);
  }
);

// -----------------------------------------------
//            RESPONSE INTERCEPTOR (AUTO REFRESH)
// -----------------------------------------------
API.interceptors.response.use(
  (response) => {
    store.dispatch(hideLoader());
    return response;
  },
  async (error) => {
    store.dispatch(hideLoader());

    const originalRequest = error.config;

    // If access token expired → try refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");

        const res = await axios.post(`${API_BASE_URL}/auth/refresh`, {
          refreshToken,
        });

        const newAccessToken = res.data.accessToken;

        // Save new access token
        localStorage.setItem("accessToken", newAccessToken);

        // Update axios default header
        API.defaults.headers.common["Authorization"] =
          `Bearer ${newAccessToken}`;

        // retry the failed request
        originalRequest.headers["Authorization"] =
          `Bearer ${newAccessToken}`;

        return API(originalRequest);
      } catch (refreshError) {
        // Refresh failed → logout user
        localStorage.clear();
        window.location.href = "/";
      }
    }

    return Promise.reject(error);
  }
);

export default API;
