// // frontend/src/socket/socket.js
// import { io } from "socket.io-client";

// const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5002";
// export const socket = io(SOCKET_URL, { transports: ["websocket"] });

// socket.on("connect", () => {
//   console.log("Socket connected:", socket.id);
// });
// socket.on("connect_error", (err) => {
//   console.error("Socket connect error:", err.message);
// });
// socket.on("disconnect", (reason) => {
//   console.warn("Socket disconnected:", reason);
// });

// export default socket;


import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5002";

const socket = io(SOCKET_URL, {
  transports: ["websocket", "polling"], 
  reconnection: true,
  withCredentials: true,
  path: "/socket.io/", // ✅ Explicitly set the path
});

socket.on("connect", () => console.log("🟢 Connected to socket:", socket.id));
socket.on("connect_error", (err) => console.error("❌ Socket error:", err.message));
socket.on("disconnect", (reason) => console.warn("🔴 Socket disconnected:", reason));

export default socket;
