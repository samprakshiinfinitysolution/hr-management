// import Chat from "../models/chatModel.js";

// export default function chatSocket(io) {
//   io.on("connection", (socket) => {
//     console.log("🟢 User connected:", socket.id);

//     // ✅ Join a room
//     socket.on("joinRoom", (roomId) => {
//       socket.join(roomId);
//       console.log(`📥 User joined room: ${roomId}`);
//     });

//     // ✅ Leave a room
//     socket.on("leaveRoom", (roomId) => {
//       socket.leave(roomId);
//       console.log(`📤 User left room: ${roomId}`);
//     });

//     // ✅ Send a message
//     socket.on("sendMessage", async (data) => {
//       const { senderId, receiverId, message, room, type = "text" } = data;
//       if (!message || !senderId || !receiverId || !room) return;

//       try {
//         const newMessage = new Chat({ senderId, receiverId, message, type, room });
//         await newMessage.save();

//         const savedMessage = await Chat.findById(newMessage._id).lean();
//         savedMessage.createdAt = savedMessage.createdAt || new Date();

//         // Emit to all in room
//         io.to(room).emit("receiveMessage", savedMessage);
//         console.log(`💬 Message sent in ${room}: ${message}`);
//       } catch (err) {
//         console.error("❌ Error saving message:", err);
//       }
//     });

//     // ✅ Load chat history
//     socket.on("loadMessages", async ({ user1, user2 }) => {
//       if (!user1 || !user2) return;
//       try {
//         const messages = await Chat.find({
//           $or: [
//             { senderId: user1, receiverId: user2 },
//             { senderId: user2, receiverId: user1 },
//           ],
//         }).sort({ createdAt: 1 });
//         socket.emit("chatHistory", messages);
//       } catch (err) {
//         console.error("❌ Error loading chat history:", err);
//       }
//     });

//     // ✅ Disconnect
//     socket.on("disconnect", (reason) => {
//       console.log("🔴 User disconnected:", socket.id, reason);
//     });
//   });
// }



import Chat from "../models/chatModel.js";

export default function chatSocket(io) {
  io.on("connection", (socket) => {
    console.log("🟢 Socket connected:", socket.id);

    socket.on("joinRoom", (roomId) => {
      socket.join(roomId);
      console.log(`📥 Joined room: ${roomId}`);
    });

    socket.on("leaveRoom", (roomId) => {
      socket.leave(roomId);
      console.log(`📤 Left room: ${roomId}`);
    });

    socket.on("sendMessage", async (data) => {
      try {
        const { senderId, receiverId, message, room, type = "text" } = data;
        if (!message || !senderId || !receiverId || !room) return;

        const newMsg = await Chat.create({ senderId, receiverId, message, type, room });
        io.to(room).emit("receiveMessage", newMsg);

        console.log(`💬 [${room}] ${senderId} → ${receiverId}: ${message}`);
      } catch (err) {
        console.error("❌ Socket sendMessage error:", err);
      }
    });

    socket.on("loadMessages", async ({ user1, user2 }) => {
      try {
        const messages = await Chat.find({
          $or: [
            { senderId: user1, receiverId: user2 },
            { senderId: user2, receiverId: user1 },
          ],
        }).sort({ createdAt: 1 });
        socket.emit("chatHistory", messages);
      } catch (err) {
        console.error("❌ loadMessages error:", err);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`🔴 Socket ${socket.id} disconnected (${reason})`);
    });
  });
}
