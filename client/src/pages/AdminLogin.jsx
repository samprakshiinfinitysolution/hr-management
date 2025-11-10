import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { loginSuccess } from "../features/auth/authSlice";
import API from "../utils/api";
import Loader from "../components/Laoder";
import adminLoginImage from "../assets/admin_login.png";

function AdminLogin() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
    setSuccess("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await API.post("/admin/login", form);
      const { token, role, name, id } = res.data;

      dispatch(
        loginSuccess({
          user: { email: form.email, role, name, id },
          token,
        })
      );

      localStorage.setItem("token", token);
      localStorage.setItem("role", role.toLowerCase());
      localStorage.setItem("name", name);
      localStorage.setItem(
        "admin",
        JSON.stringify({ email: form.email, role, name, id })
      );

      setSuccess(res.data.message);
      setError("");

      setTimeout(() => {
        if (["admin", "hr", "manager"].includes(role.toLowerCase())) {
          navigate("/admin/dashboard");
        } else {
          navigate("/");
        }
      }, 100);
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
      setSuccess("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
      {loading && <Loader />}
      <div className="hidden lg:flex flex-col items-center justify-center bg-gray-800 text-white p-12 text-center">
        <h1 className="text-4xl font-bold mb-4">HR Management System</h1>
        <p className="text-lg text-gray-300">
          Streamlining your workforce management.
        </p>
        <div className="mt-8 w-full max-w-xs h-74 bg-gray-700 rounded-lg">
          <img src={adminLoginImage} alt="Admin login" className="w-full h-full object-cover rounded-lg" />
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12 bg-gray-100 dark:bg-gray-900">
        <form
          onSubmit={handleLogin}
          className="bg-white dark:bg-gray-800 text-black dark:text-white p-8 rounded-2xl shadow-lg w-full max-w-md"
        >
          <h2 className="text-3xl font-bold mb-2 text-center text-gray-800 dark:text-white">
            Welcome Back
          </h2>
          <p className="text-center text-gray-500 dark:text-gray-400 mb-8">
            Login as Admin, HR, or Manager
          </p>

          {error && (
            <p className="text-red-500 text-center mb-4 bg-red-100 dark:bg-red-900/30 p-3 rounded-lg">
              {error}
            </p>
          )}
          {success && (
            <p className="text-green-500 text-center mb-4 bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
              {success}
            </p>
          )}

          <div className="mb-4 relative">
            <Mail
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
              required
              disabled={loading}
              className="w-full p-4 pl-12 text-black dark:text-white bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4 relative">
            <Lock
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
              size={20}
            />
            <input
              type={showPassword ? "text" : "password"}
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
              required
              disabled={loading}
              className="w-full p-4 pl-12 border text-black dark:text-white bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 pr-12"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          <div className="text-right mb-6">
            <Link
              to="/admin/forgot-password"
              className="text-sm text-blue-600 hover:underline"
            >
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold shadow-lg hover:bg-blue-700 transition-all disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          <p className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
            Don’t have an account?{" "}
            <Link
              to="/admin-register"
              className="font-semibold text-blue-600 hover:underline"
            >
              Register
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default AdminLogin;
