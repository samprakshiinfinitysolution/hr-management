
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { loginSuccess } from "../features/auth/authSlice";
import API from "../utils/api";
import Loader from "../components/Laoder"
import employeeLoginImage from "../assets/employee_login.png";

function EmployeeLogin() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
    setSuccess("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await API.post("/login", form);
      const { token, employee } = res.data;

      dispatch(
        loginSuccess({
          user: { name: employee.name, email: employee.email, role: "employee" },
          token,
        })
      );

      localStorage.setItem("token", token);
      localStorage.setItem("role", "employee");
      setSuccess("Login successful");

      setTimeout(() => {
        navigate("/employee");
        setForm({ email: "", password: "" });
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
      {loading && <Loader />}
      <div className="hidden lg:flex flex-col items-center justify-center bg-gray-800 text-white p-12 text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome, Employee!</h1>
        <p className="text-lg text-gray-300">
          Access your dashboard, tasks, and attendance records.
        </p>
        <div className="mt-8 w-full max-w-xs h-74 bg-gray-700 rounded-lg">
          <img src={employeeLoginImage} alt="Employee login illustration" className="w-full h-full object-cover rounded-lg" />
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12 bg-gray-100 dark:bg-gray-900">
        <form
          onSubmit={handleLogin}
          className="bg-white dark:bg-gray-800 text-black dark:text-white p-8 rounded-2xl shadow-lg w-full max-w-md"
        >
          <h2 className="text-3xl font-bold mb-2 text-center text-gray-800 dark:text-white">
            Employee Login
          </h2>
          <p className="text-center text-gray-500 dark:text-gray-400 mb-8">
            Sign in to continue
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
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
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

          <div className="mb-6 relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold shadow-lg hover:bg-blue-700 transition-all disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          <p className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
            Back to{" "}
            <Link to="/" className="font-semibold text-blue-600 hover:underline">
              Login Selection
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default EmployeeLogin;