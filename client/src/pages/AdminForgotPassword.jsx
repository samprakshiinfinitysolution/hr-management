import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import forgote_password from "../assets/forgote_password.png";

function AdminForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Implement your forgot password logic here
    // For example, call an API to send a reset link to the email
    setMessage("A reset link has been sent to your email address.");
  };

  return (
    <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col items-center justify-center bg-gray-800 text-white p-12 text-center">
        <h1 className="text-4xl font-bold mb-4">Forgot Password?</h1>
        <p className="text-lg text-gray-300">
          Enter your email address to reset your password.
        </p>
        <div className="mt-8 w-full max-w-xs h-74 bg-gray-700 rounded-lg">
         <img src={forgote_password} alt="Admin registration" className="w-full h-full object-cover rounded-lg" />
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-12 bg-gray-100 dark:bg-gray-900">
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-800 text-black dark:text-white p-8 rounded-2xl shadow-lg w-full max-w-md"
        >
          <h2 className="text-3xl font-bold mb-2 text-center text-gray-800 dark:text-white">
            Reset Password
          </h2>
          <p className="text-center text-gray-500 dark:text-gray-400 mb-8">
            Enter your email to receive a reset link.
          </p>

          {error && (
            <p className="text-red-500 text-center mb-4 bg-red-100 dark:bg-red-900/30 p-3 rounded-lg">
              {error}
            </p>
          )}
          {message && (
            <p className="text-green-500 text-center mb-4 bg-green-100 dark:bg-green-900/30 p-3 rounded-lg">
              {message}
            </p>
          )}

          <div className="mb-4 relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="email"
              name="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-4 pl-12 text-black dark:text-white bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold shadow-lg hover:bg-blue-700 transition-all"
          >
            Send Reset Link
          </button>
          <p className="mt-4 text-center text-gray-600 dark:text-gray-400">
            Remember your password?{" "}
            <Link to="/admin-login" className="text-blue-600 hover:underline">Back to Login</Link>
          </p>
        </form>
      </div>
    </div>
  );
}

export default AdminForgotPassword;
