import React, { useState } from "react";
import { ArrowLeft, Mail, Lock, KeyRound, Send, Check } from "lucide-react";
import toast, { Toaster } from 'react-hot-toast';

const ForgotPassword = ({ onBack }) => {
  // State management
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  // Form handlers
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch('http://127.0.0.1:5000/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      
      const data = await response.json();
      if (response.ok) {
        toast.success(data.message);
        setOtpSent(true);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error('Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:5000/api/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();
      if (response.ok) {
        setStep(2);
        toast.success('OTP verified successfully!');
      } else {
        toast.error(data.message || 'Invalid OTP');
      }
    } catch (error) {
      toast.error('Server connection failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:5000/api/reset-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email, 
          otp, 
          newPassword 
        }),
      });

      const data = await response.json();
      if (response.ok) {
        toast.success('Password updated successfully!');
        setTimeout(onBack, 2000);
      } else {
        toast.error(data.message || 'Failed to reset password');
      }
    } catch (error) {
      toast.error('Server connection failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Shared styles
  const inputClass = "w-full pl-12 pr-4 py-3 border border-gray-600 bg-gray-700 rounded-xl focus:ring-2 focus:ring-cyan-400 focus:border-transparent text-white";
  const buttonClass = "w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white py-3 rounded-xl flex items-center justify-center gap-2 hover:from-blue-600 hover:to-cyan-600 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed mt-6";

  return (
    <div className="w-full max-w-md bg-gray-800 rounded-3xl shadow-2xl overflow-hidden">
      <Toaster/>
      
      <div className="p-8 bg-gradient-to-r from-cyan-500 to-blue-500 text-center">
        <h2 className="text-3xl font-bold text-white">Password Recovery</h2>
        <p className="text-gray-200 mt-2">Reset your password</p>
      </div>

      <div className="p-8 space-y-6">
        <button 
          onClick={onBack}
          className="flex items-center text-cyan-400 hover:text-cyan-300"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Login
        </button>

        {step === 1 ? (
          <form onSubmit={otpSent ? handleVerifyOTP : handleSendOTP}>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="Enter your registered email"
                required
                disabled={isLoading || otpSent}
              />
            </div>

            {otpSent && (
              <div className="relative mt-4">
                <KeyRound className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className={inputClass}
                  placeholder="Enter OTP received in email"
                  required
                  disabled={isLoading}
                />
              </div>
            )}

            <button type="submit" disabled={isLoading} className={buttonClass}>
              {!otpSent ? (
                <>
                  <span>{isLoading ? "Sending OTP..." : "Send OTP"}</span>
                  <Send className="h-5 w-5" />
                </>
              ) : (
                <>
                  <span>{isLoading ? "Verifying..." : "Verify OTP"}</span>
                  <Check className="h-5 w-5" />
                </>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
                placeholder="New Password"
                required
                disabled={isLoading}
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={inputClass}
                placeholder="Confirm New Password"
                required
                disabled={isLoading}
              />
            </div>

            <button type="submit" disabled={isLoading} className={buttonClass}>
              <span>{isLoading ? "Updating..." : "Update Password"}</span>
              <Check className="h-5 w-5" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;