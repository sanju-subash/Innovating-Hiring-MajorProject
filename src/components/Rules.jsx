import React, { useState, useEffect } from 'react';
import { Mic, CheckCircle, X } from 'lucide-react';
import rulesData from '../assets/Rules.json';
import { useNavigate, useParams } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import axios from "axios";

// Loading spinner component
const LoadingSpinner = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-100 to-gray-200">
    <div className="relative w-20 h-20">
      <div className="absolute top-0 left-0 right-0 bottom-0">
        <div className="border-4 border-blue-200 border-t-blue-600 rounded-full w-20 h-20 animate-spin"></div>
      </div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
      </div>
    </div>
    <p className="mt-4 text-gray-600 font-medium">Loading test details...</p>
  </div>
);

// Add this new component at the top of the file after imports
const ExamNotFound = ({ onGoHome }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-100 to-gray-200 p-4">
    <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Exam Not Found</h2>
      <p className="text-gray-600 mb-6">
        Sorry, we couldn't find the exam you're looking for. It may have been removed or the link might be invalid.
      </p>
      <button
        onClick={onGoHome}
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
      >
        Go Back Home
      </button>
    </div>
  </div>
);

// Add new component for completed exam message
const ExamCompleted = ({ onGoHome }) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-100 to-gray-200 p-4">
    <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
      <div className="mb-4 text-green-500">
        <CheckCircle size={48} className="mx-auto" />
      </div>
      <h2 className="text-2xl font-bold text-gray-800 mb-4">Exam Already Completed</h2>
      <p className="text-gray-600 mb-6">
        You have already completed this exam. You cannot retake it.
      </p>
      <button
        onClick={onGoHome}
        className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
      >
        Go Back Home
      </button>
    </div>
  </div>
);

// Update the Rules component to include error state
export const Rules = () => {
  const { candidateId, postId } = useParams();
  const [heading] = useState(rulesData.heading);
  const [rules] = useState(rulesData.rules);
  const [hasPermission, setHasPermission] = useState(false);
  const [loading, setLoading] = useState(true);
  const [examType, setExamType] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [error, setError] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const checkCompletion = async () => {
      try {
        const response = await axios.get(
          `http://localhost:5000/api/check-completion/${candidateId}/${postId}`
        );
        
        if (response.data.completed) {
          setIsCompleted(true);
          setLoading(false);
          return;
        }
        
        // Only check exam type if not completed
        checkExamType();
      } catch (error) {
        console.error('Error checking completion:', error);
        setError(true);
        setLoading(false);
      }
    };

    checkCompletion();
  }, [candidateId, postId]);

  const checkExamType = async () => {
    try {
      const response = await axios.get(`http://localhost:5005/api/exam-type/${postId}`);
      
      if (response.data && response.data.exam_type) {
        setExamType(response.data.exam_type);
        document.title = `${response.data.exam_type} Test Rules`;
      } else {
        setError(true);
      }
    } catch (error) {
      console.error('Error fetching exam type:', error);
      setError(true);
    } finally { 
      setLoading(false);
    }
  };

  const requestPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setHasPermission(true);
      toast.success('Microphone access granted!');
    } catch (error) {
      toast.error('Microphone permission required for interview');
      setHasPermission(false);
    }
  };

  const handleStartTest = () => {
    if (examType === 'Interview' && !hasPermission) {
      requestPermissions();
      return;
    }
    setShowConfirmDialog(true);
  };

  const startTest = () => {
    setShowConfirmDialog(false);
    
    if (examType === 'MCQ') {
      navigate('/mcq', { 
        state: { 
          candidateId,
          postId
        }
      });
    } else if (examType === 'Interview') {
      // Change to use URL parameters instead of state
      navigate(`/interview/${candidateId}/${postId}`);
    }
  };

  // Add handler for going home
  const handleGoHome = () => {
    navigate('/');
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (isCompleted) {
    return <ExamCompleted onGoHome={handleGoHome} />;
  }

  if (error) {
    return <ExamNotFound onGoHome={handleGoHome} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 py-8 px-4">
      <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-4xl font-bold text-center text-gray-800 mb-8 border-b pb-4">
          {examType} Test Rules
        </h1>

        <div className="space-y-6">
          {rules.map((rule, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <p className="text-lg text-gray-700 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: rule }} />
            </div>
          ))}
        </div>

        <div className="mt-8 space-y-4">
          {/* Show mic permission button only for Interview type */}
          {examType === 'Interview' && !hasPermission && (
            <button
              onClick={requestPermissions}
              className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              <Mic className="w-5 h-5" />
              <span>Grant Mic Access</span>
            </button>
          )}

          <button
            onClick={handleStartTest}
            disabled={examType === 'Interview' && !hasPermission}
            className={`w-full flex items-center justify-center gap-2 ${
              examType === 'Interview' && !hasPermission
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
            } text-white font-semibold py-3 px-6 rounded-lg transition-colors`}
          >
            <span>Start {examType} Test</span>
          </button>
        </div>

        {/* Show permission status only for Interview type */}
        {examType === 'Interview' && hasPermission && (
          <div className="mt-4 flex items-center justify-center gap-2 text-green-600 font-medium">
            <CheckCircle className="w-5 h-5" />
            <span>Microphone access granted - Ready to begin</span>
          </div>
        )}
      </div>

      {/* Add confirmation dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          {/* Overlay */}
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"></div>
          
          {/* Dialog */}
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6 z-50">
              <div className="absolute right-4 top-4">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  className="text-gray-400 hover:text-gray-500 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="mt-3 text-center sm:mt-0 sm:text-left">
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                  Start {examType} Test?
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    Are you ready to begin the {examType} test? Make sure you have reviewed all the rules 
                    {examType === 'Interview' && ' and your microphone is working'}.
                  </p>
                </div>
              </div>

              <div className="mt-5 sm:mt-6 flex gap-3">
                <button
                  onClick={() => setShowConfirmDialog(false)}
                  className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={startTest}
                  className="inline-flex justify-center w-full rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:text-sm"
                >
                  Start Test
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Toaster/>
    </div>
  );
};
