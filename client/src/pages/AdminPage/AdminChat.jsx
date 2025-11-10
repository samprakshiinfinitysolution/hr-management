// // frontend/src/components/chat/AdminChat.jsx
// import { useEffect, useState, useRef } from "react";
// import API from "../../utils/api";
// import { useSelector } from "react-redux";
// import toast from "react-hot-toast";
// import { Trash2 } from "lucide-react";
// import { socket } from "../../socket/socket.js";

// export default function AdminChat() {
//   const [users, setUsers] = useState([]);
//   const [chatType, setChatType] = useState("employee");
//   const [selectedUser, setSelectedUser] = useState(null);
//   const [messages, setMessages] = useState([]);
//   const [message, setMessage] = useState("");
//   const admin = useSelector((state) => state.auth?.user);
//   const chatBoxRef = useRef(null);

//   // load users list
//   useEffect(() => {
//     if (!admin?.id) return;
//     const endpoint = chatType === "employee" ? "/admin/employees" : "/admin/getAdmins";
//     API.get(endpoint)
//       .then((res) => {
//         const data = (res.data || []).filter((u) => u._id !== admin.id);
//         setUsers(data);
//       })
//       .catch((err) => {
//         console.error("Load users error:", err.response?.data || err.message);
//         toast.error("Failed to load users");
//       });
//   }, [chatType, admin]);

//   // join room & load messages
//   useEffect(() => {
//     if (!selectedUser || !admin?.id) return;
//     const roomId = [selectedUser._id, admin.id].sort().join("_");
//     socket.emit("joinRoom", roomId);

//     API.get(`/chat/${selectedUser._id}/${admin.id}`)
//       .then((res) => {
//         const sorted = (res.data || []).sort(
//           (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
//         );
//         setMessages(sorted);
//       })
//       .catch((err) => {
//         console.error("Load messages error:", err.response?.data || err.message);
//         toast.error("Failed to load messages");
//       });

//     const onReceive = (msg) => {
//       const valid =
//         (msg.senderId === selectedUser._id && msg.receiverId === admin.id) ||
//         (msg.senderId === admin.id && msg.receiverId === selectedUser._id);
//       if (!valid) return;
//       setMessages((prev) =>
//         [...prev, msg].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
//       );
//     };

//     socket.on("receiveMessage", onReceive);
//     return () => {
//       socket.emit("leaveRoom", roomId);
//       socket.off("receiveMessage", onReceive);
//     };
//   }, [selectedUser, admin]);

//   useEffect(() => {
//     const el = chatBoxRef.current;
//     if (!el) return;
//     el.scrollTop = el.scrollHeight;
//   }, [messages]);

//   const sendMessage = () => {
//     if (!message.trim() || !selectedUser || !admin?.id) return;
//     const msgData = {
//       room: [selectedUser._id, admin.id].sort().join("_"),
//       senderId: admin.id,
//       receiverId: selectedUser._id,
//       message: message.trim(),
//       createdAt: new Date().toISOString(),
//     };
//     socket.emit("sendMessage", msgData);
//     setMessages((prev) => [...prev, msgData]);
//     setMessage("");
//   };

//   const deleteChat = async () => {
//     if (!selectedUser || !admin?.id) return;
//     try {
//       await API.delete(`/chat/${selectedUser._1d || selectedUser._id}/${admin.id}`);
//       setMessages([]);
//       toast.success("Chat deleted");
//     } catch (err) {
//       console.error("Delete chat error:", err.response?.data || err.message);
//       toast.error("Failed to delete chat");
//     }
//   };

//   return (
//     <div className="flex flex-col md:flex-row h-[85vh] border rounded-xl overflow-hidden shadow-md">
//       <div className="w-full md:w-1/3 border-r p-4 bg-gray-50 dark:bg-gray-800 overflow-y-auto">
//         <h2 className="text-lg font-semibold text-blue-600 mb-4 text-center md:text-left">Chat With</h2>
//         <div className="flex justify-center gap-2 mb-4">
//           <button onClick={() => setChatType("employee")} className={`px-4 py-2 rounded ${chatType === "employee" ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700"}`}>Employees</button>
//           <button onClick={() => setChatType("admin")} className={`px-4 py-2 rounded ${chatType === "admin" ? "bg-blue-600 text-white" : "bg-gray-200 dark:bg-gray-700"}`}>Admins</button>
//         </div>

