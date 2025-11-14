import { useEffect, useState, useRef } from "react";
import io from "socket.io-client";
import API from "../../utils/api";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import { Trash2, FileText, X, Check, CheckCheck } from "lucide-react";
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
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewType, setPreviewType] = useState(null);

  const user = useSelector((state) => state.auth?.user);
  const chatBoxRef = useRef(null);
  const inputRef = useRef(null);
  const longPressTimer = useRef(null);
  const isLongPress = useRef(false);

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
  const sendMessage = async () => {
    if (!message.trim() || !selectedUser || !adminId) return;

    // 1. Save message to DB via API
    const { data: finalMsg } = await API.post("/chat", {
      senderId: adminId,
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

  // Long press handlers
  const startLongPress = (messageId) => {
    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      handleMessageSelect(messageId);
    }, 500);
  };

  const endLongPress = () => {
    clearTimeout(longPressTimer.current);
    // Return true if it was a short click
    return !isLongPress.current;
  };

  // ✅ Select message for deletion
  const handleMessageSelect = (messageId) => {
    // Only allow selecting own messages
    const message = messages.find(m => m._id === messageId);
    if (message?.senderId !== adminId) return;

    setSelectedMessages((prev) =>
      prev.includes(messageId)
        ? prev.filter((id) => id !== messageId)
        : [...prev, messageId]
    );
  };

  // ✅ Delete selected messages
  const handleDeleteSelected = () => {
    if (selectedMessages.length === 0) return;
    setDeleteTarget({ type: "messages", ids: selectedMessages });
    setShowDeleteModal(true);
  };

  // ✅ File upload handler
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      toast.loading("Uploading file...", { id: "upload" });

      const formData = new FormData();
      formData.append("file", file);

      const token = localStorage.getItem("token");

      // 1️⃣ Upload file
      const res = await API.post("/chat/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`,
        },
      });

      const { fileUrl, type, originalName } = res.data; // ⭐ important

      // 2️⃣ Save chat message in DB
      const msgSend = await API.post("/chat", {
        senderId: adminId,
        receiverId: selectedUser._id,
        message: fileUrl,
        type,
        fileName: originalName   // ⭐ REAL FILE NAME SAVE
      });

      const finalMsg = msgSend.data;

      // 3️⃣ Send through socket
      socket.emit("sendMessage", finalMsg);

      // 4️⃣ Update UI
      setMessages(prev => [...prev, finalMsg]);

      toast.success("File sent");
    } catch (err) {
      console.error("Admin file upload error:", err);
      toast.error("Upload failed");
    } finally {
      toast.dismiss("upload");
      e.target.value = "";
    }
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
      } else if (deleteTarget.type === "messages") {
        await Promise.all(
          deleteTarget.ids.map(id => API.delete(`/chat/message/${id}`))
        );
        setMessages((prev) => prev.filter((m) => !deleteTarget.ids.includes(m._id)));
        toast.success(`${deleteTarget.ids.length} message(s) deleted`);
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
      setSelectedMessages([]);
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
  const formatTime = (isoString) =>
    new Date(isoString).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const getFileName = (url) => {
    if (!url) return "File";

    try {
      const clean = url.split("?")[0]; // Remove query params
      const parts = clean.split("/");
      const filename = parts[parts.length - 1];
      return decodeURIComponent(filename);
    } catch {
      return "File";
    }
  };
const getInlineUrl = (url) => { // ✅ FIXED
  if (!url) return "";
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/');
    const uploadIndex = pathParts.findIndex(part => part === 'upload');

    // Insert fl_inline right after /upload/ part
    pathParts.splice(uploadIndex + 1, 0, 'fl_inline');
    return urlObj.origin + pathParts.join('/') + urlObj.search;
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
            onClick={() => setChatType("employee")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${chatType === "employee"
              ? "bg-blue-600 text-white"
              : "border hover:bg-gray-200 hover:text-black cursor-pointer"
              }`}
          >
            Employees
          </button>
          <button
            onClick={() => setChatType("admin")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${chatType === "admin"
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
                          relative group px-3 py-2 rounded-2xl max-w-[80%] md:max-w-[70%] break-words shadow-sm transition w-fit
                          ${m.senderId === adminId ? "cursor-pointer" : ""}
                          ${m.senderId === adminId
                            ? "ml-auto self-end rounded-br-sm" // Always apply alignment for own messages
                            : "self-start rounded-bl-sm" // Always apply alignment for other's messages
                          }
                          ${selectedMessages.includes(m._id)
                            ? "bg-blue-400 dark:bg-gray-400 text-white" // Selected state
                            : m.senderId === adminId
                              ? "bg-blue-600 text-white" // Own message, not selected
                              : "bg-gray-200 text-black dark:bg-blue-900 dark:text-white" // Other's message, not selected
                          }
                        `}
                      >
                        <div className="flex items-end gap-x-2">

                          {m.type === "image" ? (
                            <div className="relative">
                              <img
                                src={m.message}
                                className="max-w-[200px] rounded-lg cursor-pointer"
                                onMouseDown={() => m.senderId === adminId && startLongPress(m._id)}
                                onMouseUp={(e) => {
                                  if (m.senderId === adminId) {
                                    const shortClick = endLongPress();
                                    if (shortClick) {
                                      e.stopPropagation();
                                      setPreviewUrl(m.message);
                                      setPreviewType("image");
                                    }
                                  } else {
                                    e.stopPropagation();
                                    setPreviewUrl(m.message);
                                    setPreviewType("image");
                                  }
                                }}
                                onMouseLeave={() => m.senderId === adminId && endLongPress()}
                              />
                              {/* Timestamp overlay for image */}
                              <div className="absolute bottom-1 right-1 bg-black/50 text-white rounded px-1.5 py-0.5 text-xs flex items-center gap-1">
                                <span>{formatTime(m.createdAt)}</span>
                                {m.senderId === adminId && (
                                  <span>
                                    {m.isRead ? <CheckCheck size={16} className="text-sky-400" /> : m.isDelivered ? <CheckCheck size={16} /> : m._id ? <Check size={16} /> : null}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : m.type === "file" ? (
                            <a
                              href={getInlineUrl(m.message)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 underline break-all flex items-center gap-1 cursor-pointer"
                              onClick={(e) => e.stopPropagation()}
                              onMouseDown={() => m.senderId === adminId && startLongPress(m._id)}
                              onMouseUp={(e) => {
                                if (m.senderId === adminId) {
                                  const shortClick = endLongPress();
                                  if (shortClick) {
                                    e.preventDefault();
                                    window.open(getInlineUrl(m.message), "_blank");
                                  }
                                }
                              }}
                              onMouseLeave={() => m.senderId === adminId && endLongPress()}
                            >
                              📄 {m.fileName || "File"}
                            </a>
                          ) : (
                            <div className="whitespace-pre-wrap break-all" onClick={() => m.senderId === adminId && handleMessageSelect(m._id)}>
                              {m.message}
                            </div>
                          )}

                          {/* Time + Ticks for TEXT and FILE messages */}
                          {m.type !== 'image' && (
                            <div className="text-xs flex-shrink-0 self-end flex items-center gap-1 opacity-70">
                              <span>{formatTime(m.createdAt)}</span>
                              {m.senderId === adminId && (
                                <span>
                                  {m.isRead ? <CheckCheck size={16} className="text-sky-400" /> : m.isDelivered ? <CheckCheck size={16} /> : m._id ? <Check size={16} /> : null}
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

        {/* Full Screen Image Preview Modal */}
        {previewUrl && previewType === "image" && (
          <div
            className="fixed inset-0 bg-black/85 flex items-center justify-center z-[999]"
            onClick={() => setPreviewUrl(null)} // Close when clicking outside
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
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image
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
