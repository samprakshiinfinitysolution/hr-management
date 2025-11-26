
import React, { useState, useEffect } from "react";
import API from "../../utils/api";
import { toast } from "react-hot-toast";
import { X } from "lucide-react";

export default function AdminEodReports() {
  const [form, setForm] = useState({
    date: "",
    reportingTime: "",
    name: "",
    eodTime: "",
    project: "",
    summary: "",
    nextDayPlan: "",
  });

  const [rows, setRows] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [employeeReports, setEmployeeReports] = useState([]);
  const [selectedDate, setSelectedDate] = useState("");

  // EDIT MODE
  const [isEdit, setIsEdit] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editRows, setEditRows] = useState([]);
  const [modalDelete, setModalDelete] = useState({ open: false, index: null });
  const [modalDeleteColumn, setModalDeleteColumn] = useState({ open: false, column: null });
  // TEMPLATE (GLOBAL)
  const [templateColumns, setTemplateColumns] = useState([
    "time",
    "task",
    "description",
    "status",
    "remarks",
  ]);
  const [templateRows, setTemplateRows] = useState([]);

  // COLUMNS USED IN TABLE
  const [editColumns, setEditColumns] = useState([]);

  // Deduplicate Columns
  const normalizeColumns = (cols = []) => {
    const seen = new Set();
    const out = [];
    for (let c of cols || []) {
      if (!c) continue;
      const key = c.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        out.push(c);
      }
    }
    return out;
  };

  // On load
  useEffect(() => {
    fetchEmployees();
    fetchTemplate();
  }, []);

  // Load Template
  const fetchTemplate = async () => {
    try {
      const res = await API.get("/eod/eod-template");
      const tpl = res.data || {};

      const cols = normalizeColumns(
        Array.isArray(tpl.columns) && tpl.columns.length > 0
          ? tpl.columns
          : ["time", "task", "description", "status", "remarks"]
      );

      setTemplateColumns(cols);
      setTemplateRows(tpl.rows || []);

      return tpl;   // 💥 IMPORTANT
    } catch (e) {
      console.warn("Template load failed");
      return null;   // 💥 without this await fails
    }
  };


  // Load Employees
  const fetchEmployees = async () => {
    try {
      const res = await API.get("/admin/employees");
      setEmployees(res.data || []);
    } catch {
      toast.error("Failed to load employees");
    }
  };

  // Load EOD History of Employee
  const fetchEmployeeEods = async (empId, dateToSelect) => {
    try {
      const res = await API.get(`/eod/admin?employeeId=${empId}`);
      const reports = res.data || [];
      setEmployeeReports(reports);

      if (reports.length === 0) {
        resetForm();
        return reports;  // 💥 return important
      }

      const selected =
        (dateToSelect &&
          reports.find((r) => r.date.split("T")[0] === dateToSelect)) ||
        reports[0];

      setSelectedDate(selected.date.split("T")[0]);
      loadReport(selected);

      return reports;   // 💥 IMPORTANT
    } catch (e) {
      toast.error("Failed to load EOD history");
      return [];
    }
  };


  // Employee selection change
  const handleEmployeeChange = (e) => {
    const id = e.target.value;
    setSelectedEmployee(id);
    setEmployeeReports([]);
    setSelectedDate("");
    resetForm();
    if (id) fetchEmployeeEods(id);
  };

  // Date selection change
  const handleDateChange = (e) => {
    const date = e.target.value;
    setSelectedDate(date);

    const found = employeeReports.find(
      (r) => r.date.split("T")[0] === date
    );

    if (found) loadReport(found);
  };

  // Load single report
  const loadReport = (report, freshColumns) => {
    setForm({
      date: report.date?.split("T")[0] || "",
      reportingTime: report.reportingTime || "",
      name: report.name || "",
      eodTime: report.eodTime || "",
      project: report.project || "",
      summary: report.summary || "",
      nextDayPlan: report.nextDayPlan || "",
    });

    // Use merged rows from backend (already merged)
    if (Array.isArray(report.rows) && report.rows.length > 0) {
      setRows(report.rows);
    } else {
      setRows(templateRows);
    }

    // Always GLOBAL template columns, not report.columns
    setEditColumns(freshColumns || templateColumns);
  };
  // Reset form
  const resetForm = () => {
    setForm({
      date: "",
      reportingTime: "",
      name: "",
      eodTime: "",
      project: "",
      summary: "",
      nextDayPlan: "",
    });
    setRows([]);
  };

  // Format date DD/MM/YYYY
  const formatToDDMMYYYY = (d) => {
    if (!d) return "";
    const dt = new Date(d);
    const dd = String(dt.getDate()).padStart(2, "0");
    const mm = String(dt.getMonth() + 1).padStart(2, "0");
    const yy = dt.getFullYear();
    return `${dd}/${mm}/${yy}`;
  };

  // Edit row update
  const updateRow = (index, field, value) => {
    const copy = [...editRows];
    copy[index][field] = value;
    setEditRows(copy);
  };
  // const handleDeleteColumn = async (col) => {
  //   // 1️⃣ UI update immediately
  //   const filtered = editColumns.filter((c) => c !== col);
  //   setEditColumns(filtered);
  //   setTemplateColumns(filtered);

  //   const newRows = editRows.map((r) => {
  //     const copy = { ...r };
  //     delete copy[col];
  //     return copy;
  //   });
  //   setEditRows(newRows);

  //   // 2️⃣ Update Global Template Immediately
  //   try {
  //     await API.put("/eod/eod-template", { // Corrected endpoint
  //       columns: filtered,
  //       rows: templateRows,
  //     });

  //     // 3️⃣ Re-fetch Template → instant UI update
  //     await fetchTemplate();

  //     toast.success("Column removed");
  //   } catch (err) {
  //     toast.error("Template update failed");
  //   }
  // };



  // Delete row
  const handleDeleteColumn = async (col) => {
    // Remove from template & UI
    const filtered = editColumns.filter((c) => c !== col);

    setEditColumns(filtered);
    setTemplateColumns(filtered);

    // Delete from current edit rows
    const newRows = editRows.map((r) => {
      const copy = { ...r };
      delete copy[col];
      return copy;
    });

    setEditRows(newRows);

    // Also fix templateRows so mismatch na ho
    const newTemplateRows = templateRows.map((r) => {
      const copy = { ...r };
      delete copy[col];
      return copy;
    });
    setTemplateRows(newTemplateRows);

    try {
      await API.put("/eod/eod-template", {
        columns: filtered,
        rows: newTemplateRows,
      });

      await fetchTemplate();
      toast.success("Column removed");
    } catch (err) {
      toast.error("Template update failed");
    }
  };

  const deleteRow = (index) => {
    if (isEdit) {
      const newRows = editRows.filter((_, i) => i !== index);
      setEditRows(newRows);
    } else {
      const newRows = rows.filter((_, i) => i !== index);
      setRows(newRows);
    }
  };

  // Save EOD
  const saveEod = async () => {
    try {
      const eod = employeeReports.find(
        (r) => new Date(r.date).toISOString().split("T")[0] === selectedDate
      );

      if (!eod) return toast.error("No EOD selected");

      // Prepare safe payload for backend
      const payload = {
        form: {
          date: editForm.date,
          reportingTime: editForm.reportingTime,
          eodTime: editForm.eodTime,
          project: editForm.project,
          summary: editForm.summary,
          nextDayPlan: editForm.nextDayPlan,
        },

        // rows updated by admin
        rows: [...editRows],

        // columns updated by admin
        columns: [...editColumns],
      };

      // 1️⃣ Update single EOD + global template (if changed)
      const res = await API.put(`/eod/admin/${eod._id}`, payload);

      toast.success("EOD updated successfully");

      // 2️⃣ Reload template from server (updated)
      const tpl = await fetchTemplate();

      if (tpl) {
        setTemplateColumns(tpl.columns || []);
        setTemplateRows(tpl.rows || []);
      }

      // 3️⃣ Reload that employee's EOD reports
      await fetchEmployeeEods(selectedEmployee, selectedDate);

      // 4️⃣ Exit edit mode
      setIsEdit(false);

    } catch (err) {
      console.error("Admin update error:", err);
      toast.error(err.response?.data?.message || "Update failed");
    }
  };


  const getStatusBadgeClass = (s) => {
    switch (s) {
      case "Done":
        return "bg-green-200 text-green-800";
      case "Pending":
        return "bg-yellow-200 text-yellow-800";
      case "Working":
        return "bg-blue-200 text-blue-800";
      default:
        return "bg-gray-200 text-gray-700";
    }
  };

  return (
    <>
      <div className="min-h-screen p-6">
        <h1 className="text-3xl font-bold mb-6 text-center">📝 EOD Reports</h1>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (!isEdit) {
                setEditForm({ ...form });
                setEditRows([...rows]);
                // Use the columns from the currently loaded report
                const currentReport = employeeReports.find(r => r.date.split("T")[0] === selectedDate);
                const currentColumns = currentReport?.columns || templateColumns;
                setEditColumns(currentColumns);

                setIsEdit(true);
              } else {
                setIsEdit(false);
                setEditForm(null);
                setEditRows([]);
              }
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            {isEdit ? "Cancel Edit" : "Edit EOD"}
          </button>

          {isEdit && (
            <button
              onClick={() => {
                const col = prompt("Enter column name:");
                if (!col) return;

                if (editColumns.includes(col) || templateColumns.includes(col))
                  return toast.error("Column already exists");

                // 1️⃣ Update editColumns
                const newCols = [...editColumns, col];
                setEditColumns(newCols);

                // 2️⃣ Update templateColumns (so UI updates instantly)
                setTemplateColumns(newCols);

                // 3️⃣ Add new field to every row
                setEditRows(
                  editRows.map((r) => ({
                    ...r,
                    [col]: "",
                  }))
                );
              }}
              className="bg-green-600 text-white px-3 py-1 rounded"
            >
              + Add Column
            </button>
          )}

        </div>

        <div className="shadow-lg rounded-lg p-6 border border-gray-300 dark:border-gray-700">
          {/* HEADER */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div>
              <label className="text-sm font-semibold">Date</label>
              {isEdit ? (
                <input
                  type="date"
                  className="w-full p-2 border rounded"
                  value={editForm?.date || ""}
                  onChange={(e) =>
                    setEditForm({ ...(editForm || {}), date: e.target.value })
                  }
                />
              ) : (
                <input
                  type="date"
                  readOnly
                  className="w-full p-2 border rounded"
                  value={form.date}
                />
              )}
            </div>

            <div>
              <label className="text-sm font-semibold">Reporting Time</label>
              {isEdit ? (
                <input
                  type="time"
                  className="w-full p-2 border rounded"
                  value={editForm?.reportingTime || ""}
                  onChange={(e) =>
                    setEditForm({
                      ...(editForm || {}),
                      reportingTime: e.target.value,
                    })
                  }
                />
              ) : (
                <input
                  type="time"
                  readOnly
                  className="w-full p-2 border rounded"
                  value={form.reportingTime}
                />
              )}
            </div>

            <div>
              <label className="text-sm font-semibold">Employee</label>
              <select
                value={selectedEmployee}
                onChange={handleEmployeeChange}
                className="w-full p-2 border rounded"
              >
                <option value="" className="text-black">Select Employee</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id} className="text-black">
                    {emp.name} - {emp.position}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold">EOD Time</label>
              {isEdit ? (
                <input
                  type="time"
                  className="w-full p-2 border rounded"
                  value={editForm?.eodTime || ""}
                  onChange={(e) =>
                    setEditForm({ ...(editForm || {}), eodTime: e.target.value })
                  }
                />
              ) : (
                <input
                  type="time"
                  readOnly
                  className="w-full p-2 border rounded"
                  value={form.eodTime}
                />
              )}
            </div>

            {/* SELECT DATE DROPDOWN */}
            {employeeReports.length > 0 && (
              <div className="md:col-span-2">
                <label className="text-sm font-semibold">Select Date</label>

                <select
                  value={selectedDate}
                  onChange={handleDateChange}
                  className="w-full p-2 border rounded"
                >
                  {Array.from(
                    new Map(
                      employeeReports.map(rep => [
                        rep.date.split("T")[0],
                        rep
                      ])
                    ).values()
                  )
                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                    .map(rep => {
                      const dateStr = rep.date.split("T")[0];
                      return (
                        <option key={dateStr} value={dateStr} className="text-black">
                          {formatToDDMMYYYY(rep.date)}
                        </option>
                      );
                    })}
                </select>
              </div>
            )}


            <div className="md:col-span-2">
              <label className="text-sm font-semibold">Project</label>
              {isEdit ? (
                <input
                  className="w-full p-2 border rounded"
                  value={editForm?.project || ""}
                  onChange={(e) =>
                    setEditForm({ ...(editForm || {}), project: e.target.value })
                  }
                />
              ) : (
                <input
                  readOnly
                  className="w-full p-2 border rounded"
                  value={form.project}
                />
              )}
            </div>
          </div>

          {/* TABLE */}
          <div className="overflow-x-auto mb-6">
            <table className="w-full border">
              <thead>
                <tr>
                  {editColumns.map((col) => (
                    <th key={col} className="border p-2 relative">
                      {col}

                      {isEdit && (
                        <button
                          onClick={() => setModalDeleteColumn({ open: true, column: col })}
                          type="button"
                          className="
    ml-2 px-2 py-0.5 
    border border-red-400 
    text-red-600 
    rounded-md  
    hover:bg-red-50  
    hover:border-red-500  
    hover:text-red-700 
    transition-all duration-150  
    text-xs font-bold"
                        >
                          X
                        </button>

                      )}
                    </th>
                  ))}

                  <th className="border p-2">Action</th>
                </tr>
              </thead>

              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={editColumns.length + 1}
                      className="text-center p-4 text-gray-500"
                    >
                      No rows
                    </td>
                  </tr>
                )}

                {/* EDIT MODE */}
                {isEdit
                  ? editRows.map((row, i) => (
                    <tr key={i}>
                      {editColumns.map((col) => (
                        <td key={col} className="border p-2">
                          {col === "status" ? (
                            <select
                              value={row[col] ?? ""}
                              onChange={(e) =>
                                updateRow(i, col, e.target.value)
                              }
                              className="w-full border rounded p-1"
                            >
                              <option>Done</option>
                              <option>Pending</option>
                              <option>Working</option>
                            </select>
                          ) : (
                            <input
                              value={row[col] ?? ""}
                              onChange={(e) =>
                                updateRow(i, col, e.target.value)
                              }
                              className="w-full border rounded p-1"
                            />
                          )}
                        </td>
                      ))}

                      <td className="border p-2 text-center">
                        <button
                          onClick={() => setModalDelete({ open: true, index: i })}
                          className="text-sm text-red-600 font-semibold px-3 py-1 rounded border border-red-200 hover:bg-red-50 hover:border-red-400 transition"
                        >
                          Delete
                        </button>

                      </td>
                    </tr>
                  ))
                  : rows.map((row, i) => (
                    <tr key={i}>
                      {editColumns.map((col) => (
                        <td key={col} className="border p-2">
                          {col === "status" ? (
                            <span className={getStatusBadgeClass(row.status)}>
                              {row.status || "—"}
                            </span>
                          ) : (
                            row[col] ?? "-"
                          )}
                        </td>
                      ))}

                      <td className="border p-2 text-center">—</td>
                    </tr>
                  ))}
              </tbody>
            </table>

            {/* ADD ROW BUTTON */}
            {isEdit && (
              <button
                onClick={() =>
                  setEditRows([
                    ...editRows,
                    {
                      time: "",
                      task: "",
                      description: "",
                      status: "",
                      remarks: "",
                    },
                  ])
                }
                className="mt-3 bg-green-600 text-white px-3 py-2 rounded"
              >
                + Add Row
              </button>
            )}

            {/* COLUMN DELETE MODAL */}
            {modalDeleteColumn.open && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="rounded-lg p-6 max-w-md w-full bg-white text-black dark:bg-gray-800 dark:text-white shadow-xl">

                  {/* Header */}
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Confirm Column Deletion</h2>
                    <button
                      onClick={() =>
                        setModalDeleteColumn({ open: false, column: null })
                      }
                      className="hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Message */}
                  <p className="mb-6 text-gray-700 dark:text-gray-300">
                    Are you sure you want to delete column{" "}
                    <span className="font-bold text-red-600">
                      {modalDeleteColumn.column}
                    </span>
                    ? This action cannot be undone.
                  </p>

                  {/* Buttons */}
                  <div className="flex justify-end gap-4">
                    <button
                      onClick={() =>
                        setModalDeleteColumn({ open: false, column: null })
                      }
                      className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
                    >
                      Cancel
                    </button>

                    <button
                      onClick={() => {
                        handleDeleteColumn(modalDeleteColumn.column);
                        setModalDeleteColumn({ open: false, column: null });
                      }}
                      className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ROW DELETE MODAL */}
            {modalDelete.open && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="rounded-lg p-6 max-w-md w-full bg-white text-black dark:bg-gray-800 dark:text-white shadow-xl">

                  {/* Header */}
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Delete Row?</h2>
                    <button
                      onClick={() => setModalDelete({ open: false, index: null })}
                      className="hover:text-gray-700 dark:hover:text-gray-300"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  {/* Message */}
                  <p className="mb-6 text-gray-700 dark:text-gray-300">
                    Are you sure you want to delete this row?
                  </p>

                  {/* Buttons */}
                  <div className="flex justify-end gap-4">
                    <button
                      onClick={() => setModalDelete({ open: false, index: null })}
                      className="px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500"
                    >
                      Cancel
                    </button>

                    <button
                      onClick={() => {
                        deleteRow(modalDelete.index);
                        setModalDelete({ open: false, index: null });
                      }}
                      className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}



            {/* SAVE BUTTON */}
            {isEdit && (
              <button
                onClick={saveEod}
                className="mt-4 bg-blue-700 text-white px-4 py-2 rounded"
              >
                Save Changes
              </button>
            )}
          </div>

          {/* SUMMARY */}
          <div className="mb-4">
            <label className="font-semibold text-sm">Summary</label>
            {isEdit ? (
              <textarea
                className="w-full p-3 border rounded"
                value={editForm?.summary || ""}
                onChange={(e) =>
                  setEditForm({
                    ...(editForm || {}),
                    summary: e.target.value,
                  })
                }
              />
            ) : (
              <textarea
                readOnly
                className="w-full p-3 border rounded "
                value={form.summary}
              />
            )}
          </div>

          {/* NEXT DAY PLAN */}
          <div className="mb-4">
            <label className="font-semibold text-sm">Next Day Plan</label>
            {isEdit ? (
              <textarea
                className="w-full p-3 border rounded"
                value={editForm?.nextDayPlan || ""}
                onChange={(e) =>
                  setEditForm({
                    ...(editForm || {}),
                    nextDayPlan: e.target.value,
                  })
                }
              />
            ) : (
              <textarea
                readOnly
                className="w-full p-3 border rounded "
                value={form.nextDayPlan}
              />
            )}
          </div>

        </div>
      </div>
    </>
  )
};
