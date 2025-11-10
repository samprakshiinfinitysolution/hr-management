import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import API from "../utils/api";
import { User, Mail, Lock } from "lucide-react";
import adminRegisterImage from "../assets/admin_register.png";

function AdminRegister() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const res = await API.post("/admin/register", form);
      alert(res.data.message);
      setForm({ name: "", email: "", password: "" });
      navigate("/admin-login");
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col items-center justify-center bg-gray-800 text-white p-12 text-center">
        <h1 className="text-4xl font-bold mb-4">Join Our Team</h1>
        <p className="text-lg text-gray-300">
          Register as a new administrator to get started.
        </p>
        <div className="mt-8 w-full max-w-xs h-74 bg-gray-700 rounded-lg">
          <img src={adminRegisterImage} alt="Admin registration" className="w-full h-full object-cover rounded-lg" />
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12 bg-gray-100 dark:bg-gray-900">
        <form
          onSubmit={handleRegister}
          className="bg-white dark:bg-gray-800 text-black dark:text-white p-8 rounded-2xl shadow-lg w-full max-w-md"
        >
          <h2 className="text-3xl font-bold mb-2 text-center text-gray-800 dark:text-white">
            Create an Account
          </h2>
          <p className="text-center text-gray-500 dark:text-gray-400 mb-8">
            Enter your details to register.
          </p>

          {error && (
            <p className="text-red-500 text-center mb-4 bg-red-100 dark:bg-red-900/30 p-3 rounded-lg">
              {error}
            </p>
          )}

          <div className="mb-4 relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              value={form.name}
              onChange={handleChange}
              required
              className="w-full p-4 pl-12 text-black dark:text-white bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4 relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              required
              className="w-full p-4 pl-12 text-black dark:text-white bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-6 relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              required
              className="w-full p-4 pl-12 text-black dark:text-white bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold shadow-lg hover:bg-blue-700 transition-all"
          >
            Register
          </button>

          <p className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
            Already have an account?{" "}
            <Link to="/admin-login" className="font-semibold text-blue-600 hover:underline">
              Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default AdminRegister;
