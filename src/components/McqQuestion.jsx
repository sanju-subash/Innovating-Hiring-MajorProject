import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import toast from 'react-hot-toast';
import axios from 'axios';
import PropTypes from 'prop-types';

// Update the MCQPanelInterface props to include question_level
const MCQPanelInterface = ({ questions, prompt, taskId, question_level }) => {
  const navigate = useNavigate(); 
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [fileName, setFileName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Add validation for taskId prop
  useEffect(() => {
    if (!taskId) {
      toast.error("Task ID is missing");
      console.error("Task ID is required but not provided");
    }
  }, [taskId]);

  // Add validation for question_level prop
  useEffect(() => {
    if (!question_level) {
      toast.error("Question level is missing");
      console.error("Question level is required but not provided");
    }
  }, [question_level]);

  useEffect(() => {
    // Load selected questions from localStorage
    const savedQuestions = JSON.parse(localStorage.getItem("selectedQuestions")) || [];
    setSelectedQuestions(savedQuestions);
  }, []);

  const handleSelectQuestion = (question) => {
    if (!selectedQuestions.some(q => q.question === question.question)) {
      const updatedSelections = [...selectedQuestions, question];
      setSelectedQuestions(updatedSelections);
      localStorage.setItem("selectedQuestions", JSON.stringify(updatedSelections));
    }
  };

  const handleRemoveQuestion = (index) => {
    const updatedSelections = selectedQuestions.filter((_, i) => i !== index);
    setSelectedQuestions(updatedSelections);
    localStorage.setItem("selectedQuestions", JSON.stringify(updatedSelections));
    toast.success('Question removed from selection');
  };

  const handleSaveToDatabase = async () => {
    if (!fileName.trim()) {
        toast.error("Please enter a file name");
        return;
    }

    setIsSaving(true);

    try {
        const username = localStorage.getItem('username');
        if (!username) {
            toast.error("User information not found");
            return;
        }

        const formattedQuestions = selectedQuestions.map(q => ({
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation,
            type: 'mcq'
        }));

        const requestData = {
            question_title: fileName.trim(),
            questions: formattedQuestions,
            exam_type: 'MCQ',
            created_by: username,
            job_id: taskId,
            check_user: true  // Add this flag to enable user-specific validation
        };

        const response = await axios.post(
            'http://localhost:5000/api/panel/save-questions',
            requestData,
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("authToken")}`
                }
            }
        );

        if (response.data.status === "success") {
            toast.success("Questions saved successfully!");
            setFileName('');
            setSelectedQuestions([]);
            localStorage.removeItem('selectedQuestions');
            setShowSaveDialog(false);
            // Add navigation after successful save
            navigate('/panel', { state: { activeTab: 'tasks' } });
        }
    } catch (error) {
        console.error("Error saving questions:", error);
        // Check for 409 Conflict status
        if (error.response?.status === 409) {
            toast.error("Questions already exist for this job");
        } else {
            toast.error(error.response?.data?.message || "Failed to save questions");
        }
    } finally {
        setIsSaving(false);
    }
};

  const handleSave = async () => {
    try {
      const username = localStorage.getItem("username"); // Get username from localStorage
      
      const response = await axios.post(
        "http://localhost:5000/api/save-selected-questions",
        {
          file_name: `MCQ_${prompt.substring(0, 30)}...`,
          questions: questions,
          created_by: username // Add this line
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("authToken")}`
          }
        }
      );

      if (response.data.status === "success") {
        toast.success("Questions saved successfully!");
      } else {
        throw new Error(response.data.message || "Failed to save questions");
      }
    } catch (error) {
      console.error("Error saving questions:", error);
      toast.error(error.response?.data?.message || "Failed to save questions");
    }
  };

  const handleCompleteSelection = () => {
    if (selectedQuestions.length === 0) {
      toast.error('Please select at least one question');
      return;
    }
    setShowSaveDialog(true);
  };

  if (!questions || questions.length === 0) {
    return <div>No questions available</div>;
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto flex gap-6">
        {/* Left Panel - Questions */}
        <div className="w-2/3 space-y-6">
          {/* Question Header */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Question {currentQuestionIndex + 1} of {questions.length}
              </h2>
              <span className="px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-sm font-medium">
                MCQ Question Bank
              </span>
            </div>
            
            {/* Question Content */}
            <div className="mb-6">
              <p className="text-lg text-gray-700 font-medium leading-relaxed">
                {currentQuestion.question}
              </p>
            </div>
            
            {/* Options */}
            <div className="space-y-3 mb-8">
              {currentQuestion.options.map((option, idx) => (
                <div 
                  key={idx}
                  className={`p-4 border-2 rounded-lg transition-all duration-200 ${
                    idx === currentQuestion.correctAnswer 
                      ? 'border-green-500 bg-green-50 shadow-green-100' 
                      : 'border-gray-200 hover:border-blue-200 hover:bg-blue-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium ${
                      idx === currentQuestion.correctAnswer
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className={`${
                      idx === currentQuestion.correctAnswer ? 'text-green-700' : 'text-gray-700'
                    }`}>
                      {option}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Explanation Box */}
            <div className="bg-blue-50 rounded-xl p-5 mb-8 border border-blue-100">
              <h3 className="flex items-center gap-2 text-blue-800 font-semibold mb-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Explanation
              </h3>
              <p className="text-blue-900">{currentQuestion.explanation}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <button
                onClick={() => setCurrentQuestionIndex(i => Math.max(0, i - 1))}
                disabled={currentQuestionIndex === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-all duration-200"
              >
                ← Previous
              </button>

              <button
                onClick={() => handleSelectQuestion(currentQuestion)}
                disabled={selectedQuestions.some(q => q.question === currentQuestion.question)}
                className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                  selectedQuestions.some(q => q.question === currentQuestion.question)
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white shadow-lg shadow-green-200 hover:shadow-green-300'
                }`}
              >
                {selectedQuestions.some(q => q.question === currentQuestion.question)
                  ? '✓ Selected'
                  : '+ Select Question'
                }
              </button>

              <button
                onClick={() => setCurrentQuestionIndex(i => Math.min(questions.length - 1, i + 1))}
                disabled={currentQuestionIndex === questions.length - 1}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all duration-200"
              >
                Next →
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Selected Questions */}
        <div className="w-1/3 h-fit sticky top-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">Selected Questions</h2>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                {selectedQuestions.length} selected
              </span>
            </div>

            {selectedQuestions.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-gray-500">No questions selected yet</p>
                <p className="text-sm text-gray-400 mt-1">Select questions from the left panel</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[calc(100vh-20rem)] overflow-y-auto pr-2">
                {selectedQuestions.map((q, idx) => (
                  <div key={idx} 
                       className="group p-4 rounded-lg border border-gray-200 hover:border-red-200 bg-white transition-all duration-200">
                    <div className="flex justify-between items-start gap-4">
                      <span className="w-6 h-6 flex-shrink-0 rounded-full bg-blue-100 text-blue-600 text-sm font-medium flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <p className="flex-1 text-sm text-gray-600">{q.question}</p>
                      <button
                        onClick={() => handleRemoveQuestion(idx)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-red-50 rounded"
                      >
                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedQuestions.length > 0 && (
              <button
                onClick={handleCompleteSelection}
                className="mt-6 w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg font-medium shadow-lg shadow-blue-200 hover:shadow-blue-300 transition-all duration-200"
              >
                Save Selected Questions
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Save Dialog Modal */}
      {showSaveDialog && createPortal(
        <div className="fixed inset-0 z-[9000] isolate">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-96 p-6 relative z-10">
              <h3 className="text-xl font-bold mb-4">Save Questions</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  File Name
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="Enter a name for this question set"
                  disabled={isSaving}
                />
              </div>
              <div className="text-sm text-gray-600 mb-4">
                {selectedQuestions.length} questions will be saved to the database.
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveToDatabase}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save to Database'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

// Update PropTypes
MCQPanelInterface.propTypes = {
  questions: PropTypes.array.isRequired,
  prompt: PropTypes.string.isRequired,
  taskId: PropTypes.number.isRequired,
  question_level: PropTypes.string.isRequired
};

export default MCQPanelInterface;