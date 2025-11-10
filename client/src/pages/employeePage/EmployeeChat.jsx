// // frontend/src/components/chat/EmployeeChat.jsx
// import { useEffect, useState, useRef } from "react";
// import API from "../../utils/api";
// import { useSelector } from "react-redux";
// import toast from "react-hot-toast";
// import { Trash2 } from "lucide-react";
// import { socket } from "../../socket/socket.js"; // use shared socket

// export default function EmployeeChat() {
//   const [users, setUsers] = useState([]);
//   const [chatType, setChatType] = useState("admin");
//   const [selectedUser, setSelectedUser] = useState(null);
//   const [messages, setMessages] = useState([]);
//   const [message, setMessage] = useState("");
//   const [employeeId, setEmployeeId] = useState(null);

//   const [showDeleteModal, setShowDeleteModal] = useState(false);
//   const [deleteTarget, setDeleteTarget] = useState(null);
//   const [isDeleting, setIsDeleting] = useState(false);

//   const user = useSelector((state) => state.auth?.user);
//   const chatBoxRef = useRef(null);

//   // Load employee id from redux or localStorage
//   useEffect(() => {
//     const stored = JSON.parse(localStorage.getItem("employee") || "null");
//     if (user?.id) {
//       setEmployeeId(user.id);
//       localStorage.setItem("employee", JSON.stringify(user));
//     } else if (stored?.id) {
//       setEmployeeId(stored.id);
//     } else {
//       console.warn("No employee found (Redux + LocalStorage empty)");
//     }
//   }, [user]);

//   // Fetch user list: admins or employees
//   useEffect(() => {
//     if (!employeeId) {
//       setUsers([]);
//       return;
//     }
//     const endpoint =
//       chatType === "admin" ? "/employees/admins" : "/employees/chat-employees";
//     setUsers([]);
//     setSelectedUser(null);

//     API.get(endpoint)
//       .then((res) => {
//         // filter out current user
//         const list = (res.data || []).filter((u) => u._id !== employeeId);
//         setUsers(list);
//       })
//       .catch((err) => {
//         console.error("Fetch users error:", err.response?.data || err.message);
//         toast.error(`Failed to load ${chatType}s`);
//       });
//   }, [chatType, employeeId]);

//   // Join room & load messages when selectedUser changes
//   useEffect(() => {
//     if (!selectedUser || !employeeId) return;

//     const roomId = [selectedUser._id, employeeId].sort().join("_");
//     socket.emit("joinRoom", roomId);

//     API.get(`/chat/${selectedUser._id}/${employeeId}`)
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

//     // Listener for incoming messages
//     const onReceive = (msg) => {
//       const valid =
//         (msg.senderId === selectedUser._id && msg.receiverId === employeeId) ||
//         (msg.senderId === employeeId && msg.receiverId === selectedUser._id);
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
//   }, [selectedUser, employeeId]);

//   // Auto-scroll when messages change
//   useEffect(() => {
//     const el = chatBoxRef.current;
//     if (!el) return;
//     el.scrollTop = el.scrollHeight;
//   }, [messages]);

//   // Send message
//   const sendMessage = () => {
//     if (!message.trim() || !selectedUser || !employeeId) return;

//     const room = [selectedUser._id, employeeId].sort().join("_");
//     const msgData = {
//       room,
//       senderId: employeeId,
//       receiverId: selectedUser._id,
//       message: message.trim(),
//       createdAt: new Date().toISOString(),
//     };

//     // emit via socket (socket server saves to DB and emits to room)
//     socket.emit("sendMessage", msgData);

//     // Optimistic UI
//     setMessages((prev) =>
//       [...prev, msgData].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
//     );
//     setMessage("");
//   };

//   // Delete message or entire chat
//   const handleDelete = async () => {
//     if (!deleteTarget) return;
//     setIsDeleting(true);
//     try {
//       if (deleteTarget.type === "message") {
//         await API.delete(`/chat/message/${deleteTarget.id}`);
//         setMessages((prev) => prev.filter((m) => m._id !== deleteTarget.id));
//       } else if (deleteTarget.type === "chat") {
//         await API.delete(`/chat/${selectedUser._id}/${employeeId}`);
//         setMessages([]);
//       }
//       toast.success("Deleted");
//       setShowDeleteModal(false);
//     } catch (err) {
//       console.error("Delete failed:", err.response?.data || err.message);
//       toast.error("Delete failed");
//     } finally {
//       setIsDeleting(false);
//     }
//   };

//   return (
//     <div className="flex flex-col md:flex-row h-[85vh] border rounded-xl overflow-hidden shadow-md">
//       {/* SIDEBAR */}
//       <div
//         className={`w-full md:w-1/3 border-r p-4 bg-gray-50 dark:bg-gray-800 overflow-y-auto ${
//           selectedUser ? "hidden md:block" : "block"
//         }`}
//       >
//         <h2 className="text-lg font-semibold text-blue-600 mb-4 text-center md:text-left">
//           Chat With
//         </h2>

