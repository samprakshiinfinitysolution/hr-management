import React, { useEffect, useState } from "react";
import { socket } from "../socket/socket";

export default function ChatBox({ adminId, employeeId, userName }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  const roomId = `room_${adminId}_${employeeId}`;

  useEffect(() => {
    if (!adminId || !employeeId) return;

    socket.emit("joinRoom", roomId);

    socket.on("receiveMessage", (data) => {
      if (data.roomId === roomId) {
        setMessages((prev) => [...prev, data]);
      }
    });

    return () => {
      socket.off("receiveMessage");
    };
  }, [adminId, employeeId, roomId]);

  const handleSend = () => {
    if (!message.trim()) return;

    const data = {
      roomId,
      user: userName,
      message,
      time: new Date().toLocaleTimeString(),
    };

    socket.emit("sendMessage", data);
    setMessages((prev) => [...prev, data]);
    setMessage("");
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 w-full max-w-sm">
      <h3 className="font-bold text-lg mb-2">Chat Room</h3>
      <div className="h-64 overflow-y-auto border border-gray-300 dark:border-gray-700 rounded p-2 mb-2">
        {messages.map((m, i) => (
          <div key={i} className="mb-1">
            <strong>{m.user}: </strong>{m.message}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 border rounded px-2 py-1 dark:bg-gray-700 dark:text-white"
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type message..."
        />
        <button
          onClick={handleSend}
          className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
        >
          Send
        </button>
      </div>
    </div>
  );
}
