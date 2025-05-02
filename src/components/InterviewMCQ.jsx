import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from "react-router-dom";
import { Clock, PhoneOff } from 'lucide-react';

import toast, { Toaster } from 'react-hot-toast';

export const InterviewMCQ = () => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [countdownTime, setCountdownTime] = useState(null); // Change to null initially
  const [submissionStatus, setSubmissionStatus] = useState(null);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false); // Add new state for controlling flow
  const [mcqQuestions, setMcqQuestions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); // Add new state near the top with other state declarations
  const [isCompleting, setIsCompleting] = useState(false);
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [isTestSubmitted, setIsTestSubmitted] = useState(false); // Add a new state to track submission

  const Candidate_ID = 22;

  const navigate = useNavigate();
  const location = useLocation();
  const candidateId = location.state?.candidateId;
  const postId = location.state?.postId;

  // Redirect if no state is present
  useEffect(() => {
    if (!candidateId || !postId) {
      navigate('/');
    }
  }, [candidateId, postId]);

  const toast_during_save = 'save-warning';

  useEffect(() => {
    const fetchTestTime = async () => {
      try {
        const response = await fetch(`http://localhost:5005/api/test-time/${postId}`);
        const data = await response.json();
        
        if (response.ok) {
          // Convert minutes to seconds for countdown
          setCountdownTime(data.time * 60);
        } else {
          toast.error('Failed to fetch test time');
        }
      } catch (error) {
        console.error('Error fetching test time:', error);
        toast.error('Failed to load test time');
      }
    };

    if (postId) {
      fetchTestTime();
    }
  }, [postId]);

  useEffect(() => {
    // Don't run timer if time is not set, modals are shown, or test is submitted
    if (!countdownTime || showSuccessModal || showFeedbackModal || isTestSubmitted) return;

    const timer = setInterval(() => {
      setCountdownTime((prevTime) => {
        // Calculate warning points based on current time
        if (prevTime === countdownTime/2) { // Half time
          toast.warning(`${Math.floor(countdownTime/120)} minutes remaining!`, {
            toastId: 'half-time-warning'
          });
        } else if (prevTime === countdownTime/4) { // Quarter time
          toast.warning(`${Math.floor(countdownTime/240)} minutes remaining!`, {
            toastId: 'quarter-time-warning'
          });
        } else if (prevTime === 10) { // Last 10 seconds
          toast.warning("Only 10 seconds remaining!", {
            toastId: 'ten-sec-warning'
          });
        }

        if (prevTime <= 1) {
          clearInterval(timer);
          toast.info("Time's up! Submitting your answers...", {
            toastId: 'time-up'
          });
          saveMCQResponses(answers);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [answers, showSuccessModal, showFeedbackModal, countdownTime, isTestSubmitted]);

  useEffect(() => {
    const currentAnswer = answers.find(
      answer => answer.question === mcqQuestions[currentQuestionIndex].question
    );
    setSelectedOption(currentAnswer ? currentAnswer.selectedAnswer : null);
  }, [currentQuestionIndex, answers]);

  useEffect(() => {
    const fetchMCQQuestions = async () => {
      try {
        setIsLoading(true);

        // First get candidate's level
        const levelResponse = await fetch(`http://localhost:5005/api/candidate-level/${candidateId}`);
        if (!levelResponse.ok) {
          throw new Error(`Failed to fetch candidate level: ${levelResponse.statusText}`);
        }
        const { level } = await levelResponse.json();

        // Then fetch MCQ questions based on level and post
        const questionsResponse = await fetch(`http://localhost:5005/api/mcq-questions/${postId}/${level}`);
        if (!questionsResponse.ok) {
          throw new Error(`Failed to fetch MCQ questions: ${questionsResponse.statusText}`);
        }
        const data = await questionsResponse.json();
        
        if (!data.questions || data.questions.length === 0) {
          toast.error('No questions available for this level');
          setMcqQuestions([]);
        } else {
          setMcqQuestions(data.questions);
        }
      } catch (error) {
        console.error('Error fetching MCQ questions:', error);
        toast.error(error.message);
        setMcqQuestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    if (candidateId && postId) {
      fetchMCQQuestions();
    }
  }, [candidateId, postId]);

  // Add this effect near the top with other useEffects
  useEffect(() => {
    const checkTestStatus = async () => {
      try {
        const response = await fetch(`http://localhost:5005/check-test-status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidateId,
            postId
          })
        });

        const data = await response.json();
        
        if (response.ok && data.isCompleted) {
          navigate('/thank-you', { 
            state: { 
              candidateId,
              postId,
              preventReturn: true 
            },
            replace: true // This replaces the current entry in history
          });
        }
      } catch (error) {
        console.error('Error checking test status:', error);
      }
    };

    if (candidateId && postId) {
      checkTestStatus();
    }
  }, [candidateId, postId, navigate]);

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const handleOptionSelect = (option) => {
    setSelectedOption(option);
  };

  const handleNextQuestion = async () => {
    if (selectedOption !== null) {
      const updatedAnswers = answers.filter(
        answer => answer.question !== mcqQuestions[currentQuestionIndex].question
      );
      const newAnswers = [
        ...updatedAnswers,
        { question: mcqQuestions[currentQuestionIndex].question, selectedAnswer: selectedOption }
      ];
      setAnswers(newAnswers);
      setSelectedOption(null);
      
      if (currentQuestionIndex < mcqQuestions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1);
      } else {
        setIsSubmitting(true); // Start loading
        setIsTestSubmitted(true); // Stop the timer
        try {
          await saveMCQResponses(newAnswers);
        } finally {
          setIsSubmitting(false); // Stop loading regardless of outcome
        }
      }
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleLeave = async () => {
    setIsTestSubmitted(true); // Stop the timer
    try {
      await saveMCQResponses(answers);
      navigate("/"); // Navigate to root path after saving
    } catch (error) {
      console.error("Error saving responses:", error);
      toast.error("Failed to save responses");
      // Still navigate even if there's an error
      navigate("/");
    }
  };

  const saveMCQResponses = async (responses) => {
    try {
      const mcqData = {
        candidateName: null, // We'll get this from the database
        candidateId: parseInt(candidateId, 10), // Use candidateId from location state
        postId: parseInt(postId, 10), // Use postId from location state
        mcqResponses: responses.map(response => ({
          question: response.question,
          selectedAnswer: response.selectedAnswer,
          correctAnswer: mcqQuestions.find(q => q.question === response.question)?.correctAnswer
        }))
      };
  
      const mcqResponse = await fetch("http://localhost:5005/save-mcq", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mcqData)
      });
  
      if (!mcqResponse.ok) {
        const errorData = await mcqResponse.json();
        throw new Error(errorData.error || 'Failed to save MCQ responses');
      }
  
      const mcqResult = await mcqResponse.json();
      setSubmissionStatus(mcqResult);
      setShowSuccessModal(true);
      return mcqResult;
  
    } catch (error) {
      console.error("Error saving MCQ responses:", error);
      toast.error("Failed to save responses");
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading questions...</p>
        </div>
      </div>
    );
  }

  if (!mcqQuestions || mcqQuestions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center text-gray-600">
          No questions available
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gray-100">
      {/* Timer Display */}
      <div className="absolute top-4 right-4 z-10">
        <div className="bg-white shadow-md rounded-lg px-4 py-2 flex items-center space-x-2">
          <Clock className="w-5 h-5 text-red-500" />
          <span className="text-lg font-semibold text-red-600">
            {formatTime(countdownTime)}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center min-h-screen p-6">
        <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-2xl">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-2">Question {currentQuestionIndex + 1} of {mcqQuestions.length}</h2>
            <div className="h-2 bg-gray-200 rounded-full">
              <div 
                className="h-2 bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / mcqQuestions.length) * 100}%` }}
              />
            </div>
          </div>
          
          <h3 className="text-xl text-gray-700 mb-6">{mcqQuestions[currentQuestionIndex].question}</h3>
          
          <div className="space-y-4">
            {mcqQuestions[currentQuestionIndex].options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleOptionSelect(option)}
                className={`w-full p-4 rounded-lg border-2 transition-all duration-200 ${
                  selectedOption === option 
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50'
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <div className="flex justify-between mt-8">
            <button
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
              className={`px-6 py-2 rounded-lg transition-all duration-200 ${
                currentQuestionIndex === 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-500 text-white hover:bg-gray-600'
              }`}
            >
              Previous
            </button>
            <button
              onClick={handleNextQuestion}
              disabled={selectedOption === null || isSubmitting}
              className={`px-6 py-2 rounded-lg transition-all duration-200 ${
                selectedOption === null
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              {currentQuestionIndex < mcqQuestions.length - 1 ? (
                'Next'
              ) : isSubmitting ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Submitting...</span>
                </div>
              ) : (
                'Finish'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Leave Button */}
      <div className="fixed bottom-6 right-6">
        <button
          onClick={() => setShowConfirmDialog(true)}
          className="p-3 bg-red-500 rounded-full hover:bg-red-600 transition-colors duration-200"
        >
          <PhoneOff className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Leave Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h2 className="text-xl font-semibold mb-4">Leave Test?</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to end the test? Your progress will be saved.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition-colors duration-200"
              >
                Stay
              </button>
              <button
                onClick={handleLeave}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors duration-200"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Show Completion Status */}
      {submissionStatus && showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 backdrop-blur-md bg-black/30" />
          <div className="relative bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="absolute -top-4 -left-4 w-24 h-24 bg-blue-500/10 rounded-full blur-xl" />
            <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-purple-500/10 rounded-full blur-xl" />
            
            <div className="relative">
              <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">
                Test Submitted Successfully!
              </h2>
              
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 rounded-full flex items-center justify-center bg-green-100 text-green-500">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
              
              <p className="text-center text-gray-600 mb-8">
                Your test responses have been successfully submitted.
              </p>

              <div className="flex justify-center gap-3">
                <button
                  onClick={async () => {
                    setIsCompleting(true);
                    try {
                      await saveMCQResponses(answers);
                      navigate("/thank-you", { 
                        state: { 
                          candidateId,
                          postId 
                        }
                      });
                    } catch (error) {
                      toast.error("Error saving data");
                    } finally {
                      setIsCompleting(false);
                    }
                  }}
                  disabled={isCompleting}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg shadow-blue-500/30 disabled:opacity-50"
                >
                  {isCompleting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Completing...</span>
                    </div>
                  ) : (
                    'Complete Test'
                  )}
                </button>
                <button
                  onClick={async () => {
                    setIsSubmittingFeedback(true);
                    try {
                      await saveMCQResponses(answers);
                      setShowSuccessModal(false);
                      setShowFeedbackModal(true);
                    } catch (error) {
                      toast.error("Error saving data");
                    } finally {
                      setIsSubmittingFeedback(false);
                    }
                  }}
                  disabled={isSubmittingFeedback}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg shadow-blue-500/30 disabled:opacity-50"
                >
                  {isSubmittingFeedback ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Processing...</span>
                    </div>
                  ) : (
                    'Provide Feedback'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showFeedbackModal && (
        <FeedbackModal
          onSubmit={async (feedback) => {
            try {
              const response = await fetch("http://localhost:5005/save-mcq-feedback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  interviewId: submissionStatus.interviewId,
                  feedback
                }),
              });
      
              if (!response.ok) {
                throw new Error("Failed to save feedback");
              }
      
              const result = await response.json();
              toast.success("Feedback submitted successfully");
              setShowFeedbackModal(false);
              // Update this part to match the Complete Test button behavior
              navigate("/thank-you", { 
                state: { 
                  candidateId,
                  postId 
                }
              });
            } catch (error) {
              toast.error("Error saving feedback");
              console.error(error);
            }
          }}
        />
      )}
      <Toaster/>
    </div>
  );
};

const FeedbackModal = ({ onSubmit }) => {
  const [feedback, setFeedback] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(feedback);
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <h2 className="text-2xl font-bold mb-2 text-gray-800">Test Feedback</h2>
        <p className="text-gray-600 mb-4">
          Please share your feedback about the test experience:
        </p>
        <form onSubmit={handleSubmit}>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            className="w-full h-32 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-6"
            placeholder="Your feedback here..."
            required
          />
          <button
            type="submit"
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-all duration-200"
          >
            Submit Feedback
          </button>
        </form>
      </div>
    </div>
  );
};