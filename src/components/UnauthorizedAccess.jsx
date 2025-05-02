import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, AlertCircle } from 'lucide-react';

const UnauthorizedAccess = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        <div className="mb-8">
          <div className="flex justify-center mb-6">
            <AlertCircle className="w-24 h-24 text-red-500 animate-bounce" />
          </div>
          <h1 className="text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-pink-500 mb-4">
            401
          </h1>
          <div className="relative">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-600 to-transparent absolute top-1/2 left-0" />
            <p className="text-2xl text-gray-300 relative bg-gradient-to-b from-gray-800 to-gray-900 inline-block px-4">
              Unauthorized Access
            </p>
          </div>
        </div>
        
        <p className="text-gray-400 mb-8 max-w-md mx-auto">
          Oops! It seems you're trying to access a restricted area. 
          Please log in with appropriate credentials to access this page.
        </p>

        <button
          onClick={() => navigate('/login')}
          className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 
            text-white rounded-xl hover:from-blue-500 hover:to-cyan-500 transition-all duration-200 
            shadow-lg hover:shadow-xl group"
        >
          <LogIn className="w-5 h-5 mr-2 transform group-hover:-translate-y-1 transition-transform" />
          <span>Login to Continue</span>
        </button>
      </div>
    </div>
  );
};

export default UnauthorizedAccess;