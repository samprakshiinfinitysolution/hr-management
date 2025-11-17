import { useEffect, useState, useRef } from "react";
import API from "../../utils/api";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import { Trash2, X, Check, CheckCheck } from "lucide-react";
import { socket } from "../../socket/socket.js";

export default function EmployeeChat() {
  const [users, setUsers] = useState([]);
  const [chatType, setChatType] = useState("admin");
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState("");
  const [employeeId, setEmployeeId] = useState(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState([]);

  const user = useSelector((state) => state.auth?.user);
  const chatBoxRef = useRef(null);
  const inputRef = useRef(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewType, setPreviewType] = useState(null);
  const longPressTimer = useRef(null);
  const isLongPress = useRef(false);

  // ⬇️ Add these two
  const onImagePreview = (url) => {
    setPreviewUrl(url);
    setPreviewType("image");
  };

  const onFilePreview = (url) => {
    setPreviewUrl(url);
    setPreviewType("file");
  };
  // Load employee ID from user or localStorage
  useEffect(() => {
    const storedRaw = localStorage.getItem("employee");
    const stored = storedRaw ? JSON.parse(storedRaw) : null;

    if (user?._id) {
      setEmployeeId(user._id);
      // localStorage.setItem("employee", JSON.stringify(user)); // Removed: localStorage is updated during login
    } else if (stored?._id) {
      setEmployeeId(stored._id);
    }
  }, [user]);

  // Load users list
  useEffect(() => {
    const endpoint = chatType === "admin" ? "/admins" : "/employees";
    if (!employeeId) return; // Don't fetch until employeeId is available

    setUsers([]);
    setSelectedUser(null);

    API.get(endpoint)
      .then((res) => {
        setUsers(res.data.filter((u) => u._id !== employeeId)); // Filter out self
      })
      .catch(() => toast.error(`Failed to load ${chatType}s`));
  }, [chatType, employeeId]); // Add employeeId to dependency array

  // Online users
  useEffect(() => {
    socket.on("onlineUsers", (users) => setOnlineUsers(users));
    return () => socket.off("onlineUsers");
  }, []);

  // Join chat room & listen for messages
  useEffect(() => {
    if (!selectedUser || !employeeId) return;

    const roomId = [selectedUser._id, employeeId].sort().join("_");
    socket.emit("joinRoom", roomId);

    socket.on("connect", () => console.log("✅ Socket connected:", socket.id));
    socket.on("connect_error", (err) =>
      console.error("❌ Socket connect error:", err.message)
    );
    socket.on("disconnect", (reason) =>
      console.warn("🔴 Socket disconnected:", reason)
    );

    API.get(`/chat/${selectedUser._id}/${employeeId}`)
      .then((res) => {
        const sorted = res.data.sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );
        setMessages(sorted);
      })
      .catch(() => toast.error("Failed to load messages"));

    // ✅ Handle incoming message and double-check logic
    socket.on("receiveMessage", (msg) => {
      const validMsg =
        (msg.senderId === selectedUser._id && msg.receiverId === employeeId) ||
        (msg.senderId === employeeId && msg.receiverId === selectedUser._id);

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

      // ✅ Mark delivered immediately if receiver is employee
      if (msg.receiverId === employeeId) {
        socket.emit("confirmDelivered", { messageId: msg._id, room: roomId });
      }
    });

    // ✅ Update ticks when backend confirms delivery/read
    socket.on("messageDelivered", ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, isDelivered: true } : m))
      );
    });

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
      socket.off("messageDelivered");
      socket.off("messageRead");
    };
  }, [selectedUser, employeeId]);

  // ✅ Auto-scroll & focus
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [selectedUser]);

  useEffect(() => {
    const el = chatBoxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // ✅ Mark messages as read when employee opens chat
  useEffect(() => {
    if (!selectedUser || !employeeId || messages.length === 0) return;

    const unreadIds = messages
      .filter((m) => !m.isRead && m.receiverId === employeeId)
      .map((m) => m._id);

    if (unreadIds.length > 0) {
      const room = [selectedUser._id, employeeId].sort().join("_");
      console.log("📤 Employee confirmRead for:", unreadIds);
      socket.emit("confirmRead", { messageIds: unreadIds, room });
    }
  }, [messages, selectedUser, employeeId]);

  // Send message
  const sendMessage = async () => {
    if (!message.trim() || !selectedUser || !employeeId) return;

    // 1. Save message to DB via API
    const { data: finalMsg } = await API.post("/chat", {
      senderId: employeeId,
      receiverId: selectedUser._id,
      message,
      type: "text",
    });

    // 2. Emit message via socket
    socket.emit("sendMessage", finalMsg);

    // 3. Update UI with the message from the server (which has an _id)
    setMessages((prev) => [...prev, finalMsg]);
    setMessage("");
  };

  // ✅ Select message for deletion
  const handleMessageSelect = (messageId) => {
    // Only allow selecting own messages
    const message = messages.find(m => m._id === messageId);
    if (message?.senderId !== employeeId) return;

    setSelectedMessages((prev) =>
      prev.includes(messageId)
        ? prev.filter((id) => id !== messageId)
        : [...prev, messageId]
    );
  };
  // 3 second long press start
  const startLongPress = (messageId) => {
    isLongPress.current = false;

    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      handleMessageSelect(messageId);   // 👉 Select message for delete
    }, 500); // 5 ms
  };

  // Long press end (mouseup / leave)
  const endLongPress = () => {
    clearTimeout(longPressTimer.current);

    // If long press already triggered → don't treat as click
    return !isLongPress.current;
  };

  // ✅ Delete selected messages
  const handleDeleteSelected = () => {
    if (selectedMessages.length === 0) return;
    setDeleteTarget({ type: "messages", ids: selectedMessages });
    setShowDeleteModal(true);
  };
  const handleTextClick = (msgId) => {
    if (!msgId) return;
    handleMessageSelect(msgId); // instantly select
  };




  // File upload
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      toast.loading("Uploading file...", { id: "upload" });

      const formData = new FormData();
      formData.append("file", file);

      const token = localStorage.getItem("token");

      // 1️⃣ Upload file to Cloudinary
      const uploadRes = await API.post("/chat/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      const { fileUrl, type, originalName } = uploadRes.data;

      // 2️⃣ Save message in DB
      const msgRes = await API.post("/chat", {
        senderId: employeeId,               // For EmployeeChat.jsx
        receiverId: selectedUser._id,
        message: fileUrl,
        type,
        fileName: originalName              // ⭐ REAL FILE NAME HERE
      });

      const finalMsg = msgRes.data;

      // 3️⃣ Emit socket message
      socket.emit("sendMessage", finalMsg);

      // 4️⃣ Push in UI
      setMessages(prev => [...prev, finalMsg]);

      toast.success("File sent");
    } catch (err) {
      console.error("File upload error:", err);
      toast.error("Upload failed");
    } finally {
      toast.dismiss("upload");
      e.target.value = "";
    }
  };


  // Delete handlers
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
      } else if (deleteTarget.type === "messages") {
        await Promise.all(
          deleteTarget.ids.map(id => API.delete(`/chat/message/${id}`))
        );
        setMessages((prev) => prev.filter((m) => !deleteTarget.ids.includes(m._id)));
        toast.success("Message deleted");
      } else if (deleteTarget.type === "chat" && selectedUser && employeeId) {
        await API.delete(`/chat/${selectedUser._id}/${employeeId}`);
        setMessages([]);
        toast.success("Chat deleted");
      }
      setShowDeleteModal(false);
    } catch {
      toast.error("Failed to delete");
    } finally {
      setIsDeleting(false);
      setSelectedMessages([]);
    }
  };

  // Group messages
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

  const formatTime = (isoString) =>
    new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
   const getFileName = (m) => {
    if (m?.fileName) return m.fileName;
    if (m?.originalName) return m.originalName;
    if (m?.name) return m.name;

    // Fallback: Extract from URL
    try {
      const clean = m.message.split("?")[0];
      return decodeURIComponent(clean.split("/").pop());
    } catch {
      return "File";
    }
  };
  const getInlineUrl = (url) => {
    if (!url) return url;
    try {
      return url.replace("/upload/", "/upload/fl_attachment:false/");
    } catch {
      return url;
    }
  };


  return (
    <div className="flex flex-col md:flex-row h-[85vh] border rounded-xl overflow-hidden shadow-md transition-colors duration-300 max-w-full">
      {/* SIDEBAR */}
      <div
        className={`w-full md:w-1/3 lg:w-1/4 border-r dark:border-gray-700 p-4 overflow-y-auto ${selectedUser ? "hidden md:block" : "block"
          }`}
      >
        <h2 className="font-semibold text-lg mb-4 text-blue-600 text-center md:text-left">
          Chat With
        </h2>

        <div className="flex justify-center md:justify-start mb-5 gap-2 flex-wrap">
          <button
            onClick={() => setChatType("admin")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${chatType === "admin"
              ? "bg-blue-600 text-white"
              : "border hover:bg-gray-200 hover:text-black cursor-pointer"
              }`}
          >
            Admins
          </button>
          <button
            onClick={() => setChatType("employee")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${chatType === "employee"
              ? "bg-blue-600 text-white"
              : "border hover:bg-gray-200 hover:text-black cursor-pointer"
              }`}
          >
            Employees
          </button>
        </div>

        {users.length > 0 ? (
          <div className="space-y-2">
            {users.map((u) => (
              <div
                key={u._id}
                onClick={() => setSelectedUser(u)}
                className={`p-3 cursor-pointer rounded-lg text-center md:text-left text-sm font-medium transition flex items-center gap-2 ${selectedUser?._id === u._id
                  ? "bg-blue-600 text-white"
                  : "border hover:bg-gray-200 hover:text-black"
                  }`}
              >
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${onlineUsers.includes(u._id)
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
        className={`flex-1 flex flex-col relative w-full overflow-hidden ${!selectedUser ? "hidden md:flex" : "flex"
          }`}
      >
        {selectedUser ? (
          <>
            {/* Chat Header */}
            {selectedMessages.length > 0 ? (
              <div className="p-4 border-b dark:border-gray-700 bg-blue-50 dark:bg-blue-900/50 font-semibold flex justify-between items-center sticky top-0 z-10">
                <button onClick={() => setSelectedMessages([])} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                  <X size={20} />
                </button>
                <span>{selectedMessages.length} selected</span>
                <button onClick={handleDeleteSelected} className="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50">
                  <Trash2 size={20} />
                </button>
              </div>
            ) : (
              <div className="p-4 border-b dark:border-gray-700 font-semibold text-blue-600 flex justify-between items-center sticky top-0 z-10">
                <span>Chat with {selectedUser.name}</span>
                <button onClick={confirmDeleteChat} className="text-red-600 hover:text-red-800 flex items-center gap-1 text-sm">
                  <Trash2 size={18} /> Delete Chat
                </button>
              </div>
            )}


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
                        className={`
        relative group px-3 py-2 rounded-2xl max-w-[80%] md:max-w-[70%] shadow-sm transition w-fit
        ${m.senderId === employeeId ? "ml-auto bg-blue-600 text-white rounded-br-sm" : "self-start bg-gray-200 text-black dark:bg-blue-900 dark:text-white rounded-bl-sm"}
        ${selectedMessages.includes(m._id) ? "bg-blue-400 dark:bg-gray-400" : ""}
      `}
                      >
                        <div className="flex items-end gap-x-2">

                          {/* ---------- IMAGE ---------- */}
                          {m.type === "image" ? (
                            <div className="relative">
                              <img
                                src={m.message}
                                className="max-w-[200px] rounded-lg cursor-pointer"
                                onMouseDown={() => startLongPress(m._id)}
                                onMouseUp={(e) => {
                                  const shortClick = endLongPress();
                                  if (shortClick) {
                                    e.stopPropagation();
                                    onImagePreview(m.message); // modal
                                  }
                                }}
                                onMouseLeave={endLongPress}
                              />
                              {/* Timestamp overlay for image */}
                              <div className="absolute bottom-1 right-1 bg-black/50 text-white rounded px-1.5 py-0.5 text-xs flex items-center gap-1">
                                <span>{formatTime(m.createdAt)}</span>
                                {m.senderId === employeeId && (
                                  <span>
                                    {m.isRead ? (
                                      <CheckCheck size={16} className="text-sky-400" />
                                    ) : m.isDelivered ? (
                                      <CheckCheck size={16} />
                                    ) : (
                                      <Check size={16} />
                                    )}
                                  </span>
                                )}
                              </div>
                            </div>

                          ) : m.type === "file" ? (

                            /* ---------- PDF / DOC ---------- */
                            <span
                              className="
    break-all flex items-center gap-1 cursor-pointer
    underline
    text-inherit
    decoration-inherit
    hover:text-inherit
    hover:decoration-inherit
  "
                              onMouseDown={() => startLongPress(m._id)}
                              onMouseUp={(e) => {
                                const shortClick = endLongPress();
                                if (shortClick) {
                                  e.preventDefault();
                                  window.open(m.message, "_blank");
                                }
                              }}
                              onMouseLeave={endLongPress}
                            >
                              📄 {getFileName(m)}
                            </span>


                          ) : (

                            /* ---------- TEXT ---------- */
                            <div
                              className="whitespace-pre-wrap break-all"
                              onClick={() => m.senderId === employeeId && handleMessageSelect(m._id)}
                            >
                              {m.message}
                            </div>

                          )}

                          {/* Time + Ticks for TEXT and FILE messages */}
                          {m.type !== 'image' && (
                            <div className="text-xs flex-shrink-0 self-end flex items-center gap-1 opacity-70">
                              <span>{formatTime(m.createdAt)}</span>
                              {m.senderId === employeeId && (
                                <span>
                                  {m.isRead ? (
                                    <CheckCheck size={16} className="text-sky-400" />
                                  ) : m.isDelivered ? (
                                    <CheckCheck size={16} />
                                  ) : (
                                    <Check size={16} />
                                  )}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              ))}
            </div>

            {/* Input */}
            <div className="p-2 sm:p-3 flex flex-wrap sm:flex-nowrap items-center gap-2 border-t dark:border-gray-700 sticky bottom-0 z-20">
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => document.getElementById("employeeFileInput").click()}
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
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
                <input
                  id="employeeFileInput"
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
                className="flex-1 w-full sm:w-auto min-w-[150px] border border-gray-300 dark:border-gray-700 p-2 rounded-lg text-sm sm:text-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Type a message..."
              />

              <button
                onClick={sendMessage}
                className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white px-4 sm:px-5 py-2 rounded-lg text-sm font-medium transition w-full sm:w-auto"
              >
                <span className="sm:hidden">Send Message</span><span className="hidden sm:inline">Send</span>
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 text-center p-5 text-sm">
            Select a {chatType} to start chatting
          </div>
        )}
        {/* Full Screen Preview Modal */}
        {previewUrl && previewType === "image" && (
          <div
            className="fixed inset-0 bg-black/85 flex items-center justify-center z-[999]"
            onClick={() => setPreviewUrl(null)}   // Close when clicking outside
          >
            {/* Close Button */}
            <button
              className="absolute top-3 right-3 text-white text-3xl font-bold bg-black/40 rounded-full w-10 h-10 flex items-center justify-center hover:bg-black/60"
              onClick={(e) => {
                e.stopPropagation();
                setPreviewUrl(null);
              }}
            >
              ✕
            </button>

            {/* Image Preview */}
            <img
              src={previewUrl}
              className="max-w-[95vw] max-h-[95vh] object-contain rounded-lg shadow-lg"
              onClick={(e) => e.stopPropagation()}   // Prevent closing when clicking the image
            />
          </div>
        )}



        {/* Delete Modal */}
        {showDeleteModal && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-xl w-full max-w-sm text-center">
              <h3 className="text-lg font-semibold mb-3 text-red-600">
                {deleteTarget?.type === "message"
                  ? "Delete this message?"
                  : deleteTarget?.type === "messages"
                    ? `Delete ${deleteTarget.ids.length} message(s)?`
                    : "Delete entire chat?"}
              </h3>
              <div className="flex justify-center gap-3 mt-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 bg-gray-300 dark:bg-gray-700 rounded-lg text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium"
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
