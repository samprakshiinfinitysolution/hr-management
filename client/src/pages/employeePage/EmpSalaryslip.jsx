
import React, { useEffect, useState } from "react";
import {
  FileText,
  Calendar,
  Eye,
  Download,
  X,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import API from "../../utils/api";
import { jsPDF } from "jspdf";

export default function EmpSalarySlip() {
  const [slips, setSlips] = useState([]);
  const [employee, setEmployee] = useState({});
  const [selectedSlip, setSelectedSlip] = useState(null);
  const logo = "/logo.png";

  useEffect(() => {
    fetchEmployee();
    fetchSlips();
  }, []);

  const fetchEmployee = async () => {
    try {
      const res = await API.get("/profile");
      setEmployee(res.data);
    } catch {
      toast.error("Error fetching employee data");
    }
  };

  const fetchSlips = async () => {
    try {
      const res = await API.get("/salary/my-slips");
      // Ensure that we always set an array to the slips state
      const slipsData = Array.isArray(res.data) ? res.data : [];
      setSlips(slipsData);
    } catch (err) {
      console.error("Failed to fetch slips:", err);
      toast.error(err.response?.data?.message || "Unable to load salary slips");
    }
  };
  const handleDownload = async (slip) => {
    try {
      const doc = new jsPDF("p", "pt", "a4");

      // Logo Load
      const img = new Image();
      img.src = logo;
      await img.decode();

      let y = 40;
      doc.addImage(img, "PNG", 230, y, 150, 80);
      y += 100;

      // Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("Salary Slip", 297, y, { align: "center" });
      y += 20;

      doc.setFontSize(13);
      doc.text(`${slip.month}/${slip.year}`, 297, y, { align: "center" });
      y += 25;
      doc.line(40, y, 555, y);
      y += 20;

      // ---------------------------------------------
      // EMPLOYEE DETAILS
      // ---------------------------------------------
      doc.setFontSize(12);
      doc.text(`Name: ${employee.name}`, 40, y);
      doc.text(`Employee ID: ${employee._id}`, 300, y);
      y += 20;

      doc.text(`Designation: ${employee.position || "-"}`, 40, y);
      doc.text(`Paid Days: ${slip.attendance?.present ?? 0}`, 300, y);
      y += 20;

      doc.text(`Month: ${slip.month}`, 40, y);
      doc.text(`Year: ${slip.year}`, 300, y);
      y += 30;

      doc.line(40, y, 555, y);
      y += 25;

      // ---------------------------------------------
      // TABLE: EARNINGS + DEDUCTIONS
      // ---------------------------------------------
      doc.setFontSize(12);
      doc.text("Earnings", 60, y);
      doc.text("Amount (Rs.)", 230, y, { align: "right" });

      doc.text("Deductions", 350, y);
      doc.text("Amount (Rs.)", 550, y, { align: "right" });
      y += 20;

      // Earnings Array
      const earnings = [
        ["Basic Salary", slip.earnings?.base ?? slip.baseSalary],
        ["HRA", slip.earnings?.hra ?? 0],
        ["Conveyance", slip.earnings?.conveyance ?? 0],
        ["Children Allowance", slip.earnings?.childrenAllowance ?? 0],
        ["Fixed Allowance", slip.earnings?.fixedAllowance ?? 0],
      ];

      // Deductions Array
      const deductions = [
        ["Absent Deduction", slip.deductions?.absentDeduction],
        ["Half Day Deduction", slip.deductions?.halfDayDeduction],
        ["Late Deduction", slip.deductions?.lateDeduction],
        ["Early Checkout Deduction", slip.deductions?.earlyCheckoutDeduction],
        ["PF", slip.deductions?.pf],
        ["Professional Tax", slip.deductions?.professionalTax],
      ];


      const maxRows = Math.max(earnings.length, deductions.length);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);

      for (let i = 0; i < maxRows; i++) {
        if (earnings[i]) {
          doc.text(`${i + 1}. ${earnings[i][0]}`, 40, y);
          doc.text(`Rs. ${Number(earnings[i][1] || 0).toFixed(2)}`, 250, y, {
            align: "right",
          });
        }

        if (deductions[i]) {
          doc.text(`${i + 1}. ${deductions[i][0]}`, 320, y);
          doc.text(`Rs. ${Number(deductions[i][1] || 0).toFixed(2)}`, 550, y, {
            align: "right",
          });
        }
        y += 18;
      }

      y += 10;
      doc.line(40, y, 555, y);
      y += 15;

      // ---------------------------------------------
      // TOTALS
      // ---------------------------------------------
      doc.setFont("helvetica", "bold");

      const grossSalary = slip.earnings?.grossSalary ?? 0;
      const totalDeduction = slip.deductions?.total ?? 0;

      doc.text("Gross Salary", 40, y);
      doc.text(`Rs. ${grossSalary.toFixed(2)}`, 250, y, { align: "right" });

      doc.text("Total Deductions", 320, y);
      doc.text(`Rs. ${totalDeduction.toFixed(2)}`, 550, y, {
        align: "right",
      });
      y += 25;

      // ---------------------------------------------
      // NET PAY
      // ---------------------------------------------
      doc.setFontSize(14);
      doc.text("Net Pay", 40, y);
      doc.text(`Rs. ${(slip.netSalary || 0).toFixed(2)}`, 550, y, {
        align: "right",
      });

      y += 40;
      doc.setFontSize(10);
      doc.text(
        "*HRA: House Rent Allowance, CEA: Children Education Allowance",
        40,
        y
      );
      doc.text(
        "This is a system-generated payslip and does not require a signature.",
        40,
        y + 15
      );

      const monthName = new Date(0, slip.month - 1).toLocaleString("default", {
        month: "long",
      });
      doc.save(`SalarySlip_${monthName}_${slip.year}.pdf`);
    } catch (err) {
      console.log(err);
      toast.error("PDF generation failed");
    }
  };

  // ---------------------------------------------
  // UI
  // ---------------------------------------------
  return (
    <div className="min-h-screen p-5">
      <Toaster />

      <h1 className="text-2xl font-bold mb-5 flex gap-2 items-center">
        <FileText size={26} className="text-blue-600" />
        Salary Slip Summary
      </h1>

      {slips.length === 0 ? (
        <p>No salary slips available.</p>
      ) : (
        <div className="space-y-4">
          {slips.map((slip, i) => (
            <div
              key={i}
              className="p-4 rounded-xl shadow  border border-gray-200"
            >
              <div className="flex justify-between">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Calendar size={18} />
                  {new Date(0, slip.month - 1).toLocaleString("default", {
                    month: "long",
                  })}{" "}
                  {slip.year}
                </h2>

                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedSlip(slip)}
                    className="bg-green-500 text-white px-3 py-1 rounded-md flex items-center gap-1"
                  >
                    <Eye size={14} /> View
                  </button>

                  <button
                    onClick={() => handleDownload(slip)}
                    className="bg-blue-500 text-white px-3 py-1 rounded-md flex items-center gap-1"
                  >
                    <Download size={14} /> Download
                  </button>
                </div>
              </div>

              <p className="mt-2 font-medium">
                Base Salary: ₹{slip.baseSalary}
              </p>
              <p className="font-medium">Net Salary: ₹{slip.netSalary}</p>

              <div className="mt-2 flex items-center gap-2 text-sm">
                {slip.totalDeduction > 0 ? (
                  <AlertTriangle size={16} className="text-yellow-600" />
                ) : (
                  <CheckCircle size={16} className="text-green-600" />
                )}
                <p><strong>Remarks:</strong> {slip.remarks || "No remarks"}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* VIEW MODAL */}
      {selectedSlip && (
        <div className="fixed inset-0 bg-black/40 flex justify-center items-center p-4">
          <div className="bg-gray-300 text-black rounded-lg w-full max-w-lg p-5 relative shadow-xl">
            <button
              className="absolute right-3 top-3"
              onClick={() => setSelectedSlip(null)}
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold mb-4">
              Salary Slip ({new Date(0, selectedSlip.month - 1).toLocaleString("default", { month: "long" })}/{selectedSlip.year})
            </h2>

            <p>Base Salary: ₹{selectedSlip.baseSalary}</p>
            <p>Allowances: ₹{(selectedSlip.earnings?.grossSalary - selectedSlip.baseSalary)?.toFixed(2) || '0.00'}</p>
            <p>Deduction: ₹{selectedSlip.deduction?.toFixed(2) || '0.00'}</p>
            <p className="font-bold text-lg mt-3">
              Net Pay: ₹{selectedSlip.netSalary}
            </p>

            <p className="mt-3">
              <strong>Remarks:</strong> {selectedSlip.remarks || "No remarks"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
