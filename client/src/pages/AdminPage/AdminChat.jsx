import { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import API from "../../utils/api";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import { Trash2, FileText } from "lucide-react";
import { socket } from "../../socket/socket.js";

export default function AdminChat() {
  const [users, setUsers] = useState([]);
  const [chatType, setChatType] = useState("employee");
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [adminId, setAdminId] = useState(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState([]);

  const user = useSelector((state) => state.auth?.user);
  const chatBoxRef = useRef(null);
  const inputRef = useRef(null);

  // ✅ Load Admin ID
  useEffect(() => {
    const storedRaw = localStorage.getItem("admin");
    const stored = storedRaw ? JSON.parse(storedRaw) : null;

    if (user?.id) {
      setAdminId(user.id);
      localStorage.setItem("admin", JSON.stringify(user));
    } else if (stored?.id) {
      setAdminId(stored.id);
    } else {
      console.warn("⚠️ No admin found (Redux + LocalStorage both empty)");
    }
  }, [user]);

  // ✅ Fetch users
  useEffect(() => {
    const endpoint =
      chatType === "employee" ? "/admin/employees" : "/admin/getAdmins";

    if (!endpoint) return;

    API.get(endpoint)
      .then((res) => {
        let data = res.data;
        if (adminId) data = res.data.filter((u) => u._id !== adminId);
        setUsers(data);
      })
      .catch(() => toast.error(`Failed to load ${chatType}s`));
  }, [chatType, adminId]);

  // ✅ Online users
  useEffect(() => {
    socket.on("onlineUsers", (users) => {
      setOnlineUsers(users);
    });
    return () => socket.off("onlineUsers");
  }, []);

  // ✅ Auto focus input
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [selectedUser]);

  // ✅ Join room & listen for messages
  useEffect(() => {
    if (!selectedUser || !adminId) return;

    const roomId = [selectedUser._id, adminId].sort().join("_");
    socket.emit("joinRoom", roomId);

    socket.on("connect", () => console.log("✅ Socket connected:", socket.id));
    socket.on("connect_error", (err) =>
      console.error("❌ Socket connect error:", err.message)
    );
    socket.on("disconnect", (reason) =>
      console.warn("🔴 Socket disconnected:", reason)
    );

    API.get(`/chat/${selectedUser._id}/${adminId}`)
      .then((res) => {
        const sorted = res.data.sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );
        setMessages(sorted);
      })
      .catch(() => toast.error("Failed to load messages"));

    // Add inside useEffect for joinRoom
socket.on("messageDelivered", ({ messageId }) => {
  setMessages((prev) =>
    prev.map((m) => (m._id === messageId ? { ...m, isDelivered: true } : m))
  );
});


    socket.on("receiveMessage", (msg) => {
      const validMsg =
        (msg.senderId === selectedUser._id && msg.receiverId === adminId) ||
        (msg.senderId === adminId && msg.receiverId === selectedUser._id);

      if (!validMsg) return;

      setMessages((prev) => {
        const exists = prev.some(
          (m) =>
            m._id === msg._id ||
            (m.message === msg.message &&
              m.senderId === msg.senderId &&
              Math.abs(new Date(m.createdAt) - new Date(msg.createdAt)) < 1000)
        );
        if (exists) return prev;
        return [...prev, msg].sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );
      });
    });

    // ✅ Update local messages when server confirms read
    socket.on("messageRead", ({ messageIds }) => {
      setMessages((prev) =>
        prev.map((m) =>
          messageIds.includes(m._id) ? { ...m, isRead: true } : m
        )
      );
    });



    return () => {
      socket.emit("leaveRoom", roomId);
      socket.off("receiveMessage");
      socket.off("messageRead");
    };
  }, [selectedUser, adminId]);

  // ✅ Auto-scroll on new messages
  useEffect(() => {
    const el = chatBoxRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, selectedUser]);

  // ✅ Mark messages as read when admin opens chat
  useEffect(() => {
    if (!selectedUser || !adminId || messages.length === 0) return;

    const unreadIds = messages
      .filter((m) => m.receiverId === adminId && !m.isRead)
      .map((m) => m._id);

    if (unreadIds.length > 0) {
      const room = [selectedUser._id, adminId].sort().join("_");
    console.log("📤 Sending confirmRead for:", unreadIds, "in room", room); // ✅ log

socket.emit("confirmRead", { messageIds: unreadIds, room });
    }
  }, [messages, selectedUser, adminId]);

  // ✅ Send text message
  const sendMessage = () => {
    if (!message.trim() || !selectedUser || !adminId) return;

    const room = [selectedUser._id, adminId].sort().join("_");
    const msgData = {
      room,
      senderId: adminId,
      receiverId: selectedUser._id,
      message,
      type: "text",
      createdAt: new Date().toISOString(),
    };

    socket.emit("sendMessage", msgData);
    setMessages((prev) => [...prev, msgData]);
    setMessage("");
  };

  // ✅ File upload handler
 const handleFileChange = async (e) => {
  toast.error("File upload is currently disabled.");
  // const file = e.target.files[0];
  // if (!file) return;

  // if (!adminId || !selectedUser?._id) {
  //   toast.error("Cannot send file: missing sender or receiver ID");
  //   e.target.value = "";
  //   return;
  // }

  // const token = localStorage.getItem("token");
  // if (!token) {
  //   toast.error("No auth token found");
  //   e.target.value = "";
  //   return;
  // }

  // try {
  //   toast.loading("Uploading file...", { id: "upload" });

  //   const formData = new FormData();
  //   formData.append("senderId", adminId);
  //   formData.append("receiverId", selectedUser._id);
  //   formData.append("file", file);

  //   console.log("Uploading file:", {
  //     senderId: adminId,
  //     receiverId: selectedUser._id,
  //     fileName: file.name,
  //     fileType: file.type,
  //   });

  //   const res = await API.post("/chat", formData, {
  //     headers: {
  //       "Content-Type": "multipart/form-data",
  //       Authorization: `Bearer ${token}`,
  //     },
  //   });

  //   toast.dismiss("upload");

  //   if (res.status === 201) {
  //     const newMsg = res.data;
  //     socket.emit("sendMessage", newMsg);
  //     setMessages((prev) => [...prev, newMsg]);
  //     toast.success("File sent successfully");
  //   } else {
  //     console.error("Upload failed:", res.data);
  //     toast.error("Failed to upload file");
  //   }
  // } catch (err) {
  //   console.error("Upload error:", err.response?.data || err.message);
  //   toast.dismiss("upload");
  //   toast.error("Upload failed");
  // } finally {
  //   e.target.value = "";
  // }
};


  // ✅ Delete chat/message
  const confirmDeleteMessage = (msgId) => {
    setDeleteTarget({ type: "message", id: msgId });
    setShowDeleteModal(true);
  };

  const confirmDeleteChat = () => {
    setDeleteTarget({ type: "chat" });
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    try {
      if (deleteTarget.type === "message") {
        await API.delete(`/chat/message/${deleteTarget.id}`);
        setMessages((prev) => prev.filter((m) => m._id !== deleteTarget.id));
        toast.success("Message deleted");
      } else if (deleteTarget.type === "chat" && selectedUser && adminId) {
        await API.delete(`/chat/${selectedUser._id}/${adminId}`);
        setMessages([]);
        toast.success("Chat deleted");
      }
      setShowDeleteModal(false);
    } catch {
      toast.error("Failed to delete");
    } finally {
      setIsDeleting(false);
    }
  };

  // ✅ Group messages by date
  const groupedMessages = messages.reduce((groups, msg) => {
    const key = new Date(msg.createdAt).toDateString();
    if (!groups[key]) groups[key] = [];
    groups[key].push(msg);
    return groups;
  }, {});

  const getDateLabel = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const diff = Math.floor((today - date) / (1000 * 60 * 60 * 24));
    if (diff === 0) return "Today";
    if (diff === 1) return "Yesterday";
    return date.toLocaleDateString([], {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="flex flex-col md:flex-row h-[85vh] border rounded-xl overflow-hidden shadow-md transition-colors duration-300 max-w-full">
      {/* SIDEBAR */}
      <div
        className={`w-full md:w-1/3 lg:w-1/4 border-r dark:border-gray-700 p-4 overflow-y-auto ${
          selectedUser ? "hidden md:block" : "block"
        }`}
      >
        <h2 className="font-semibold text-lg mb-4 text-blue-600 text-center md:text-left">
          Chat With
        </h2>
        <div className="flex justify-center md:justify-start mb-5 gap-2 flex-wrap">
          <button
            onClick={() => setChatType("employee")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              chatType === "employee"
                ? "bg-blue-600 text-white"
                : "border hover:bg-gray-200 hover:text-black cursor-pointer"
            }`}
          >
            Employees
          </button>
          <button
            onClick={() => setChatType("admin")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              chatType === "admin"
                ? "bg-blue-600 text-white"
                : "border hover:bg-gray-200 hover:text-black cursor-pointer"
            }`}
          >
            Admins
          </button>
        </div>
        {users.length > 0 ? (
          <div className="space-y-2">
            {users.map((u) => (
              <div
                key={u._id}
                onClick={() => setSelectedUser(u)}
                className={`p-3 cursor-pointer rounded-lg text-center md:text-left text-sm font-medium transition flex items-center gap-2 ${
                  selectedUser?._id === u._id
                    ? "bg-blue-600 text-white"
                    : "border hover:bg-gray-200 hover:text-black"
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    onlineUsers.includes(u._id)
                      ? "bg-green-500"
                      : "bg-red-500"
                  }`}
                  title={onlineUsers.includes(u._id) ? "Online" : "Offline"}
                ></span>
                <span>{u.name}</span>
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
      <div
        className={`flex-1 flex flex-col relative w-full overflow-hidden ${
          !selectedUser ? "hidden md:flex" : "flex"
        }`}
      >
        {selectedUser ? (
          <>
            <div className="p-4 border-b dark:border-gray-700 font-semibold text-blue-600 flex justify-between items-center sticky top-0 z-10">
              <span>Chat with {selectedUser.name}</span>
              <button
                onClick={confirmDeleteChat}
                className="text-red-600 hover:text-red-800 flex items-center gap-1 text-sm"
              >
                <Trash2 size={18} /> Delete Chat
              </button>
            </div>

            {/* Messages */}
            <div ref={chatBoxRef} className="flex-1 p-4 overflow-y-auto space-y-4">
              {Object.keys(groupedMessages).map((dateKey) => (
                <div key={dateKey}>
                  <div className="text-center text-gray-500 text-xs my-3">
                    {getDateLabel(dateKey)}
                  </div>
                  <div className="flex flex-col space-y-2">
                    {groupedMessages[dateKey].map((m, i) => (
                      <div
                        key={m._id || i}
                        className={`relative group px-3 pr-6 py-2 rounded-2xl max-w-[80%] md:max-w-[70%] break-words shadow-sm transition ${
                          m.senderId === adminId
                            ? "bg-blue-600 text-white ml-auto self-end rounded-br-sm"
                            : "bg-gray-200 text-black dark:bg-blue-900 dark:text-white self-start rounded-bl-sm"
                        }`}
                      >
                        {m.type === "file" || m.type === "image" ? (
                          m.message.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                            <img
                              src={m.message}
                              alt="attachment"
                              className="max-w-[200px] rounded-lg cursor-pointer hover:opacity-90 transition"
                              onClick={() => window.open(m.message, "_blank")}
                            />
                          ) : (
                            <a
                              href={m.message}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline text-sm text-blue-200 hover:text-blue-100 break-all"
                            >
                              <span className="truncate max-w-[calc(100%-2rem)] inline-block text-red-600">
                                {decodeURIComponent(m.message.split("/").pop())}
                              </span>
                            </a>
                          )
                        ) : (
                          <p className="whitespace-pre-wrap break-words leading-snug pr-10">
                            {m.message}
                          </p>
                        )}

                        <div className="absolute bottom-1 right-2 flex items-center gap-1 text-[10px] opacity-75">
                          <span>
                            {new Date(m.createdAt).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {m.senderId === adminId && (
                            <span className="ml-1 flex items-center">
                              {m.isRead ? (
                                <span className="text-black text-[11px]">✓✓</span>
                              ) : (
                                <span className="text-white text-[11px]">✓</span>
                              )}
                            </span>
                          )}
                        </div>

                        {m.senderId === adminId && m._id && (
                          <button
                            onClick={() => confirmDeleteMessage(m._id)}
                            className="absolute top-1 right-1 hidden group-hover:block text-xs text-red-300 hover:text-red-800"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-2 sm:p-3 flex items-center gap-2 border-t dark:border-gray-700 sticky bottom-0 z-20">
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => document.getElementById("fileInput").click()}
                  className="p-2 bg-gray-200 dark:bg-gray-700 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                  title="Attach file"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.8}
                    stroke="currentColor"
                    className="w-5 h-5 text-gray-700 dark:text-gray-300"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                </button>
                <input
                  id="fileInput"
                  type="file"
                  accept="image/*,.pdf,.docx,.xlsx"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>
              <input
                ref={inputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                className="flex-1 min-w-0 border border-gray-300 p-2 rounded-lg text-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Type a message..."
              />
              <button
                onClick={sendMessage}
                className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-5 py-2 rounded-lg text-sm font-medium transition"
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 text-center p-5 text-sm">
            Select a {chatType} to start chatting
          </div>
        )}

        {/* Delete Modal */}
        {showDeleteModal && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl w-full max-w-sm text-center">
              <h3 className="text-lg font-semibold mb-3 text-red-600">
                {deleteTarget?.type === "message"
                  ? "Delete this message?"
                  : "Delete entire chat?"}
              </h3>
              <div className="flex justify-center gap-3 mt-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 transition text-sm"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
                  disabled={isDeleting}
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
//ok no control


