import { Link } from "react-router-dom";
import { Users, UserCog } from "lucide-react";

function LoginSelection() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="text-center mb-10">
       <h1 className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-white mb-2">
        HR - Management System
      </h1>
       <p className="text-lg text-gray-500 dark:text-gray-400">Please select your role to login</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl">
        <Link to="/employee-login">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg text-center transform hover:-translate-y-2 transition-transform duration-300">
            <Users className="mx-auto text-blue-500 mb-4" size={48} />
            <h3 className="text-2xl font-semibold text-gray-800 dark:text-white">Employee</h3>
          </div>
        </Link>

        <Link to="/admin-login">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg text-center transform hover:-translate-y-2 transition-transform duration-300">
            <UserCog className="mx-auto text-green-500 mb-4" size={48} />
            <h3 className="text-2xl font-semibold text-gray-800 dark:text-white">Admin</h3>
          </div>
        </Link>
      </div>
    </div>
  );
}

export default LoginSelection;


