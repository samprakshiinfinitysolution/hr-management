import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../utils/api";
import { Check, X, Clock, AlertTriangle, Edit3, FileText } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

export default function EmpTask() {
  const [tasks, setTasks] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activeTask, setActiveTask] = useState(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [completionNotes, setCompletionNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    fetchTasks();
    fetchNotifications();
  }, []);

  const fetchTasks = async () => {
    try {
      const res = await API.get("/task/employee");
      setTasks(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to fetch tasks");
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await API.get("/task/notifications");
      setNotifications(res.data);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      // Optimistically remove from UI
      setNotifications(prev => prev.filter(n => n._id !== notificationId));
      toast.success("Notification dismissed");
      // Make API call to delete from backend
      await API.delete(`/task/notifications/${notificationId}`);
    } catch (err) {
      console.error("Failed to delete notification:", err);
      toast.error("Could not dismiss notification");
      // If API call fails, refresh notifications to get the real state
      fetchNotifications();
    }
  };

  const updateTaskStatus = async (taskId, status, notes = "") => {
    setLoading(true);
    setShowCompletionModal(false);
setCompletionNotes("");
setRejecting(false);

    try {
      await API.put(`/task/${taskId}/status`, { status, notes });
      toast.success(`Task ${status.toLowerCase()} successfully!`);
      fetchTasks();
      setShowCompletionModal(false);
      setCompletionNotes("");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update task status");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteTask = (task) => {
    setActiveTask(task);
    setShowCompletionModal(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Completed": return "bg-green-100 text-green-800";
      case "In Progress": return "bg-yellow-100 text-yellow-800";
      case "Pending": return "bg-blue-100 text-blue-800";
      case "Rejected": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "Urgent": return "bg-red-500 text-white";
      case "High": return "bg-orange-500 text-white";
      case "Medium": return "bg-yellow-500 text-white";
      case "Low": return "bg-green-500 text-white";
      default: return "bg-gray-500 text-white";
    }
  };

  const getTaskSection = (tasks, title, icon) => (
    <div className="mb-8">
      <h3 className="text-lg font-semibold  flex items-center gap-2 mb-4">
        {icon}
        {title} ({tasks.length})
      </h3>
      {tasks.length === 0 ? (
        <div className="text-center py-8">
          <Clock className="mx-auto h-12 w-12 mb-4" />
          <p>No {title.toLowerCase()} tasks</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <div key={task._id} className=" rounded-lg shadow p-6 border-l-4 border-blue-500">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                  {task.isOverdue && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                      <AlertTriangle size={12} className="mr-1" />
                      Overdue
                    </span>
                  )}
                </div>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(task.status)}`}>
                  {task.status}
                </span>
              </div>

              <h4 className="text-lg font-semibold  mb-2">{task.title}</h4>
              <p className=" mb-4">{task.description}</p>

              <div className="grid grid-cols-2 gap-4 text-sm  mb-4">
                <div>
                  <span className="font-medium">From:</span> {task.assignedBy.name}
                </div>
                <div>
                  <span className="font-medium">Due:</span> {new Date(task.dueDate).toLocaleDateString()}
                </div>
              </div>

              {task.notes && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700"><strong>Notes:</strong> {task.notes}</p>
                </div>
              )}

              <div className="flex gap-2">
                {task.status === "Pending" && (
                  <button
                    onClick={() => updateTaskStatus(task._id, "In Progress")}
                    className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 text-sm"
                  >
                    Start Task
                  </button>
                )}

                {task.status === "In Progress" && (
                  <button
                    onClick={() => handleCompleteTask(task)}
                    className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm"
                  >
                    <Check size={16} className="inline mr-1" />
                    Complete
                  </button>
                )}

                {task.status === "In Progress" && (
                  <button
                    onClick={() => {
                      setActiveTask(task);
                      setShowCompletionModal(true); // reuse modal but will detect reject
                      setRejecting(true); // new state
                    }}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm"
                  >
                    <X size={16} className="inline mr-1" />
                    Reject
                  </button>
                )}

              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen  p-6">
      <Toaster />
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold  mb-8">📋 My Tasks</h1>

        {/* Notifications */}
        {notifications.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold mb-4">🔔 New Notifications</h3>
            <div className="space-y-3">
              {notifications.slice(0, 3).map((notification) => (
                <div
                  key={notification._id}
                  onClick={() => deleteNotification(notification._id)}
                  className={`p-4 rounded-lg border-l-4 cursor-pointer hover:shadow-md transition-shadow ${notification.read ? ' border-gray-200' : ' border-blue-500'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold 0">{notification.title}</h4>
                      <p className="text-sm  mt-1">{notification.message}</p>
                      <p className="text-xs  mt-2">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <X size={18} className="text-gray-400 hover:text-red-500" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tasks by Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            {getTaskSection(
              tasks.filter(t => t.status === "Pending"),
              "Pending Tasks",
              <Clock className="h-5 w-5" />
            )}
          </div>

          <div className="lg:col-span-1">
            {getTaskSection(
              tasks.filter(t => t.status === "In Progress"),
              "In Progress",
              <Edit3 className="h-5 w-5" />
            )}
          </div>

          <div className="lg:col-span-1">
            {getTaskSection(
              tasks.filter(t => t.status === "Completed"),
              "Completed",
              <Check className="h-5 w-5" />
            )}
          </div>
        </div>

        {/* Completion Modal */}
        {showCompletionModal && activeTask && (
          <div className="fixed inset-0  bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="rounded-lg p-6 bg-white text-black max-w-md w-full max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-semibold mb-4">Complete Task</h3>
              <p className=" mb-4">Task: <strong>{activeTask.title}</strong></p>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Completion Notes</label>
                <textarea
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  rows="3"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Add any completion notes..."
                />
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowCompletionModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={() => updateTaskStatus(activeTask._id, "Completed", completionNotes)}
                  disabled={loading}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {loading ? "Completing..." : "Complete Task"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      {showCompletionModal && activeTask && (
  <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div className="rounded-lg p-6 bg-white text-black max-w-md w-full max-h-[80vh] overflow-y-auto">
      <h3 className="text-lg font-semibold mb-4">
        {rejecting ? "Reject Task" : "Complete Task"}
      </h3>
      <p className="mb-4">
        Task: <strong>{activeTask.title}</strong>
      </p>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          {rejecting ? "Rejection Reason" : "Completion Notes"}
        </label>
        <textarea
          value={completionNotes}
          onChange={(e) => setCompletionNotes(e.target.value)}
          rows="3"
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          placeholder={rejecting ? "Enter reason for rejection..." : "Add any completion notes..."}
        />
      </div>

      <div className="flex gap-3 justify-end">
        <button
          onClick={() => {
            setShowCompletionModal(false);
            setCompletionNotes("");
            setRejecting(false);
          }}
          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
        >
          Cancel
        </button>
        <button
          onClick={() =>
            updateTaskStatus(
              activeTask._id,
              rejecting ? "Rejected" : "Completed",
              completionNotes
            )
          }
          disabled={loading}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
        >
          {loading
            ? rejecting
              ? "Rejecting..."
              : "Completing..."
            : rejecting
            ? "Reject Task"
            : "Complete Task"}
        </button>
      </div>
    </div>
  </div>
)}

    </div>
  );
}