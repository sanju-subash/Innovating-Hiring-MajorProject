import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AtSign, Lock, ArrowRight, Loader, Home } from "lucide-react";
import toast, { Toaster } from 'react-hot-toast';
import ForgotPassword from "./ForgotPassword";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem("isAuthenticated")) {
      window.history.pushState(null, "", window.location.href); 
      window.onpopstate = () => {
        window.history.pushState(null, "", window.location.href);
      };
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          username: username.trim(), // Trim spaces from username
          password 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store authentication status and user info
        localStorage.setItem("isAuthenticated", "true");
        localStorage.setItem("userId", data.user.user_id);
        localStorage.setItem("username", data.user.username);
        localStorage.setItem("email", data.user.email);
        localStorage.setItem("userRole", data.user.role);
        localStorage.setItem("panelMemberId", data.user.user_id);
        toast.success('Login successful!', { 
          duration: 3000, 
          position: 'top-center' 
        });
        
        // Redirect based on user role
        setTimeout(() => {
          switch (data.user.role.toLowerCase()) {
            case "hr":
              navigate("/hrpost");
              break;
            case "admin":
              navigate("/admindashboard");
              break;
            case "panel":
              navigate("/panel");
              break;
            default:
              toast.error('Invalid user role');
              break;
          }
        }, 1000);

      } else {
        toast.error(data.message || 'Invalid username or password', { 
          duration: 4000, 
          position: 'top-center' 
        });
      }
    } catch (error) {
      toast.error('Unable to connect to the server', { 
        duration: 4000, 
        position: 'top-center' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-6">
        <ForgotPassword onBack={() => setShowForgotPassword(false)} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white p-6 relative">
      <button
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 text-gray-400 hover:text-whi te flex items-center gap-2 transition-colors"
      >
        <Home size={20} />
        <span className="text-sm font-medium">Home</span>
      </button>

      <Toaster />
      <div className="w-full max-w-md bg-gray-800 rounded-3xl shadow-2xl overflow-hidden transform transition-all hover:scale-105 neon-border">
        <div className="p-8 bg-gradient-to-r from-cyan-500 to-blue-500 text-center">
          <h2 className="text-3xl font-bold text-white">Welcome Back</h2>
          <p className="text-gray-200 mt-2">Sign in to continue</p>
        </div>

        <div className="p-8 space-y-6">
          <form onSubmit={handleLogin}>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center">
                <AtSign className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-600 bg-gray-700 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-white"
                placeholder="Email or Username"
                required
                disabled={isLoading}
              />
            </div>

            <div className="relative mt-4">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3 border border-gray-600 bg-gray-700 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-white"
                placeholder="Password"
                required
                disabled={isLoading}
              />
            </div>

            <div className="flex justify-end mt-2">
              <button 
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm font-medium text-cyan-400 hover:text-cyan-300 mt-2"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-3 rounded-xl flex items-center justify-center gap-2 hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed mt-6"
            >
              {isLoading ? (
                <>
                  <Loader className="h-5 w-5 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="h-5 w-5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;