import Chat from "../models/chatModel.js";

// 📨 Get all chat messages between two users
export const getMessages = async (req, res) => {
  try {
    const { user1, user2 } = req.params;

    let messages = await Chat.find({
      $or: [
        { senderId: user1, receiverId: user2 },
        { senderId: user2, receiverId: user1 },
      ],
    }).lean();

    // Sort explicitly by time
    messages.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    res.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ message: "Error fetching messages", error });
  }
};

// 💬 Send message (text / image / file)
export const sendMessage = async (req, res) => {
  try {
    const { senderId, receiverId, message, type } = req.body;

    // ✅ Determine message type automatically if not provided
    let messageType = type || "text";

    if (!message || !senderId || !receiverId) {
      return res
        .status(400)
        .json({ message: "senderId, receiverId and message are required" });
    }

    // Auto-detect type from content
    if (!type && typeof message === "string") {
      if (message.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        messageType = "image";
      } else if (message.startsWith("https://res.cloudinary.com/")) {
        messageType = "file"; // fallback for any uploaded file
      } else {
        messageType = "text";
      }
    }

    const newMsg = await Chat.create({
      senderId,
      receiverId,
      message,
      type: messageType,
    });

    res.status(201).json(newMsg);
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Error sending message", error });
  }
};

// 🧹 Delete a specific message
export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const result = await Chat.findByIdAndDelete(messageId);

    if (!result)
      return res.status(404).json({ message: "Message not found" });

    res.json({ success: true, message: "Message deleted successfully" });
  } catch (error) {
    console.error("Error deleting message:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

// 🧺 Delete entire chat between two users
export const deleteChat = async (req, res) => {
  try {
    const { user1, user2 } = req.params;

    const result = await Chat.deleteMany({
      $or: [
        { senderId: user1, receiverId: user2 },
        { senderId: user2, receiverId: user1 },
      ],
    });

    res.json({
      success: true,
      deletedCount: result.deletedCount,
      message: "Chat deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting chat:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
