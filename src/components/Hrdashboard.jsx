import React, { useState, useEffect } from "react";
import {
  Menu,
  Briefcase,
  CheckCircle,
  ChevronLeft,
  LogOut,
  Loader,
  Eye,
  X,
  CheckCircle2,
  Bell,
  FileText,
  Clipboard
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import { JobPostingSystem as NewPost } from "./HrPost";
import axios from "axios";
import { createPortal } from "react-dom";
import { HrVerifyScreen } from './hrverifyscreen';

const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center h-[calc(100vh-16rem)]">
    <div className="relative w-20 h-20">
      <div className="absolute top-0 left-0 right-0 bottom-0">
        <div className="border-4 border-blue-200 border-t-blue-600 rounded-full w-20 h-20 animate-spin"></div>
      </div>
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
      </div>
    </div>
    <p className="mt-4 text-gray-600 font-medium">Loading...</p>
  </div>
);

export const HRDashboard = () => {
  const navigate = useNavigate();
  // Add location hook to get the state
  const location = useLocation();
  
  // Update the activeTab state initialization
  const [activeTab, setActiveTab] = useState(
    location.state?.activeTab || "create-job"
  );
  const [isSidebarOpen, setSidebarOpen] = useState(true);

  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [startingTest, setStartingTest] = useState(null);
  // Update the notifying state to store a combination of job and question IDs
  const [notifyingIds, setNotifyingIds] = useState(new Set());

  // First, add a state for the HR name
  const [hrName, setHrName] = useState("");

  // Add these new states after your existing state declarations
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);

  // Add useEffect to get the HR name from localStorage
  useEffect(() => {
    const username = localStorage.getItem("username");
    if (username) {
      setHrName(username);
    }
  }, []);

  const fetchCandidates = async () => {
    setLoading(true);
    try {
      const response = await new Promise((resolve) =>
        setTimeout(() => resolve([]), 2000)
      );
      setCandidates(response);
    } catch (error) {
      toast.error("Error fetching candidates!");
    } finally {
      setLoading(false);
    }
  };

  const fetchHiringQuestions = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/hiring-questions");
      const data = await res.json();

      if (data.status === "success") {
        setQuestions(data.questions);
      } else {
        toast.error("Error fetching questions.");
      }
    } catch (err) {
      toast.error("Unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  // Update the startTest function
  const startTest = async (questionId, candidates) => {
    if (!candidates?.length) {
      toast.error('No candidates have applied for this position');
      return;
    }
    
    setStartingTest(questionId);
    
    try {
      const response = await axios.post(
        'http://localhost:5000/api/hr/start-test',
        {
          questionId: questionId,
          candidates: candidates
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (response.data.status === "success") {
        // Update notifications by removing the started test
        const updatedNotifications = notifications.filter(notification => 
          notification.post_id !== response.data.postId
        );
        setNotifications(updatedNotifications);
        
        // Update notification count
        const todayPostsCount = updatedNotifications.filter(post => post.is_today).length;
        setNotificationCount(todayPostsCount);

        toast.success(response.data.message);
        fetchHiringQuestions(); // Refresh the questions list
      } else {
        throw new Error(response.data.message);
      }
    } catch (error) {
      console.error("Error starting test:", error);
      toast.error(error.response?.data?.message || "Failed to send test invitations");
    } finally {
      setStartingTest(null);
    }
  };

  // Update the notifyCandidates function to use both IDs
  const notifyCandidates = async (jobId, questionId) => {
    const notifyKey = `${jobId}-${questionId}`; // Create unique key for this combination
    setNotifyingIds(prev => new Set([...prev, notifyKey]));
    
    try {
      const response = await axios.post(
        'http://localhost:5000/notify-test-date',
        { jobId },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.data.status === 'success') {
        toast.success('Notification sent successfully!');
      } else {
        throw new Error(response.data.message || 'Failed to notify candidates');
      }
    } catch (error) {
      console.error('Error notifying candidates:', error);
      toast.error(error.response?.data?.message || 'Failed to notify candidates');
    } finally {
      setNotifyingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(notifyKey);
        return newSet;
      });
    }
  };

  const handleViewQuestions = (question) => {
    setSelectedQuestion(question);
    setShowQuestionModal(true);
  };

  useEffect(() => {
    if (activeTab === "verify-candidates") fetchCandidates();
    if (activeTab === "start-hiring") fetchHiringQuestions();
  }, [activeTab]);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  // Update the confirmLogout function
  const confirmLogout = () => {
    // Clear all authentication related items
    localStorage.removeItem("authToken");
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    localStorage.removeItem("email");
    localStorage.removeItem("panelid");
    sessionStorage.clear();
    
    // Navigate to login
    navigate("/login", { replace: true });
  };

  const EmptyTestState = () => (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-16rem)] bg-white rounded-2xl p-8 text-center">
      <div className="bg-blue-50 p-4 rounded-full mb-6">
        <CheckCircle2 className="w-16 h-16 text-blue-500" />
      </div>
      <h3 className="text-2xl font-semibold text-gray-800 mb-3">
        No Test Questions Available
      </h3>
      <p className="text-gray-600 mb-8 max-w-md">
        Start by creating a new job post with test questions. This will help you evaluate candidates effectively.
      </p>
      <button
        onClick={() => setActiveTab("create-job")}
        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl 
    hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg group"
      >
        <Briefcase className="w-5 h-5 group-hover:animate-bounce" />
        Create New Job Post
      </button>
    </div>
  );

  // Update the fetchNotifications function
  const fetchNotifications = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/hr/upcoming-tests');
      const data = await response.json();
      
      if (data.status === "success") {
        console.log("Notifications received:", data.posts); // Add this log
        console.log("Exam types:", data.posts.map(p => p.exam_type)); // Add this log
        setNotifications(data.posts);
        // Only count posts that are marked as today
        const todayPostsCount = data.posts.filter(post => post.is_today).length;
        setNotificationCount(todayPostsCount);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast.error("Failed to fetch notifications");
    }
  };

  // Add this useEffect after your existing useEffects
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const isAuthenticated = localStorage.getItem("isAuthenticated");
    const userRole = localStorage.getItem("userRole");
    
    if (!isAuthenticated || !userRole) {
      navigate("/login", { replace: true });
      return;
    }

    // Check specific role for each dashboard
    const requiredRole = userRole.toLowerCase();
    if (
      (requiredRole !== "hr" && window.location.pathname.includes("hr")) || 
      (requiredRole !== "panel" && window.location.pathname.includes("panel"))
    ) {
      navigate("/unauthorized", { replace: true });
    }
  }, [navigate]);

  // Add this helper function at the top of your component, after the state declarations
  const getPreviewText = (questions) => {
    try {
      // Parse questions if it's a string
      const parsedQuestions = typeof questions === 'string' 
        ? JSON.parse(questions) 
        : questions;

      // If questions is an array, get the first question's text
      if (Array.isArray(parsedQuestions) && parsedQuestions.length > 0) {
        return parsedQuestions[0].question || 'No preview available';
      }
      
      return 'No preview available';
    } catch (error) {
      return 'No preview available';
    }
  };

  // Add this function to handle post updates
  const handlePostUpdate = async () => {
    await fetchNotifications(); // Fetch updated notifications
    await fetchHiringQuestions(); // Refresh questions list
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <button
        onClick={() => setSidebarOpen(!isSidebarOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-slate-800 text-white rounded-lg"
      >
        <Menu />
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-slate-800 text-white transition-all duration-300 ease-in-out z-40 ${
          isSidebarOpen ? "w-64" : "w-0 md:w-20"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          {isSidebarOpen && (
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col">
                <h2 className="text-xl font-bold">HR Dashboard</h2>
                <p className="text-sm text-gray-300">Welcome, {hrName}</p>
              </div>
              <button
                onClick={() => setShowNotifications(true)}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-slate-700 transition-colors relative"
              >
                <Bell size={18} />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    {notificationCount}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="mt-6 space-y-2 px-2 flex flex-col h-[calc(100%-5rem)]">
          <button
            onClick={() => setActiveTab("create-job")}
            className={`w-full flex items-center p-3 rounded-lg transition-colors ${
              activeTab === "create-job"
                ? "bg-blue-600"
                : "hover:bg-slate-700"
            }`}
          >
            <Briefcase />
            {isSidebarOpen && <span className="ml-3">Create Job</span>}
          </button>
          <button
            onClick={() => setActiveTab("verify-candidates")}
            className={`w-full flex items-center p-3 rounded-lg transition-colors ${
              activeTab === "verify-candidates"
                ? "bg-blue-600"
                : "hover:bg-slate-700"
            }`}
          >
            <CheckCircle />
            {isSidebarOpen && <span className="ml-3">Verify Candidates</span>}
          </button>
          <button
            onClick={() => setActiveTab("start-hiring")}
            className={`w-full flex items-center p-3 rounded-lg transition-colors ${
              activeTab === "start-hiring"
                ? "bg-blue-600"
                : "hover:bg-slate-700"
            }`}
          >
            <CheckCircle />
            {isSidebarOpen && <span className="ml-3">Start Test</span>}
          </button>
          <div className="mt-auto flex flex-col gap-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center p-3 rounded-lg transition-colors hover:bg-red-600"
            >
              <LogOut />
              {isSidebarOpen && <span className="ml-3">Logout</span>}
            </button>
          </div>
        </nav>

        {/* Collapse button - positioned absolutely relative to viewport */}
        <button
          onClick={() => setSidebarOpen(!isSidebarOpen)}
          className="hidden md:flex fixed w-6 h-6 bg-slate-800 text-white items-center justify-center rounded-full hover:bg-slate-700 transition-all duration-300 ease-in-out border border-slate-600 shadow-md z-50"
          style={{
            left: isSidebarOpen ? 'calc(16rem - 0.75rem)' : 'calc(5rem - 0.75rem)',
            top: '50%',
            transform: 'translateY(-50%)'
          }}
        >
          <ChevronLeft 
            className={`w-4 h-4 transition-transform duration-300 ease-in-out ${
              !isSidebarOpen ? 'rotate-180' : ''
            }`} 
          />
        </button>
      </aside>

      {/* Main Content */}
      <main
        className={`transition-all duration-300 p-4 md:p-8 ${
          isSidebarOpen ? "md:ml-64" : "md:ml-20"
        } h-screen overflow-auto md:overflow-hidden`}
      >
        <div className="bg-white rounded-2xl shadow-sm p-6 h-[calc(100vh-4rem)] overflow-auto">
          {activeTab === "create-job" && (
            <div className="h-full">
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <Briefcase className="w-7 h-7 text-blue-600" />
                  Create New Job Posting
                </h1>
                <p className="text-gray-600 mt-1">
                  Post new job opportunities and create assessment questions for candidates
                </p>
              </div>
              <NewPost onPostUpdate={handlePostUpdate} />
            </div>
          )}

          {activeTab === "verify-candidates" && (
            <div className="h-full">
              <HrVerifyScreen />
            </div>
          )}

          {activeTab === "start-hiring" && (
            <div>
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <CheckCircle className="w-7 h-7 text-blue-600" />
                  Start Assessment Tests
                </h1>
                <p className="text-gray-600 mt-1">
                  Initiate tests for job postings and track ongoing assessments
                </p>
              </div>
              {loading ? (
                <LoadingSpinner />
              ) : questions.length === 0 ? (
                <EmptyTestState />
              ) : (
                <ul className="grid md:grid-cols-2 gap-6">
                  {questions.map((q) => (
                    <li
                      key={q.question_id}
                      className="border p-6 rounded-2xl shadow-md bg-white hover:shadow-lg transition duration-300"
                    >
                      <div className="space-y-4">
                        {/* Job and Question Info */}
                        <div>
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="text-lg font-semibold text-gray-800">
                              {q.question_title}
                            </h3>
                            <span className="text-sm text-gray-500 ml-4">
                              Test Date: {q.test_start_date}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 flex-wrap">
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                              {q.job_title}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-sm ${
                              q.exam_type === 'MCQ' 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {q.exam_type}
                            </span>
                            {/* Add this new span for question level */}
                            <span className={`px-3 py-1 rounded-full text-sm ${
                              q.question_level === 'Beginner' 
                                ? 'bg-green-100 text-green-700'
                                : q.question_level === 'Intermediate'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-purple-100 text-purple-700'
                            }`}>
                              {q.question_level}
                            </span>
                            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                              Created by: {q.created_by || 'Unknown Panel'}
                            </span>
                          </div>
                        </div>

                        {/* Question Preview */}
                        <div className="bg-gray-100 p-4 rounded-lg">
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {getPreviewText(q.questions)}
                          </p>
                          <button
                            onClick={() => handleViewQuestions(q)}
                            className="mt-2 flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm group"
                          >
                            <Eye className="h-4 w-4 group-hover:animate-bounce" />
                            View Questions
                          </button>
                        </div>

                        {/* Assigned Candidates */}
                        {q.candidates && q.candidates.length > 0 && (
                          <div>
                            <h4 className="font-medium text-gray-700 mb-2">
                              Assigned Candidates ({q.candidates.length})
                            </h4>
                            <div className="space-y-2">
                              {q.candidates.map((candidate) => (
                                <div
                                  key={candidate.candidate_id}
                                  className="flex items-center justify-between bg-gray-100 p-2 rounded"
                                >
                                  <div>
                                    <p className="font-medium text-gray-800">{candidate.name}</p>
                                    <p className="text-sm text-gray-600">{candidate.email}</p>
                                  </div>
                                  <span className={`px-2 py-1 text-xs rounded-full ${
                                    candidate.progress === 'Applied' ? 'bg-yellow-100 text-yellow-800' :
                                    candidate.progress === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                                    'bg-green-100 text-green-800'
                                  }`}>
                                    {candidate.progress}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Action Button */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => startTest(q.question_id, q.candidates)}
                            disabled={startingTest === q.question_id || q.question_start === 'Yes' || !q.candidates?.length}
                            className={`flex-1 px-4 py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                              startingTest === q.question_id || q.question_start === 'Yes' || !q.candidates?.length
                                ? 'bg-gray-500 cursor-not-allowed' // Updated to match PanelDashboard
                                : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg group'
                            } text-white`}
                          >
                            {startingTest === q.question_id ? (
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Starting Test...
                              </div>
                            ) : q.question_start === 'Yes' ? (
                              <>
                              <Loader className="w-4 h-4 group-hover:animate-bounce" />
                              <span>Test Started</span>
                              </>
                             ) : !q.candidates?.length ? (
                              <span>No Candidates Applied</span>
                            ) : (
                              <>
                                <Loader className="w-4 h-4 group-hover:animate-bounce" />
                                <span>Start Test</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={() => notifyCandidates(q.job_id, q.question_id)}
                            disabled={!q.candidates?.length || notifyingIds.has(`${q.job_id}-${q.question_id}`) || q.question_start === 'Yes'}
                            className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 ${
                              !q.candidates?.length || notifyingIds.has(`${q.job_id}-${q.question_id}`) || q.question_start === 'Yes'
                                ? 'bg-gray-500 cursor-not-allowed' // Updated to match PanelDashboard
                                : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-md hover:shadow-lg group'
                            } text-white`}
                          >
                            {notifyingIds.has(`${q.job_id}-${q.question_id}`) ? (
                              <div className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Notifying...
                              </div>
                            ) : q.question_start === 'Yes' ? (
                              <>
                                <CheckCircle className="w-4 h-4" />
                                <span>Notification Sent</span>
                              </>
                            ) : (
                              <>
                                <Bell className="w-4 h-4 group-hover:animate-bounce" />
                                <span>Notify Candidates</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {showQuestionModal && selectedQuestion && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-white rounded-xl w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-xl">
                    {/* Header */}
                    <div className="p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
                      <div className="flex justify-between items-start">
                        <div className="flex items-start gap-3">
                          <div className={`p-2 rounded-lg ${
                            selectedQuestion.exam_type === 'MCQ' 
                              ? 'bg-blue-100 text-blue-600' 
                              : 'bg-green-100 text-green-600'
                          }`}>
                            {selectedQuestion.exam_type === 'MCQ' ? 
                              <FileText className="w-5 h-5" /> : 
                              <Clipboard className="w-5 h-5" />
                            }
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-800">
                              {selectedQuestion.question_title}
                            </h3>
                            <div className="mt-1 flex items-center gap-2">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                selectedQuestion.exam_type === 'MCQ' 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'bg-green-100 text-green-700'
                              }`}>
                                {selectedQuestion.exam_type}
                              </span>
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs">
                                Created by: {selectedQuestion.created_by || 'Unknown Panel'}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowQuestionModal(false)}
                          className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                        >
                          <X className="h-4 w-4 text-gray-500" />
                        </button>
                      </div>
                    </div>

                    {/* Questions Content */}
                    <div className="p-4 overflow-y-auto max-h-[calc(85vh-4rem)]">
                      <div className="space-y-6 pb-6">
                        {(() => {
                          try {
                            const parsedQuestions = Array.isArray(selectedQuestion.questions)
                              ? selectedQuestion.questions
                              : JSON.parse(selectedQuestion.questions);

                            return parsedQuestions.map((q, index) => (
                              <div key={index} className="bg-gray-50 rounded-xl border border-gray-200">
                                {/* Question Header */}
                                <div className="p-4 bg-white border-b border-gray-100">
                                  <div className="flex items-start gap-3">
                                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 text-sm font-semibold">
                                      {index + 1}
                                    </div>
                                    <p className="text-gray-800 font-medium">
                                      {q.question}
                                    </p>
                                  </div>
                                </div>

                                {/* Answer Section */}
                                <div className="p-4 space-y-4">
                                  {selectedQuestion.exam_type === 'MCQ' ? (
                                    // MCQ Options section remains the same
                                    <div className="space-y-2">
                                      {q.options?.map((option, optIndex) => (
                                        <div
                                          key={optIndex}
                                          className={`p-3 rounded-lg flex items-center gap-3 ${
                                            option === q.correctAnswer
                                              ? "bg-green-50 border border-green-200"
                                              : "bg-white border border-gray-200"
                                          }`}
                                        >
                                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium ${
                                            option === q.correctAnswer
                                              ? "bg-green-100 text-green-800"
                                              : "bg-gray-100 text-gray-700"
                                          }`}>
                                            {String.fromCharCode(65 + optIndex)}
                                          </div>
                                          <span className={option === q.correctAnswer ? "text-green-800 font-medium" : "text-gray-700"}>
                                            {option}
                                          </span>
                                          {option === q.correctAnswer && (
                                            <span className="ml-auto flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                                              <CheckCircle className="w-3 h-3" />
                                              Correct
                                            </span>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    // Updated Interview Question Expected Answer section
                                    <div className="bg-white rounded-lg border border-gray-500 p-6">
                                      <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-600" />
                                        Expected Answer
                                      </h4>
                                      <div className="prose prose-sm max-w-none text-gray-600">
                                        {(() => {
                                          try {
                                            const answer = q.answer || q.expected_answer;
                                            if (!answer) return 'No expected answer provided';
                
                                            return answer.split(/(?=\d\.\s*\*\*)/g).map((point, idx) => {
                                              const titleMatch = point.match(/\*\*(.*?)\*\*/);
                                              const title = titleMatch ? titleMatch[1] : '';
                                              const content = point.replace(/\d\.\s*\*\*.*?\*\*:\s*/, '').trim();
                
                                              return (
                                                <div key={idx} className="mb-4">
                                                  {title && (
                                                    <div className="flex gap-2 items-start mb-3">
                                                      <span className="flex-shrink-0 w-6 h-6 bg-green-100 rounded-full flex items-center justify-center text-green-700 text-sm font-semibold">
                                                        {idx + 1}
                                                      </span>
                                                      <h5 className="text-base font-bold text-gray-800">
                                                        {title}
                                                      </h5>
                                                    </div>
                                                  )}
                                                  <div className="pl-8 space-y-3">
                                                    {content.split(/\s*•\s*/g).map((bullet, bulletIdx) => {
                                                      if (!bullet.trim()) return null;
                                                      return (
                                                        <div 
                                                          key={bulletIdx} 
                                                          className="flex items-start gap-3"
                                                        >
                                                          {bullet.includes('Example:') ? (
                                                            <div className="w-full p-4 bg-gray-50 rounded-lg font-mono text-sm border border-gray-200">
                                                              <div className="text-xs text-gray-500 mb-2">Example:</div>
                                                              <div className="text-gray-800">
                                                                {bullet.replace('Example:', '').trim()}
                                                              </div>
                                                            </div>
                                                          ) : (
                                                            <div className="flex gap-2">
                                                              <span className="text-gray-400 mt-1">•</span>
                                                              <p className="text-gray-700 leading-relaxed">
                                                                {bullet}
                                                              </p>
                                                            </div>
                                                          )}
                                                        </div>
                                                      );
                                                    })}
                                                  </div>
                                                </div>
                                              );
                                            });
                                          } catch (err) {
                                            return (
                                              <p className="text-gray-600 p-4 bg-gray-50 rounded-lg">
                                                {q.answer || q.expected_answer || 'No expected answer provided'}
                                              </p>
                                            );
                                          }
                                        })()}
                                      </div>
                                    </div>
                                  )}

                                  {/* Explanation Section - remains the same */}
                                  {q.explanation && (
                                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
                                      <div className="flex items-center gap-2 mb-2">
                                        <FileText className="w-4 h-4 text-blue-600" />
                                        <h5 className="text-sm font-medium text-blue-800">Additional Notes:</h5>
                                      </div>
                                      <p className="text-sm text-blue-700">{q.explanation}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ));
                          } catch (err) {
                            return (
                              <div className="text-center py-8">
                                <div className="bg-red-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                                  <X className="h-6 w-6 text-red-500" />
                                </div>
                                <h3 className="text-base font-semibold text-gray-800 mb-1">Error Loading Questions</h3>
                                <p className="text-sm text-gray-500">
                                  There was an error parsing the questions. Please try again.
                                </p>
                              </div>
                            );
                          }
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <Toaster />

      {showLogoutConfirm && createPortal(
        <div className="fixed inset-0 z-[9999] isolate">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-96 p-6 relative z-10">
              <h3 className="text-xl font-bold mb-4">Confirm Logout</h3>
              <p className="text-gray-600 mb-6">Are you sure you want to log out?</p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLogout}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Add the notifications overlay before the Toaster component */}
      {showNotifications && createPortal(
        <div className="fixed inset-0 z-[9999] isolate">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowNotifications(false)}
          />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-[600px] max-h-[80vh] p-6 relative z-10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Upcoming Tests</h3>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="overflow-y-auto max-h-[60vh]">
                {notifications.length > 0 ? (
                  <div className="space-y-4">
                    {notifications.map((post) => {
                      const testDate = new Date(post.test_start_date);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      testDate.setHours(0, 0, 0, 0);
                      
                      const diffTime = testDate - today;
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                      // Determine card background color based on days remaining
                      const cardBgColor = diffDays === 0 
                        ? 'bg-red-50 border-red-200' 
                        : diffDays <= 2 
                        ? 'bg-yellow-50 border-yellow-200' 
                        : 'bg-white';

                      return (
                        <div
                          key={post.post_id}
                          className={`p-4 border rounded-lg transition-shadow ${cardBgColor}`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-2 w-full">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-gray-800">{post.title}</h4>
                                  {diffDays === 0 && (
                                    <span className="px-2 py-1 bg-red-200 text-red-800 rounded-full text-xs font-medium animate-pulse">
                                      URGENT
                                    </span>
                                  )}
                                </div>
                                <span className="text-sm text-gray-500">
                                  Test Date: {new Date(post.test_start_date).toLocaleDateString()}
                                </span>
                              </div>
                              
                              <p className="text-sm text-gray-600">{post.description}</p>
                              
                              <div className="flex flex-wrap items-center gap-2">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  post.exam_type === 'MCQ' 
                                    ? 'bg-blue-100 text-blue-700' 
                                    : 'bg-green-100 text-green-700'
                                }`}>
                                  {post.exam_type}
                                </span>
                                
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  diffDays === 0 
                                    ? 'bg-red-100 text-red-800'
                                    : diffDays <= 2
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {diffDays === 0 
                                    ? '0 days left' 
                                    : diffDays === 1
                                    ? '1 day left'
                                    : `${diffDays} days left`}
                                </span>

                                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                                  Stage {post.post_stage || 1}
                                </span>

                                {post.exam_status === 'started' && (
                                  <span className="px-2 py-1 bg-green-200 text-green-800 rounded-full text-xs font-medium">
                                    Started
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No upcoming tests found
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default HRDashboard;
