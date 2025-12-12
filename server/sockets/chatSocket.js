
import Chat from "../models/chatModel.js";

export default function chatSocket(io) {
  let onlineUsers = []; 

  io.on("connection", (socket) => {
    // console.log("🟢 User connected:", socket.id);

    const { userId } = socket.handshake.auth;

    if (userId && !onlineUsers.includes(userId)) {
      onlineUsers.push(userId);
      io.emit("onlineUsers", onlineUsers);
    }

    // JOIN ROOM
    socket.on("joinRoom", (roomId) => {
      socket.join(roomId);
    });

    // LEAVE ROOM
    socket.on("leaveRoom", (roomId) => {
      socket.leave(roomId);
    });

    socket.on("sendMessage", (data) => {
      const { room } = data;
      if (!room) return;

      io.to(room).emit("receiveMessage", data);
    });

    // DELIVERY
    socket.on("confirmDelivered", async ({ messageId, room }) => {
      try {
        const msg = await Chat.findById(messageId);
        if (!msg) return;

        if (!msg.isDelivered) {
          msg.isDelivered = true;
          msg.deliveredAt = new Date();
          await msg.save();
        }

        io.to(room).emit("messageDelivered", {
          messageId,
          deliveredAt: msg.deliveredAt,
        });

      } catch (err) {
        console.error("❌ Delivery Error:", err);
      }
    });

    // READ
    socket.on("confirmRead", async ({ messageIds = [], room }) => {
      try {
        if (messageIds.length === 0) return;

        await Chat.updateMany(
          { _id: { $in: messageIds } },
          { $set: { isRead: true, readAt: new Date() } }
        );

        io.to(room).emit("messageRead", {
          messageIds,
          readAt: new Date(),
        });

      } catch (err) {
        console.error("❌ Read Error:", err);
      }
    });

    socket.on("disconnect", () => {
      if (userId) {
        onlineUsers = onlineUsers.filter((id) => id !== userId);
        io.emit("onlineUsers", onlineUsers);
      }
    });
  });
}

