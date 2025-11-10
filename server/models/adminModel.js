
// import mongoose from "mongoose";
// import bcrypt from "bcryptjs";

// const adminSchema = new mongoose.Schema({
//   name: { type: String, required: true },
//   email: { type: String, required: true, unique: true, lowercase: true },
//   password: { type: String, required: true },
//   role: {
//     type: String,
//     enum: ["admin", "hr", "manager"],
//     default: "admin",
//   },
//   createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
//   isMainAdmin: { type: Boolean, default: false },
// });

// adminSchema.pre("save", async function (next) {
//   if (!this.isModified("password")) return next();
//   const salt = await bcrypt.genSalt(10);
//   this.password = await bcrypt.hash(this.password, salt);
//   next();
// });

// export default mongoose.model("Admin", adminSchema);


import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  role: {
    type: String,
    enum: ["admin", "hr", "manager"],
    default: "admin",
  },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  isMainAdmin: { type: Boolean, default: false },

  // ✅ Attendance and office timing settings
  attendanceSettings: {
    officeStartTime: { type: String, default: "10:00" },
    lateGraceMinutes: { type: Number, default: 15 },
    halfDayCutoff: { type: String, default: "11:00" },
    officeEndTime: { type: String, default: "18:00" },
    halfDayCheckoutCutoff: { type: String, default: "17:00" },
    autoCheckoutTime: { type: String, default: "18:00" },
  },
});

// Hash password before saving
adminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

export default mongoose.model("Admin", adminSchema);
