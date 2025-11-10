import React, { useEffect, useState } from "react";
import {
  FileText,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Eye,
  Download,
  X,
} from "lucide-react";
import { useSelector } from "react-redux";
import toast, { Toaster } from "react-hot-toast";
import API from "../../utils/api";
import { jsPDF } from "jspdf";

export default function EmpSalaryslip() {
  const [slips, setSlips] = useState([]);
  const [employee, setEmployee] = useState({
    name: "John Doe",
    position: "Software Engineer",
    employeeId: "EMP123",
  });
  const [selectedSlip, setSelectedSlip] = useState(null);
  const { isDarkMode } = useSelector((state) => state.settings);
  const logo = "/logo.png"; // ✅ Correct logo path (from public folder)

  useEffect(() => {
    fetchEmployee();
    fetchSlips();
  }, []);

  const fetchEmployee = async () => {
    try {
      const res = await API.get("/profile");
      setEmployee({
        name: res.data.name || "John Doe",
        position: res.data.position || "Software Engineer",
        employeeId: res.data._id || "EMP123",
      });
    } catch {
      toast.error("Error fetching profile");
    }
  };

  const fetchSlips = async () => {
    try {
      const res = await API.get("/salary/my-slips");
      const formattedSlips = res.data.map((slip) => ({
        month: new Date(0, slip.month - 1).toLocaleString("default", {
          month: "long",
        }),
        year: slip.year,
        baseSalary: slip.baseSalary,
        deduction: slip.deduction,
        netSalary: slip.netSalary,
        remarks: slip.remarks || "No remarks",
        color:
          slip.deduction > 1000
            ? "text-red-600"
            : slip.deduction > 0
            ? "text-yellow-600"
            : "text-green-600",
        paidDays: 30,
      }));
      setSlips(formattedSlips);
    } catch {
      toast.error("Error fetching salary slips");
    }
  };

  // ✅ FIXED WORKING PDF DOWNLOAD
  const handleDownload = async (data) => {
    try {
      const doc = new jsPDF("p", "pt", "a4");

      // Load logo properly
      const img = new Image();
      img.src = logo;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      let y = 40;
      doc.addImage(img, "PNG", 230, y, 150, 80);
      y += 100;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.setTextColor(33, 66, 99);
      doc.text("Samprakshi Infinity Solution Pvt. Ltd.", 297.5, y, {
        align: "center",
      });

      y += 25;
      doc.setFontSize(13);
      doc.setTextColor(80);
      doc.text(`Salary Slip - ${data.month} ${data.year}`, 297.5, y, {
        align: "center",
      });

      y += 20;
      doc.setDrawColor(150);
      doc.line(40, y, 555, y);
      y += 20;

      // Employee Details
      doc.setFillColor(230, 240, 255);
      doc.roundedRect(40, y, 515, 25, 5, 5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(33, 66, 99);
      doc.text("Employee Details", 50, y + 17);

      y += 35;
      const empBoxHeight = 90;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.roundedRect(40, y, 515, empBoxHeight, 5, 5);

      const empFields = [
        [`Name: ${employee.name}`, `Employee ID: ${employee.employeeId}`],
        [`Designation: ${employee.position}`, `Month: ${data.month}`],
        [`Year: ${data.year}`, `Paid Days: ${data.paidDays || 30}`],
      ];

      let fieldY = y + 15;
      empFields.forEach((row, idx) => {
        doc.text(row[0], 50, fieldY);
        doc.text(row[1], 300, fieldY);
        fieldY += 25;
      });

      y += empBoxHeight + 20;

      // Salary calculations
      const basic = data.baseSalary;
      const hra = Math.round(basic * 0.25);
      const conveyance = 2000;
      const childrenAllowance = 1000;
      const fixedAllowance = 1000;
      const gross = basic + hra + conveyance + childrenAllowance + fixedAllowance;

      const pf = Math.round(basic * 0.12);
      const professionalTax = 200;
      const totalDeduction = pf + professionalTax + (data.deduction || 0);
      const netPay = gross - totalDeduction;

      const earnings = [
        ["Basic", basic],
        ["HRA", hra],
        ["Conveyance", conveyance],
        ["CEA", childrenAllowance],
        ["Fixed Allowance", fixedAllowance],
        ["Gross Earnings", gross],
      ];

      const deductions = [
        ["EPF", pf],
        ["Professional Tax", professionalTax],
        ["Other Deductions", data.deduction || 0],
        ["Total Deductions", totalDeduction],
      ];

      // Header Row
      doc.setFillColor(230, 240, 255);
      doc.roundedRect(40, y, 515, 25, 5, 5, "F");
      doc.setFont("helvetica", "bold");
      doc.setTextColor(33, 66, 99);
      doc.setFontSize(12);
      doc.text("Earnings", 60, y + 17);
      doc.text("Amount (Rs.)", 235, y + 17, { align: "right" });
      doc.text("Deductions", 350, y + 17);
      doc.text("Amount (Rs.)", 530, y + 17, { align: "right" });

      y += 35;

      // Table
      doc.setTextColor(0, 0, 0);
      const tableHeight = Math.max(earnings.length, deductions.length) * 18 + 10;
      doc.roundedRect(40, y, 515, tableHeight, 5, 5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);

      const maxRows = Math.max(earnings.length, deductions.length);
      let rowHeight = 18;
      let rowY = y + 15;

      for (let i = 0; i < maxRows; i++) {
        if (earnings[i]) {
          doc.text(`${i + 1}. ${earnings[i][0]}`, 50, rowY);
          doc.text(`Rs. ${earnings[i][1]}`, 235, rowY, { align: "right" });
        }
        if (deductions[i]) {
          doc.text(`${i + 1}. ${deductions[i][0]}`, 350, rowY);
          doc.text(`Rs. ${deductions[i][1]}`, 530, rowY, { align: "right" });
        }
        rowY += rowHeight;
      }

      y += tableHeight + 20;

      // Net Pay Box
      doc.setFillColor(230, 240, 255);
      doc.roundedRect(40, y, 515, 30, 5, 5, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(33, 66, 99);
      doc.text("Net Pay", 50, y + 20);
      doc.text(`Rs. ${netPay}`, 550, y + 20, { align: "right" });
      y += 50;

      // Footer
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
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

      // ✅ Save file
      doc.save(`SalarySlip_${data.month}_${data.year}.pdf`);
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF");
    }
  };

  return (
    <div className="min-h-screen  p-6 flex justify-center items-start">
      <Toaster />
      <div className="w-screen max-w-4xl mx-auto rounded-2xl p-6 border-gray-200">
      
          <FileText className="text-blue-600 w-8 h-8" />
          <h1 className="text-3xl font-bold ">Salary Slip Summary</h1>

        <p className=" mb-6">
          View or download your last three months’ salary slips.
        </p>

        <div className="space-y-4">
          {slips.length === 0 ? (
            <div className="text-center py-8 ">
              <FileText className="mx-auto h-12 w-12  mb-4" />
              <p>No salary slips available</p>
            </div>
          ) : (
            slips.map((data, idx) => (
              <div
                key={idx}
                className="  border-gray-300 rounded-xl p-4 shadow-sm hover:shadow-2xl transition"
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="text-blue-500" size={18} />
                    <h2 className="font-semibold text-lg ">
                      {data.month} {data.year}
                    </h2>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedSlip(data)}
                      className="flex items-center gap-1 text-sm bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded-md"
                    >
                      <Eye size={14} /> View
                    </button>
                    <button
                      onClick={() => handleDownload(data)}
                      className="flex items-center gap-1 text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded-md"
                    >
                      <Download size={14} /> Download
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-1 ">
                  <p>
                    <span className="font-semibold">Base Salary:</span> ₹
                    {data.baseSalary}
                  </p>
                  <p>
                    <span className="font-semibold">Deduction:</span>{" "}
                    <span
                      className={
                        data.deduction > 0
                          ? "text-red-600 font-medium"
                          : "text-green-600 font-medium"
                      }
                    >
                      ₹{data.deduction}
                    </span>
                  </p>
                  <p>
                    <span className="font-semibold">Net Pay:</span> ₹
                    {data.netSalary}
                  </p>
                </div>

                <div className="flex items-center gap-2 mt-2">
                  {data.remarks !== "No remarks" ? (
                    <AlertTriangle className={data.color} size={18} />
                  ) : (
                    <CheckCircle className={data.color} size={18} />
                  )}
                  <p className={`${data.color} font-semibold text-sm`}>
                    {data.remarks}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* -------- VIEW MODAL -------- */}
      {selectedSlip && (
        <div className={`fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50 ${isDarkMode ? 'dark' : ''}`}>
          <div className="bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl shadow-2xl p-6 w-[90%] max-w-md relative">
            <button
              onClick={() => setSelectedSlip(null)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold mb-4 text-center text-blue-600 dark:text-blue-400">
              Salary Slip - {selectedSlip.month} {selectedSlip.year}
            </h2>

            <p>
              <strong>Base Salary:</strong> ₹{selectedSlip.baseSalary}
            </p>
            <p>
              <strong>Deduction:</strong> ₹{selectedSlip.deduction}
            </p>
            <p>
              <strong>Net Pay:</strong> ₹{selectedSlip.netSalary}
            </p>
            <p className="mt-2">
              <strong>Remarks:</strong> {selectedSlip.remarks}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
