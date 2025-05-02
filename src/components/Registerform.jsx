import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import { Loader } from "lucide-react"; // Import Loader icon

export function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams(); 
  const email = searchParams.get('email');

  // Group all useState hooks together at the top level
  const [isCheckingEmail, setIsCheckingEmail] = useState(true);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(
    localStorage.getItem("isRegistered") === "false"
  );

  // Email verification effect
  useEffect(() => {
    const checkEmail = async () => {
      try {
        if (!email) {
          navigate('/404');
          return;
        }

        const response = await fetch(`http://127.0.0.1:5000/api/check-email?email=${email}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        const data = await response.json();

        if (!response.ok || !data.exists) {
          navigate('/404');
        }
      } catch (error) {
        console.error("Error checking email:", error);
        navigate('/404');
      } finally {
        setIsCheckingEmail(false);
      }
    };

    checkEmail();
  }, [email, navigate]);

  // Registration success effect
  useEffect(() => {
    if (isRegistered && !loading) {
      navigate('/login');
    }
  }, [isRegistered, loading, navigate]);

  const handleBackToLogin = () => {
    navigate('/login');
  };

  // Form validation and submission
  const handleSubmit = async () => {
    // Trim the name
    const trimmedName = name.trim();
    
    // Input validation
    if (!trimmedName) {
      toast.error("Name is required");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    // Add new validation for username and password matching
    if (password.toLowerCase() === trimmedName.toLowerCase()) {
      toast.error("Password cannot be the same as your username");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:5000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          username: trimmedName, 
          password, 
          email 
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setIsRegistered(true);
        localStorage.setItem("isRegistered", "true");
        toast.success("Registration successful!");
      } else {
        toast.error(result.message || "Registration failed");
      }
    } catch (error) {
      toast.error("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // UI Components
  const renderRegistrationForm = () => (
    <>
      <h2 className="text-lg font-medium mb-6 text-center">Create Your Account</h2>
      <input
        type="text"
        placeholder="Enter Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none mb-3 text-white placeholder-gray-400"
        disabled={loading}
      />
      <input
        type="password"
        placeholder="Enter Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none mb-3 text-white placeholder-gray-400"
        disabled={loading}
      />
      <input
        type="password"
        placeholder="Confirm Password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none mb-3 text-white placeholder-gray-400"
        disabled={loading}
      />
      <button
        onClick={handleSubmit}
        disabled={loading}
        className={`w-full p-3 rounded-lg shadow-lg font-semibold text-lg transition-all ${
          loading
            ? "bg-gray-500 cursor-not-allowed"
            : "bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-cyan-400 hover:to-blue-500 text-white"
        }`}
      >
        {loading ? "Registering..." : "Register"}
      </button>
    </>
  );

  // Add loading spinner while checking email
  if (isCheckingEmail) {
    return (
      <div className="min-h-screen bg-gradient-to-r from-gray-900 via-black to-gray-900 
        flex flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="h-24 w-24 rounded-full border-t-4 border-b-4 border-cyan-400 animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-16 w-16 rounded-full bg-gray-900"></div>
          </div>
        </div>
        <p className="text-cyan-400 text-lg font-medium animate-pulse">
          Verifying Email...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-gray-900 via-black to-gray-900 p-6">
      <div className="bg-gray-800 text-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-extrabold mb-4 text-center">
          WELCOME TO INNOVATIVE HIRING
        </h1>
        {isRegistered ? (
          <div className="text-center">
            <button
              onClick={handleBackToLogin}
              className="bg-gradient-to-r from-blue-500 to-cyan-400 hover:from-cyan-400 hover:to-blue-500 text-white px-6 py-2 rounded-lg shadow-lg font-semibold transition-all"
            >
              Back to Login
            </button>
          </div>
        ) : (
          renderRegistrationForm()
        )}
      </div>
      <Toaster/>
    </div>
  );
}

export default Register;