//         {users.length > 0 ? (
//           <div className="space-y-2">
//             {users.map((u) => (
//               <div key={u._id} onClick={() => setSelectedUser(u)} className={`p-3 rounded-lg cursor-pointer ${selectedUser?._id === u._id ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-700 hover:bg-gray-200"}`}>
//                 {u.name}
//               </div>
//             ))}
//           </div>
//         ) : (
//           <p className="text-gray-500 text-sm text-center">No {chatType}s available</p>
//         )}
//       </div>

//       <div className={`flex-1 flex flex-col ${!selectedUser ? "hidden md:flex" : "flex"}`}>
//         {selectedUser ? (
//           <>
//             <div className="p-4 border-b flex justify-between items-center">
//               <span className="font-semibold text-blue-600">Chat with {selectedUser.name}</span>
//               <button onClick={() => { setShowDeleteModal(true); setDeleteTarget({ type: "chat" }); }} className="text-red-600 text-sm flex items-center gap-1"><Trash2 size={16} /> Delete Chat</button>
//             </div>

//             <div ref={chatBoxRef} className="flex-1 p-4 overflow-y-auto space-y-2 bg-gray-100 dark:bg-gray-900">
//               {messages.length ? (
//                 messages.map((m, i) => (
//                   <div key={m._id || i} className={`px-3 py-2 rounded-xl max-w-[70%] ${m.senderId === admin.id ? "bg-blue-600 text-white ml-auto" : "bg-gray-200 text-black"}`}>
//                     {m.message}
//                   </div>
//                 ))
//               ) : (
//                 <p className="text-gray-400 text-center">No messages yet</p>
//               )}
//             </div>

//             <div className="p-3 flex gap-2 border-t">
//               <input value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendMessage()} className="flex-1 p-2 border rounded-lg" placeholder="Type a message..." />
//               <button onClick={sendMessage} className="bg-blue-600 text-white px-5 py-2 rounded-lg">Send</button>
//             </div>
//           </>
//         ) : (
//           <div className="flex items-center justify-center h-full text-gray-500">Select a {chatType} to start chatting</div>
//         )}
//       </div>
//     </div>
//   );
// }


// frontend/src/components/chat/AdminChat.jsx
import { useEffect, useState, useRef } from "react";
import API from "../../utils/api";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import { Trash2 } from "lucide-react";
import socket from "../../socket/socket.js"; // ✅ use default import

