import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import axios from 'axios';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';

const Spinner = () => (
  <div className="w-5 h-5 inline-block">
    <svg className="animate-spin h-full w-full text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  </div>
);

const InterviewPanelInterface = ({ questions, prompt, taskId, question_level }) => {

  const [isSaving, setIsSaving] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fileName, setFileName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [fileNameError, setFileNameError] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    const saved = localStorage.getItem('selectedInterviewQuestions');
    if (saved) {
      try {
        setSelectedQuestions(JSON.parse(saved));
      } catch (err) {
        console.error('Error parsing saved questions:', err);
        localStorage.removeItem('selectedInterviewQuestions');
      }
    }
  }, []);

  // Add validation for question_level prop
  useEffect(() => {
    if (!question_level) {
      toast.error("Question level is missing");
      console.error("Question level is required but not provided");
    }
  }, [question_level]);

  const handleSelect = (question) => {
    if (!selectedQuestions.find((q) => q.id === question.id)) {
      const updated = [...selectedQuestions, question];
      setSelectedQuestions(updated);
      localStorage.setItem('selectedInterviewQuestions', JSON.stringify(updated));
      toast.success('Question added to selection');
    } else {
      toast.error('This question is already in your selection');
    }
  };

  const handleRemove = (questionId) => {
    const updated = selectedQuestions.filter((q) => q.id !== questionId);
    setSelectedQuestions(updated);
    localStorage.setItem('selectedInterviewQuestions', JSON.stringify(updated));
    toast.success('Question removed from selection');
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(prev + 1, questions.length - 1));
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
  };

  const openSaveModal = () => {
    if (selectedQuestions.length === 0) {
      toast.error("No questions selected to save");
      return;
    }
    setIsModalOpen(true);
  };

  const handleSaveToDatabase = async () => {
    if (!fileName.trim()) {
      toast.error("Please enter a file name");
      return;
    }

    setIsSaving(true);
    setIsLoading(true);

    try {
      const username = localStorage.getItem('username');
      if (!username) {
        toast.error("User information not found");
        return;
      }

      const formattedQuestions = selectedQuestions.map(q => ({
        question: q.question,
        expected_answer: q.answer || q.expectedAnswer,
        type: 'interview'
      }));

      const requestData = {
        question_title: fileName.trim(),
        questions: formattedQuestions,
        exam_type: 'Interview',
        created_by: username,
        job_id: taskId,
        question_level: question_level, // Add question level
        check_user: true
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
        localStorage.removeItem('selectedInterviewQuestions');
        setIsModalOpen(false);
        navigate('/panel', { state: { activeTab: 'tasks' } });
      }
    } catch (error) {
      console.error("Error saving questions:", error);
      if (error.response?.status === 409) {
        toast.error("You have already created questions for this job"); // Updated error message
      } else {
        toast.error(error.response?.data?.message || "Failed to save questions");
      }
    } finally {
      setIsSaving(false);
      setIsLoading(false);
    }
  };

  // Custom components for ReactMarkdown
  const components = {
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      const content = Array.isArray(children) ? children.join('') : children;
      
      return !inline && match ? (
        <SyntaxHighlighter
          style={vscDarkPlus}
          language={match[1]}
          PreTag="div"
          {...props}
        >
          {content}
        </SyntaxHighlighter>
      ) : (
        <code className={className} {...props}>
          {content}
        </code>
      );
    }
  };

  if (!questions || questions.length === 0) {
    return <div className="p-6 text-center text-gray-500">No questions available</div>;
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto flex gap-6">
        {/* Left Panel - Current Question */}
        <div className="w-2/3 space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Question {currentIndex + 1} of {questions.length}
              </h2>
              <span className="px-4 py-2 bg-purple-50 text-purple-600 rounded-full text-sm font-medium">
                Interview Question Bank
              </span>
            </div>

            {/* Question Content */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">{currentQuestion.question}</h3>
              
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h4 className="text-md font-medium text-gray-700 mb-3">Expected Answer:</h4>
                <div className="prose prose-slate max-w-none">
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={components}
                    children={currentQuestion.answer || currentQuestion.expectedAnswer || 'No answer provided'}
                  />
                </div>
              </div>
            </div>

            {/* Navigation and Action Buttons */}
            <div className="flex items-center justify-between mt-6">
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-all duration-200"
              >
                ← Previous
              </button>

              <button
                onClick={() => handleSelect(currentQuestion)}
                disabled={selectedQuestions.some(q => q.id === currentQuestion.id)}
                className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 ${
                  selectedQuestions.some(q => q.id === currentQuestion.id)
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-lg shadow-purple-200 hover:shadow-purple-300'
                }`}
              >
                {selectedQuestions.some(q => q.id === currentQuestion.id)
                  ? '✓ Selected'
                  : '+ Select Question'
                }
              </button>

              <button
                onClick={handleNext}
                disabled={currentIndex === questions.length - 1}
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-all duration-200"
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
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
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
                {selectedQuestions.map((q, index) => (
                  <div key={q.id} 
                    className="group p-4 rounded-lg border border-gray-200 hover:border-red-200 bg-white transition-all duration-200">
                    <div className="flex justify-between items-start gap-4">
                      <span className="w-6 h-6 flex-shrink-0 rounded-full bg-purple-100 text-purple-600 text-sm font-medium flex items-center justify-center">
                        {index + 1}
                      </span>
                      <p className="flex-1 text-sm text-gray-600">{q.question}</p>
                      <button
                        onClick={() => handleRemove(q.id)}
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
                onClick={openSaveModal}
                className="mt-6 w-full px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg font-medium shadow-lg shadow-purple-200 hover:shadow-purple-300 transition-all duration-200"
              >
                Save Selected Questions
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Save Modal - Keep existing modal code but update styling */}
      {isModalOpen && createPortal(
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
                  onChange={(e) => {
                    setFileName(e.target.value);
                    if (e.target.value.trim()) setFileNameError('');
                  }}
                  placeholder="Enter a name for this question set"
                  disabled={isLoading}
                />
                {fileNameError && (
                  <p className="text-sm text-red-500 mt-1">{fileNameError}</p>
                )}
              </div>
              <div className="text-sm text-gray-600 mb-4">
                {selectedQuestions.length} questions will be saved to the database.
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setIsModalOpen(false);
                    setFileName('');
                    setFileNameError('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveToDatabase}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2 min-w-[140px]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Spinner />
                      <span>Saving...</span>
                    </>
                  ) : (
                    'Save to Database'
                  )}
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
InterviewPanelInterface.propTypes = {
  questions: PropTypes.array.isRequired,
  prompt: PropTypes.string.isRequired,
  taskId: PropTypes.number.isRequired,
  question_level: PropTypes.string.isRequired
};

export default InterviewPanelInterface;