//         <div className="flex justify-center gap-2 mb-4">
//           <button
//             onClick={() => setChatType("admin")}
//             className={`px-4 py-2 rounded ${
//               chatType === "admin"
//                 ? "bg-blue-600 text-white"
//                 : "bg-gray-200 dark:bg-gray-700"
//             }`}
//           >
//             Admins
//           </button>
//           <button
//             onClick={() => setChatType("employee")}
//             className={`px-4 py-2 rounded ${
//               chatType === "employee"
//                 ? "bg-blue-600 text-white"
//                 : "bg-gray-200 dark:bg-gray-700"
//             }`}
//           >
//             Employees
//           </button>
//         </div>

//         {users.length > 0 ? (
//           <div className="space-y-2">
//             {users.map((u) => (
//               <div
//                 key={u._id}
//                 onClick={() => setSelectedUser(u)}
//                 className={`p-3 cursor-pointer rounded-lg ${
//                   selectedUser?._id === u._id
//                     ? "bg-blue-600 text-white"
//                     : "bg-white dark:bg-gray-700 hover:bg-gray-100"
//                 }`}
//               >
//                 {u.name}
//               </div>
//             ))}
//           </div>
//         ) : (
//           <p className="text-gray-500 text-sm text-center">No {chatType}s available</p>
//         )}
//       </div>

//       {/* CHAT AREA */}
//       <div className={`flex-1 flex flex-col ${!selectedUser ? "hidden md:flex" : "flex"}`}>
//         {selectedUser ? (
//           <>
//             <div className="p-4 border-b flex justify-between items-center">
//               <span className="font-semibold text-blue-600">Chat with {selectedUser.name}</span>
//               <button
//                 onClick={() => {
//                   setDeleteTarget({ type: "chat" });
//                   setShowDeleteModal(true);
//                 }}
//                 className="text-red-600 text-sm flex items-center gap-1"
//               >
//                 <Trash2 size={16} /> Delete Chat
//               </button>
//             </div>

//             <div ref={chatBoxRef} className="flex-1 p-4 overflow-y-auto space-y-2 bg-gray-100 dark:bg-gray-900 chat-box">
//               {messages.length ? (
//                 messages.map((m, i) => (
//                   <div
//                     key={m._id || i}
//                     className={`px-3 py-2 rounded-xl max-w-[70%] ${
//                       m.senderId === employeeId ? "bg-blue-600 text-white self-end ml-auto" : "bg-gray-200 text-black self-start"
//                     }`}
//                   >
//                     {m.message}
//                   </div>
//                 ))
//               ) : (
//                 <p className="text-gray-400 text-center">No messages yet</p>
//               )}
//             </div>

//             <div className="p-3 flex gap-2 border-t">
//               <input
//                 value={message}
//                 onChange={(e) => setMessage(e.target.value)}
//                 onKeyDown={(e) => { if (e.key === "Enter") sendMessage(); }}
//                 className="flex-1 p-2 border rounded-lg"
//                 placeholder="Type a message..."
//               />
//               <button onClick={sendMessage} className="bg-blue-600 text-white px-5 py-2 rounded-lg">Send</button>
//             </div>
//           </>
//         ) : (
//           <div className="flex items-center justify-center h-full text-gray-500">Select a {chatType} to start chatting</div>
//         )}

//         {/* Delete Modal */}
//         {showDeleteModal && (
//           <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
//             <div className="bg-white p-5 rounded-lg shadow-xl text-center">
//               <p className="mb-4 text-red-600 font-semibold">
//                 {deleteTarget?.type === "chat" ? "Delete entire chat?" : "Delete this message?"}
//               </p>
//               <div className="flex justify-center gap-4">
//                 <button onClick={() => setShowDeleteModal(false)} className="px-4 py-2 bg-gray-300 rounded-lg">Cancel</button>
//                 <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg">{isDeleting ? "Deleting..." : "Delete"}</button>
//               </div>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }



import { useEffect, useState, useRef } from "react";
import API from "../../utils/api";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import { Trash2 } from "lucide-react";
import socket from "../../socket/socket.js"; // ✅ default import

