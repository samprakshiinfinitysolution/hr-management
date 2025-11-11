import Chat from "../models/chatModel.js";

export default function chatSocket(io) {
  let onlineUsers = []; // Track online users

  io.on("connection", (socket) => {
    console.log("🟢 User connected:", socket.id);
      console.log("🧠 Auth data from frontend:", socket.handshake.auth);


    // ✅ Identify user from handshake (or token)
    const { userId } = socket.handshake.auth;
    if (userId && !onlineUsers.includes(userId)) {
      onlineUsers.push(userId);
      io.emit("onlineUsers", onlineUsers);
    }

    // ✅ Join a room
    socket.on("joinRoom", (roomId) => {
      socket.join(roomId);
      console.log(`📥 User joined room: ${roomId}`);
    });

    // ✅ Leave a room
    socket.on("leaveRoom", (roomId) => {
      socket.leave(roomId);
      console.log(`📤 User left room: ${roomId}`);
    });

    // ✅ Send a message
    socket.on("sendMessage", async (data) => {
      const { senderId, receiverId, message, room, type = "text" } = data;
      if (!message || !senderId || !receiverId || !room) return;

      try {
        const newMessage = new Chat({
          senderId,
          receiverId,
          message,
          type,
          room,
          isDelivered: false, // added field
          isRead: false,      // added field
        });
        await newMessage.save();

        const savedMessage = await Chat.findById(newMessage._id).lean();
        savedMessage.createdAt = savedMessage.createdAt || new Date();

        io.to(room).emit("receiveMessage", savedMessage);
        console.log(`💬 Message sent in ${room}: ${message}`);
      } catch (err) {
        console.error("❌ Error saving message:", err);
      }
    });

    // ✅ Load chat history
    socket.on("loadMessages", async ({ user1, user2 }) => {
      if (!user1 || !user2) return;
      try {
        const messages = await Chat.find({
          $or: [
            { senderId: user1, receiverId: user2 },
            { senderId: user2, receiverId: user1 },
          ],
        }).sort({ createdAt: 1 });
        socket.emit("chatHistory", messages);
      } catch (err) {
        console.error("❌ Error loading chat history:", err);
      }
    });

    // ✅ Confirm message delivered (single tick)
socket.on("confirmDelivered", async ({ messageId, room }) => {
  console.log("📩 confirmDelivered received:", { messageId, room });


      try {
        const msg = await Chat.findById(messageId);
        if (msg && !msg.isDelivered) {
          msg.isDelivered = true;
          msg.deliveredAt = new Date();
          await msg.save();

          io.to(room).emit("messageDelivered", {
            messageId,
            deliveredAt: msg.deliveredAt,
          });
        }
      } catch (err) {
        console.error("❌ Error confirming delivery:", err);
      }
    });

    // ✅ Confirm message read (double tick)
    socket.on("confirmRead", async ({ messageIds = [], room }) => {
        console.log("📘 confirmRead received:", { messageIds, room });

      try {
        if (!Array.isArray(messageIds) || messageIds.length === 0) return;

        await Chat.updateMany(
          { _id: { $in: messageIds } },
          { $set: { isRead: true, readAt: new Date() } }
        );

        io.to(room).emit("messageRead", {
          messageIds,
          readAt: new Date(),
        });
      } catch (err) {
        console.error("❌ Error confirming read:", err);
      }
    });

    // ✅ Disconnect
    socket.on("disconnect", (reason) => {
      console.log("🔴 User disconnected:", socket.id, reason);
      if (userId) {
        onlineUsers = onlineUsers.filter((id) => id !== userId);
        io.emit("onlineUsers", onlineUsers);
      }
    });
  });
}
