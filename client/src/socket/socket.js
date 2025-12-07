
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