export default function EmployeeChat() {
  const [users, setUsers] = useState([]);
  const [chatType, setChatType] = useState("admin"); // default show admins
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [employeeId, setEmployeeId] = useState(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const user = useSelector((state) => state.auth?.user);
  const chatBoxRef = useRef(null);

  // 🔹 Load employee ID from Redux or localStorage
useEffect(() => {
  const storedEmployee = JSON.parse(localStorage.getItem("employee") || "null");
  const storedToken = localStorage.getItem("token");

  if (user?.id) {
    setEmployeeId(user.id);
    localStorage.setItem("employee", JSON.stringify(user));
  } else if (storedEmployee?.id) {
    setEmployeeId(storedEmployee.id);
  } else {
    console.warn("⚠️ No employee found (Redux + LocalStorage empty)");
    if (!storedToken) {
      toast.error("Session expired. Please log in again.");
    }
  }
}, [user]);



  // 🔹 Fetch Admins or Employees list
  useEffect(() => {
    const fetchUsers = () => {
      if (!employeeId) return; // Don't fetch if employeeId is not set

      // Use the new centralized endpoints
      const endpoint =
        chatType === "admin"
          ? "/admin/chat-admins-for-employee" // Fetches only admins
          : "/admin/chat-users";   // Fetches all users, then we filter for employees

      API.get(endpoint)
        .then((res) => {
          const allUsers = res.data || [];
          // If chatType is 'employee', filter only employees from the full list
          const filteredUsers = chatType === 'employee' 
            ? allUsers.filter(u => u.userType === 'employee' && u._id !== employeeId)
            : allUsers;
          setUsers(filteredUsers);
        })
        .catch((err) => {
          toast.error(`Failed to load ${chatType}s`);
        });
    };
    fetchUsers();
  }, [chatType, employeeId]);
  // 🔹 Join room & load chat history
  useEffect(() => {
    if (!selectedUser || !employeeId) return;

    const roomId = [selectedUser._id, employeeId].sort().join("_");
    socket.emit("joinRoom", roomId);

    // Load previous messages
    API.get(`/chat/${selectedUser._id}/${employeeId}`)
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

    // Listen for new messages
    const onReceive = (msg) => {
      const valid =
        (msg.senderId === selectedUser._id && msg.receiverId === employeeId) ||
        (msg.senderId === employeeId && msg.receiverId === selectedUser._id);
      if (!valid) return;
      setMessages((prev) => [...prev, msg]);
    };

    socket.on("receiveMessage", onReceive);

    return () => {
      socket.emit("leaveRoom", roomId);
      socket.off("receiveMessage", onReceive);
    };
  }, [selectedUser, employeeId]);

  // 🔹 Auto scroll to bottom
  useEffect(() => {
    const el = chatBoxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // 🔹 Send message
  const sendMessage = () => {
    if (!message.trim() || !selectedUser || !employeeId) return;

    const room = [selectedUser._id, employeeId].sort().join("_");
    const msgData = {
      room,
      senderId: employeeId,
      receiverId: selectedUser._id,
      message: message.trim(),
      createdAt: new Date().toISOString(),
    };

    // Emit message via socket (server will save and broadcast)
    socket.emit("sendMessage", msgData);

    // Optimistic UI
    setMessages((prev) => [...prev, msgData]);
    setMessage("");
  };

  // 🔹 Delete chat or message
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      if (deleteTarget.type === "chat") {
        await API.delete(`/chat/${selectedUser._id}/${employeeId}`);
        setMessages([]);
      } else if (deleteTarget.type === "message") {
        await API.delete(`/chat/message/${deleteTarget.id}`);
        setMessages((prev) => prev.filter((m) => m._id !== deleteTarget.id));
      }
      toast.success("Deleted");
    } catch (err) {
      console.error("Delete failed:", err.response?.data || err.message);
      toast.error("Delete failed");
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[85vh] border rounded-xl overflow-hidden shadow-md">
      {/* SIDEBAR */}
      <div className="w-full md:w-1/3 border-r p-4 bg-gray-50 dark:bg-gray-800 overflow-y-auto">
        <h2 className="text-lg font-semibold text-blue-600 mb-4 text-center">
          Chat With
        </h2>

        <div className="flex justify-center gap-2 mb-4">
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
        </div>

        {users.length > 0 ? (
          users.map((u) => (
            <div
              key={u._id}
              onClick={() => setSelectedUser(u)}
              className={`p-3 cursor-pointer rounded-lg mb-2 ${
                selectedUser?._id === u._id
                  ? "bg-blue-600 text-white"
                  : "bg-white dark:bg-gray-700 hover:bg-gray-100"
              }`}
            >
              {u.name}
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500 text-sm">
            No {chatType}s available
          </p>
        )}
      </div>

      {/* CHAT AREA */}
      <div className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b flex justify-between items-center">
              <span className="font-semibold text-blue-600">
                Chat with {selectedUser.name}
              </span>
              <button
                onClick={() => {
                  setDeleteTarget({ type: "chat" });
                  setShowDeleteModal(true);
                }}
                className="text-red-600 text-sm flex items-center gap-1"
              >
                <Trash2 size={16} /> Delete Chat
              </button>
            </div>

            {/* Chat Messages */}
            <div
              ref={chatBoxRef}
              className="flex-1 p-4 overflow-y-auto space-y-2 bg-gray-100 dark:bg-gray-900"
            >
              {messages.length ? (
                messages.map((m, i) => (
                  <div
                    key={m._id || i}
                    className={`px-3 py-2 rounded-xl max-w-[70%] ${
                      m.senderId === employeeId
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

            {/* Input Box */}
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
          <div className="flex items-center justify-center h-full text-gray-500">
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
