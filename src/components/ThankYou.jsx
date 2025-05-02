import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { CheckCircle2, Home } from 'lucide-react';

export const ThankYou = () => {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Prevent going back
    window.history.pushState(null, '', window.location.href);
    const handlePopState = (event) => {
      window.history.pushState(null, '', window.location.href);
      event.preventDefault();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const handleHomeClick = () => {
    // Navigate to home and replace history to prevent going back
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-lg w-full mx-auto text-center">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-12 h-12 text-blue-600" />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-800 mb-4">
          Thank You for Completing the Test!
        </h1>
        
        <p className="text-gray-600 leading-relaxed mb-8">
          Your responses have been successfully recorded. We appreciate your time and effort in taking this assessment.
        </p>

        <button
          onClick={handleHomeClick}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 flex items-center justify-center gap-2 mx-auto"
        >
          <Home className="w-5 h-5" />
          Return Home
        </button>
      </div>
    </div>
  );
};