export default function AdminChat() {
  const [users, setUsers] = useState([]);
  const [chatType, setChatType] = useState("employee"); // default employee list
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const admin = useSelector((state) => state.auth?.user);
  const chatBoxRef = useRef(null);

  // 🔹 Load users list: Employees / Admins / HR / Managers
  useEffect(() => {
    if (!admin?.id) return;

    const endpoint =
      chatType === "employee" ? "/admin/employees" : "/admin/getAdmins";

    API.get(endpoint)
      .then((res) => {
        const data = (res.data || []).filter((u) => u._id !== admin.id);
        setUsers(data);
      })
      .catch((err) => {
        console.error("Load users error:", err.response?.data || err.message);
        toast.error(`Failed to load ${chatType}s`);
      });
  }, [chatType, admin]);

  // 🔹 Join Room & Load Messages
  useEffect(() => {
    if (!selectedUser || !admin?.id) return;

    const roomId = [selectedUser._id, admin.id].sort().join("_");
    socket.emit("joinRoom", roomId);

    // Fetch existing chat history
    API.get(`/chat/${selectedUser._id}/${admin.id}`)
      .then((res) => {
        const sorted = (res.data || []).sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );
        setMessages(sorted);
      })
      .catch((err) => {
        console.error("Load messages error:", err.response?.data || err.message);
        toast.error("Failed to load messages");
      });

    // Listen for incoming real-time messages
    const handleReceive = (msg) => {
      const valid =
        (msg.senderId === selectedUser._id && msg.receiverId === admin.id) ||
        (msg.senderId === admin.id && msg.receiverId === selectedUser._id);
      if (!valid) return;
      setMessages((prev) => [...prev, msg]);
    };

    socket.on("receiveMessage", handleReceive);

    return () => {
      socket.emit("leaveRoom", roomId);
      socket.off("receiveMessage", handleReceive);
    };
  }, [selectedUser, admin]);

  // 🔹 Auto-scroll when messages update
  useEffect(() => {
    chatBoxRef.current?.scrollTo(0, chatBoxRef.current.scrollHeight);
  }, [messages]);

  // 🔹 Send message
  const sendMessage = () => {
    if (!message.trim() || !selectedUser || !admin?.id) return;

    const room = [selectedUser._id, admin.id].sort().join("_");
    const msgData = {
      room,
      senderId: admin.id,
      receiverId: selectedUser._id,
      message: message.trim(),
      createdAt: new Date().toISOString(),
    };

    socket.emit("sendMessage", msgData);

    // Optimistic UI update
    setMessages((prev) => [...prev, msgData]);
    setMessage("");
  };

  // 🔹 Delete message or chat
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === "chat") {
        await API.delete(`/chat/${selectedUser._id}/${admin.id}`);
        setMessages([]);
      } else if (deleteTarget.type === "message") {
        await API.delete(`/chat/message/${deleteTarget.id}`);
        setMessages((prev) => prev.filter((m) => m._id !== deleteTarget.id));
      }
      toast.success("Deleted successfully");
    } catch (err) {
      console.error("Delete failed:", err.response?.data || err.message);
      toast.error("Delete failed");
    } finally {
      setShowDeleteModal(false);
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[85vh] border rounded-xl overflow-hidden shadow-md">
      {/* SIDEBAR */}
      <div className="w-full md:w-1/3 border-r p-4 bg-gray-50 dark:bg-gray-800 overflow-y-auto">
        <h2 className="text-lg font-semibold text-blue-600 mb-4 text-center">
          Chat With
        </h2>

        {/* Tabs */}
        <div className="flex justify-center gap-2 mb-4">
          <button
            onClick={() => setChatType("employee")}
            className={`px-4 py-2 rounded ${
              chatType === "employee"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 dark:bg-gray-700"
            }`}
          >
            Employees
          </button>
          <button
            onClick={() => setChatType("admin")}
            className={`px-4 py-2 rounded ${
              chatType === "admin"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 dark:bg-gray-700"
            }`}
          >
            Admins
          </button>
        </div>

        {/* User list */}
        {users.length > 0 ? (
          <div className="space-y-2">
            {users.map((u) => (
              <div
                key={u._id}
                onClick={() => setSelectedUser(u)}
                className={`p-3 cursor-pointer rounded-lg ${
                  selectedUser?._id === u._id
                    ? "bg-blue-600 text-white"
                    : "bg-white dark:bg-gray-700 hover:bg-gray-100"
                }`}
              >
                {u.name}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm text-center">
            No {chatType}s available
          </p>
        )}
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            <div className="p-4 border-b flex justify-between items-center">
              <span className="font-semibold text-blue-600">
                Chat with {selectedUser.name}
              </span>
              <button
                onClick={() => {
                  setShowDeleteModal(true);
                  setDeleteTarget({ type: "chat" });
                }}
                className="text-red-600 text-sm flex items-center gap-1"
              >
                <Trash2 size={16} /> Delete Chat
              </button>
            </div>

            {/* Messages */}
            <div
              ref={chatBoxRef}
              className="flex-1 p-4 overflow-y-auto space-y-2 bg-gray-100 dark:bg-gray-900"
            >
              {messages.length ? (
                messages.map((m, i) => (
                  <div
                    key={m._id || i}
                    className={`px-3 py-2 rounded-xl max-w-[70%] ${
                      m.senderId === admin.id
                        ? "bg-blue-600 text-white ml-auto"
                        : "bg-gray-200 text-black"
                    }`}
                  >
                    {m.message}
                  </div>
                ))
              ) : (
                <p className="text-gray-400 text-center">No messages yet</p>
              )}
            </div>

            {/* Input */}
            <div className="p-3 flex gap-2 border-t">
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                className="flex-1 p-2 border rounded-lg"
                placeholder="Type a message..."
              />
              <button
                onClick={sendMessage}
                className="bg-blue-600 text-white px-5 py-2 rounded-lg"
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="flex justify-center items-center flex-1 text-gray-500">
            Select a {chatType} to start chatting
          </div>
        )}

        {/* Delete Modal */}
        {showDeleteModal && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="bg-white p-5 rounded-lg shadow-xl text-center">
              <p className="mb-4 text-red-600 font-semibold">
                {deleteTarget?.type === "chat"
                  ? "Delete entire chat?"
                  : "Delete this message?"}
              </p>
              <div className="flex justify-center gap-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 bg-gray-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg"
                >
                  {isDeleting ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
