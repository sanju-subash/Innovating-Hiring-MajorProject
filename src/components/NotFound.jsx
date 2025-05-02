import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';

export const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center">
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-blue-600 mb-4">404</h1>
          <div className="relative">
            <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-400 to-transparent absolute top-1/2 left-0" />
            <p className="text-xl text-gray-600 relative bg-gradient-to-b from-gray-50 to-gray-100 inline-block px-4">
              Page Not Found
            </p>
          </div>
        </div>
        
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          Oops! It seems like you've ventured into uncharted territory. 
          The page you're looking for doesn't exist or might have been moved.
        </p>

        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors group"
        >
          <Home className="w-5 h-5 mr-2 transform group-hover:-translate-y-1 transition-transform" />
          <span>Back to Home</span>
        </button>
      </div>
    </div>
  );
};