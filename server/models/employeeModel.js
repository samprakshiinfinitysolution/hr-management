
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  phone: { type: String, required: true },
  position: { type: String, required: true },
  salary: { type: Number, default: 0 },
  address: { type: String },
  department: { type: String },
  jobType: { type: String },
  emergencyName: { type: String },
  emergencyRelation: { type: String },
  emergencyNumber: { type: String },
  birthday: { type: Date },
  image: { type: String },
  highestQualification: { type: String },
  yearOfPassing: { type: String },
  accountHolder: { type: String },
  accountNumber: { type: String },
  ifsc: { type: String },
  bankName: { type: String },
  idType: { type: String },
  idNumber: { type: String },
  fullName: { type: String },
  contact: { type: String },
  verified: { type: Boolean, default: false },
  editCount: { type: Number, default: 0 },
  status: { type: String, default: "Verified" },
  pendingUpdates: { type: Object },
  alternateNumber: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
}, { timestamps: true });

employeeSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

export default mongoose.model("Employee", employeeSchema);