// import { io } from "socket.io-client";

// // 1. Get Base URL
// let BASE_URL = import.meta.env.VITE_API_URL;
// if (BASE_URL.endsWith("/api")) {
//   BASE_URL = BASE_URL.replace("/api", "");
// }
// console.log("Connecting socket to:", BASE_URL);

// // 2. Get User Data
// let userData = JSON.parse(localStorage.getItem("user")) || null;

// // 3. Create and export socket instance
// export const socket = io(BASE_URL, {
//   transports: ["websocket", "polling"],
//   withCredentials: true,
//   auth: {
//     userId: userData?.id || userData?._id || null,
//   },
// });

// // 4. Attach event listeners
// socket.on("connect", () =>
//   console.log("✅ Connected to socket:", socket.id)
// );
// socket.on("connect_error", (err) =>
//   console.error("❌ Connection error:", err.message)
// );
// socket.on("disconnect", (reason) =>
//   console.warn("🔴 Disconnected from socket:", reason)
// );

// client/src/socket/socket.js
import { io } from "socket.io-client";

let BASE_URL = import.meta.env.VITE_API_URL;

// Remove /api if present
if (BASE_URL?.endsWith("/api")) {
  BASE_URL = BASE_URL.replace("/api", "");
}

console.log("📡 Connecting to:", BASE_URL);

let user =
  JSON.parse(localStorage.getItem("user")) ||
  JSON.parse(localStorage.getItem("employee")) ||
  JSON.parse(localStorage.getItem("admin")) ||
  null;

export const socket = io(BASE_URL, {
  transports: ["websocket", "polling"],
  withCredentials: true,
  auth: {
    userId: user?._id || user?.id || null,
  },
});

socket.on("connect", () => {
  console.log("🟢 Socket connected:", socket.id);
});

socket.on("disconnect", () => {
  console.log("🔴 Socket disconnected");
});
