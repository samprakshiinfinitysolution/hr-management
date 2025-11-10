import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../utils/api";
import { Plus, Clock, AlertTriangle, Eye, X, Trash2 } from "lucide-react";
import { toast, Toaster } from "react-hot-toast";

export default function AdminTask() {
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    assignedTo: "",
    dueDate: "",
    priority: "Medium",
    notes: "",
  });
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedTask, setSelectedTask] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [taskToDeleteId, setTaskToDeleteId] = useState(null);
  const [countdown, setCountdown] = useState(5);

  const navigate = useNavigate();

  useEffect(() => {
    fetchTasks();
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (showDeleteModal && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [showDeleteModal, countdown]);

  const fetchTasks = async () => {
    try {
      const res = await API.get("/task/admin");
      setTasks(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to fetch tasks");
    }
  };

  const fetchEmployees = async () => {
    try {
      const res = await API.get("/admin/employees");
      setEmployees(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to fetch employees");
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await API.post("/task", form);
      toast.success("Task assigned successfully!");
      setForm({
        title: "",
        description: "",
        assignedTo: "",
        dueDate: "",
        priority: "Medium",
        notes: "",
      });
      setShowForm(false);
      fetchTasks();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to assign task");
    } finally {
      setLoading(false);
    }
  };

  const openTaskModal = (task) => {
    setSelectedTask(task);
    setShowModal(true);
  };
  const closeModal = () => {
    setSelectedTask(null);
    setShowModal(false);
  };

  const openDeleteModal = (taskId) => {
    setTaskToDeleteId(taskId);
    setShowDeleteModal(true);
  };
  const closeDeleteModal = () => {
    setTaskToDeleteId(null);
    setShowDeleteModal(false);
  };

  const handleDeleteTask = async () => {
    if (!taskToDeleteId) return;
    try {
      await API.delete(`/task/${taskToDeleteId}`);
      toast.success("Task deleted successfully!");
      setTasks((prev) => prev.filter((task) => task._id !== taskToDeleteId));
      closeDeleteModal();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete task");
    }
  };

  return (
    <div className="min-h-screen p-6 transition-colors duration-300">
      <Toaster position="top-right" />
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold ">
          📝 Task Management
        </h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200 dark:bg-blue-500 dark:hover:bg-blue-600"
        >
          <Plus size={20} />
          {showForm ? "Cancel" : "Assign New Task"}
        </button>
      </div>

      {error && (
        <div className="border border-red-300 dark:border-red-500 rounded-lg p-4 mb-4 bg-red-50 dark:bg-red-900/40">
          <p className="text-red-600 dark:text-red-300 font-medium">{error}</p>
        </div>
      )}
      <button
        onClick={() => navigate("../eod-reports")}
        className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-all duration-200"
      >
        EOD Report
      </button>
      {showForm && (
        <div className="shadow-lg rounded-lg p-6 mb-6  border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold mb-4 ">
            Assign New Task
          </h2>
          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            <InputField
              label="Task Title *"
              type="text"
              name="title"
              value={form.title}
              onChange={handleChange}
              required
            />

            <SelectField
              label="Priority"
              name="priority"
              value={form.priority}
              onChange={handleChange}
              options={["Low", "Medium", "High", "Urgent"]}
            />

            <SelectField
              label="Assign To *"
              name="assignedTo"
              value={form.assignedTo}
              onChange={handleChange}
              required
              options={employees.map((emp) => ({
                value: emp._id,
                label: `${emp.name} - ${emp.position}`,
              }))}
            />

            <InputField
              label="Due Date *"
              type="date"
              name="dueDate"
              value={form.dueDate}
              onChange={handleChange}
              required
              min={new Date().toISOString().split("T")[0]}
            />

            <TextareaField
              label="Description *"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              required
            />

            <TextareaField
              label="Notes"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={2}
            />

            <div className="md:col-span-2 flex gap-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-blue-600 dark:bg-blue-500 py-3 px-6 rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 text-white transition-all duration-200 disabled:opacity-50"
              >
                {loading ? "Assigning..." : "Assign Task"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="py-3 px-6 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TASK TABLE */}
      <div className="shadow-lg rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold ">
            Assigned Tasks
          </h3>
          <p className="mt-1 ">
            Total: {tasks.length} tasks
          </p>
        </div>

        {tasks.length === 0 ? (
          <div className="p-8 text-center">
            <Clock className="mx-auto h-12 w-12 mb-4" />
            <p>No tasks assigned yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="hidden sm:table-header-group ">
                <tr>
                  {["Task", "Employee", "Priority", "Due Date", "Status", "Actions"].map((head) => (
                    <th
                      key={head}
                      className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider sm:px-6"
                    >
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {tasks.map((task) => (
                  <tr
                    key={task._id}

                    className="bg-gray-300 text-black sticky top-0 z-10"
                  >
                    <td className="p-4 sm:px-6 sm:py-4">
                      <div className="font-medium">{task.title}</div>
                      <div className="text-sm  mt-1">
                        {task.description}
                      </div>
                    </td>
                    <td className="p-4 sm:px-6 sm:py-4 ">
                      {task.assignedTo?.name || "N/A"}
                      <div className="text-xs ">
                        {task.assignedTo?.position || "-"}
                      </div>
                    </td>
                    <td className="p-4 sm:px-6 sm:py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="p-4 sm:px-6 sm:py-4 ">
                      {new Date(task.dueDate).toLocaleDateString()}
                      {task.isOverdue && (
                        <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                          <AlertTriangle size={12} className="mr-1" /> Overdue
                        </span>
                      )}
                    </td>
                    <td className="p-4 sm:px-6 sm:py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="p-4 sm:px-6 sm:py-4 text-right">
                      <button
                        onClick={() => openTaskModal(task)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => openDeleteModal(task._id)}
                        className="ml-2 text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Task Modal */}
      {showModal && selectedTask && (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4 bg-black/50">
          <div className="rounded-lg p-6 max-w-md w-full bg-white text-black dark:bg-gray-800 dark:text-white">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Task Details</h2>
              <button onClick={closeModal} className="hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <div className="space-y-3">
              <p><strong>Title:</strong> {selectedTask.title}</p>
              <p><strong>Description:</strong> {selectedTask.description}</p>
              <p><strong>Assigned To:</strong> {selectedTask.assignedTo?.name}</p>
              <p><strong>Due Date:</strong> {new Date(selectedTask.dueDate).toLocaleDateString()}</p>
              <p><strong>Priority:</strong> {selectedTask.priority}</p>
              <p><strong>Status:</strong> {selectedTask.status}</p>
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={closeModal} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 p-4 bg-black/50">
          <div className="rounded-lg p-6 max-w-md w-full bg-white text-black dark:bg-gray-800 dark:text-white">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Confirm Deletion</h2>
              <button onClick={closeDeleteModal} className="hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <p className="mb-6">Are you sure you want to delete this task? This action cannot be undone.</p>
            <div className="flex justify-end gap-4">
              <button onClick={closeDeleteModal} className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500">Cancel</button>
              <button
                onClick={handleDeleteTask}
                disabled={countdown > 0}
                className={`px-4 py-2 rounded-lg text-white transition ${countdown > 0 ? "bg-red-400 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"}`}
              >
                {countdown > 0 ? `Delete (${countdown})` : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Reusable Subcomponents ---------- */
function InputField({ label, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2">{label}</label>
      <input
        {...props}
        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg   focus:ring-2 focus:ring-blue-500 outline-none"
      />
    </div>
  );
}

function SelectField({ label, options, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-2 ">{label}</label>
      <select
        {...props}
        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg  focus:ring-2 focus:ring-blue-500 outline-none"
      >
        <option value="" className="text-black"
        >Select</option>
        {options.map((opt) =>
          typeof opt === "string" ? (
            <option key={opt} className="text-black">{opt}</option>
          ) : (
            <option key={opt.value} className="text-black" value={opt.value}>{opt.label}</option>
          )
        )}
      </select>
    </div>
  );
}

function TextareaField({ label, ...props }) {
  return (
    <div className="md:col-span-2">
      <label className="block text-sm font-medium mb-2">{label}</label>
      <textarea
        {...props}
        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg  focus:ring-2 focus:ring-blue-500 outline-none"
      />
    </div>
  );
}

function Modal({ children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black text-white bg-opacity-40">
      <div className="border border-white rounded-lg shadow-lg w-11/12 max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 dark:text-gray-500 hover:text-red-500 dark:hover:text-white"
        >
          <X size={20} />
        </button>
        {children}
      </div>
    </div>
  );
}

/* ---------- Utility Color Helpers ---------- */
const getPriorityColor = (priority) => {
  switch (priority) {
    case "Urgent": return "bg-red-500 text-white";
    case "High": return "bg-orange-500 text-white";
    case "Medium": return "bg-yellow-500 text-white";
    case "Low": return "bg-green-500 text-white";
    default: return "bg-gray-500 text-white";
  }
};

const getStatusColor = (status) => {
  switch (status) {
    case "Completed": return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200";
    case "In Progress": return "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200";
    case "Pending": return "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200";
    case "Rejected": return "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200";
    default: return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200";
  }
};
