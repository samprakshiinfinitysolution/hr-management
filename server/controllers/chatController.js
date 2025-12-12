
import Chat from "../models/chatModel.js";
import Admin from "../models/adminModel.js";
import mongoose from "mongoose";
import Employee from "../models/employeeModel.js";
// import { getReceiverSocketId, io } from "../sockets/chatSocket.js";

async function getRootAdminId(user) {
  if (user.isMainAdmin) return user.id;
  return user.createdBy; // HR/Manager/Admin
}

export const getAllAdminsForChat = async (req, res) => {
  try {
    const user = req.user;
    const role = user.role;
    const userId = user.id;

    // ⭐ Employee → only see their own admin + HR + Manager (same company)
    if (role === "employee") {
      const rootAdmin = user.createdBy;

      const admins = await Admin.find({
        $or: [
          { _id: rootAdmin },            // Main admin
          { createdBy: rootAdmin }       // HR/Manager created by main admin
        ]
      }).select("_id name role createdBy");

      return res.json(admins);
    }

    // ⭐ HR / MANAGER / NORMAL ADMIN
    const rootAdmin = await getRootAdminId(user);

    const admins = await Admin.find({
      $or: [
        { _id: rootAdmin },             // Show main admin
        { createdBy: rootAdmin }        // Show HR/Manager created by main admin
      ]
    }).select("_id name role createdBy isMainAdmin");


    const filtered = admins.filter(a => String(a._id) !== String(userId));

    return res.json(filtered);

  } catch (err) {
    console.error("getAllAdminsForChat error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAllEmployeesForChat = async (req, res) => {
  try {
    const user = req.user;

    // ⭐ Employee → only see employees made by the same root admin
    let rootAdmin = user.role === "employee" ? user.createdBy : user.id;

    // HR / Manager / Admin → root admin = main admin
    if (user.role !== "employee") {
      rootAdmin = await getRootAdminId(user);
    }

    const employees = await Employee.find({
      createdBy: rootAdmin
    }).select("_id name email role createdBy");

    res.json(employees);

  } catch (err) {
    console.error("getAllEmployeesForChat error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { user1, user2 } = req.params;

    const currentUserId = req.user.id;  // Correct user

    const messages = await Chat.find({
      $or: [
        { senderId: user1, receiverId: user2 },
        { senderId: user2, receiverId: user1 },
      ],
      visibleTo: currentUserId  // THIS FIXES DELETE-FOR-ME
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: "Error fetching messages" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { senderId, receiverId, message, type, fileUrl } = req.body;

    let msgType = type || "text";
    let msgContent = message;

    if (fileUrl) {
      msgContent = fileUrl;
      msgType = fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? "image" : "file";
    }

    const newMsg = await Chat.create({
      senderId,
      receiverId,
      message: msgContent,
      type: msgType,
      visibleTo: [senderId, receiverId],  
    });

    res.status(201).json(newMsg);
  } catch (error) {
    res.status(500).json({ message: "Error sending message" });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const msg = await Chat.findById(messageId);
    if (!msg) return res.status(404).json({ message: "Message not found" });

    // ✔ FIX: the user must be in visibleTo
    if (!msg.visibleTo.includes(userId)) {
      return res.json({ success: true, message: "Already deleted for me" });
    }

    // ✔ Remove the user from visibleTo
    msg.visibleTo = msg.visibleTo.filter(id => id.toString() !== userId);
    await msg.save();

    res.json({ success: true, message: "Deleted for me" });

  } catch (err) {
    res.status(500).json({ message: "Delete failed" });
  }
};

// DELETE message for everyone
export const deleteMessagesForEveryone = async (req, res) => {
  try {
    const { messageIds, user1, user2 } = req.body;

    if (!messageIds || !Array.isArray(messageIds)) {
      return res.status(400).json({ message: "Invalid messageIds" });
    }

    const room = [user1, user2].sort().join("_");

    await Chat.deleteMany({ _id: { $in: messageIds } });

    // Notify both users
    req.io.to(room).emit("messageDeletedForEveryone", { messageIds });

    return res.json({
      success: true,
      message: "Deleted for everyone"
    });

  } catch (err) {
    console.error("deleteMessagesForEveryone error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
export const deleteChat = async (req, res) => {
  try {
    const { user1, user2 } = req.params;

    await Chat.updateMany(
      {
        $or: [
          { senderId: user1, receiverId: user2 },
          { senderId: user2, receiverId: user1 }
        ]
      },
      {
        $pull: { visibleTo: user1 }  // remove only for this user
      }
    );

    res.json({ success: true, message: "Chat deleted for me" });

  } catch (err) {
    res.status(500).json({ message: "Chat delete failed" });
  }
};

export const clearChatForMe = async (req, res) => {
  try {
    const userId = req.user.id;         
    const otherUserId = req.params.otherUserId;

    await Chat.updateMany(
      {
        $or: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId }
        ]
      },
      { $pull: { visibleTo: userId } }   
    );

    return res.json({
      success: true,
      message: "Chat cleared for you only"
    });
  } catch (err) {
    console.error("❌ Clear chat error:", err);
    res.status(500).json({ message: "Clear chat failed" });
  }
};
