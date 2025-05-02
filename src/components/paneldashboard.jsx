import React, { useState, useEffect, useRef } from "react";
import PropTypes from 'prop-types';
import {
  Menu,
  ChevronLeft,
  LogOut,
  FileText,
  BarChart,
  ChevronRight,
  Clipboard,
  ClipboardList,
  CheckCircle,
  Play,
  Trash2,
  X,
  Eye,
  Bell,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";
import axios from "axios";
import MCQPanelInterface from "./McqQuestion";
import InterviewPanelInterface from './InterviewQuestions';
import { createPortal } from "react-dom";

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

const FormField = ({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  disabled,
}) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      {label}
    </label>
    <input
      type={type}
      className={`w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all ${
        disabled ? "bg-gray-100 cursor-not-allowed" : ""
      }`}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
    />
  </div>
);

const StatsCard = ({ title, value, colorClass }) => (
  <div className="bg-gray-50 p-6 rounded-lg">
    <h3 className="text-xl font-semibold mb-2">{title}</h3>
    <p className={`text-4xl font-bold ${colorClass}`}>
      {value}
    </p>
  </div>
);

const TaskCard = ({ task, onSelect, hasExistingQuestions }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300">
      {/* Header Section */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl ${
              task.type === 'MCQ' ? 'bg-blue-100' : 'bg-green-100'
            }`}>
              {task.type === 'MCQ' ? (
                <FileText className={`w-6 h-6 ${task.type === 'MCQ' ? 'text-blue-600' : 'text-green-600'}`} />
              ) : (
                <Clipboard className="w-6 h-6 text-green-600" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-800">{task.title}</h3>
              <div className="flex flex-wrap gap-2 mt-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium 
                  ${task.levelIndicator?.includes('Beginner') ? 'bg-green-100 text-green-700' :
                    task.levelIndicator?.includes('Intermediate') ? 'bg-blue-100 text-blue-700' :
                    'bg-purple-100 text-purple-700'}`}>
                  {task.levelIndicator || 'Level Not Set'}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium 
                  ${task.type === 'MCQ' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                  {task.type}
                </span>
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                  Stage {task.post_stage || 1}
                </span>
              </div>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            task.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
          }`}>
            {task.status}
          </div>
        </div>
        <p className="text-gray-600 mt-2">{task.description}</p>
      </div>

      {/* Details Section */}
      <div className="p-6 bg-gray-50 rounded-b-xl space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-3 rounded-lg border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Category</p>
          <p className="font-medium text-gray-800">{task.category}</p>
        </div>
        <div className="bg-white p-3 rounded-lg border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Time Allowed</p>
          <p className="font-medium text-gray-800">{task.time} {task.time === 1 ? 'minute' : 'minutes'}</p>
        </div>
        <div className="bg-white p-3 rounded-lg border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Test Date</p>
          <p className="font-medium text-gray-800">{new Date(task.test_start_date).toLocaleDateString()}</p>
        </div>
        <div className="bg-white p-3 rounded-lg border border-gray-100">
          <p className="text-sm text-gray-500 mb-1">Application Deadline</p>
          <p className="font-medium text-gray-800">{new Date(task.application_deadline).toLocaleDateString()}</p>
        </div>
        {task.type === 'INTERVIEW' && (
          <>
            <div className="bg-white p-3 rounded-lg border border-gray-100">
              <p className="text-sm text-gray-500 mb-1">Minimum Mark Required</p>
              <p className="font-medium text-gray-800">{task.coverage}%</p>
            </div>
            <div className="bg-white p-3 rounded-lg border border-gray-100">
              <p className="text-sm text-gray-500 mb-1">Follow-up Questions</p>
              <p className="font-medium text-gray-800">{task.followup}</p>
            </div>
          </>
        )}
      </div>

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={() => onSelect(task)}
            disabled={hasExistingQuestions}
            className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2
              ${hasExistingQuestions 
                ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg'
              }`}
          >
            {hasExistingQuestions ? (
              <>
                <CheckCircle size={18} />
                Questions Generated
              </>
            ) : (
              <>
                {task.type === 'MCQ' ? <FileText size={18} /> : <Clipboard size={18} />}
                Generate {task.type}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Updated QuestionCard component
const QuestionCard = ({ question, onStartHiring, onDelete, taskId, onAssignJob, onViewQuestions, onShowAssignModal, onUnassignJob }) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false); // Add this state
  const [isNotifying, setIsNotifying] = useState(false); // Add this state
  const [isUnassigning, setIsUnassigning] = useState(false); // Add this state
  const currentUser = localStorage.getItem("username");

  // Get preview of first question
  let previewText = "Preview not available";
  try {
    const parsedQuestions = Array.isArray(question.questions)
      ? question.questions
      : JSON.parse(question.questions);
    if (parsedQuestions?.length > 0 && parsedQuestions[0]?.question) {
      previewText = parsedQuestions[0].question;
    }
  } catch (err) {
    previewText = "Invalid question format";
  }

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true); // Start loading
    try {
      await onDelete(question);
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false); // Stop loading
    }
  };

  const handleStartHiringClick = async () => {
    setIsNotifying(true); // Start loading
    try {
      await onStartHiring(question, taskId);
    } finally {
      setIsNotifying(false); // Stop loading
    }
  };

  const canDelete = !question.notify && question.created_by === currentUser;

  const handleAssignClick = () => {
    onAssignJob(question);
  };

  const getLevelColor = (level) => {
    switch (level?.toLowerCase()) {
      case 'beginner':
        return 'text-green-600 bg-green-100';
      case 'intermediate':
        return 'text-blue-600 bg-blue-100';
      case 'advanced':
        return 'text-purple-600 bg-purple-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const handleUnassignClick = async (question) => {
    setIsUnassigning(true);
    try {
      await onUnassignJob(question);
    } finally {
      setIsUnassigning(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center">
          <div className={`p-2 rounded-lg ${question.exam_type === 'MCQ' ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
            {question.exam_type === 'MCQ' ? <FileText size={20} /> : <Clipboard size={20} />}
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium">{question.question_title}</h3>
            <div className="flex flex-col gap-2 mt-1">
              <div className="flex items-center gap-2">
                {/* Question Level and Created By in same row */}
                {question.question_level && (
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(question.question_level)}`}>
                    {question.question_level} Level
                  </span>
                )}
              </div>
              {/* Assigned to in new row */}
              {question.post_title && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 flex items-center gap-1">
                    <span className="px-2 py-1 rounded-full bg-gray-100">
                      Assigned to: {question.post_title}
                    </span>
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
          question.exam_type === 'MCQ' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
        }`}>
          {question.exam_type}
        </div>
      </div>

      {/* Question Preview Section */}
      <div className="space-y-4">
        <div className="bg-gray-100 p-4 rounded-lg">
          <p className="text-gray-600 font-medium mb-2">Question Preview:</p>
          <p className="text-gray-800">{previewText}</p>
          <button
            onClick={() => onViewQuestions(question)} // Changed from onStartHiring to onViewQuestions
            className="mt-2 flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm"
          >
            <Eye className="h-4 w-4" />
            View Questions
          </button>
        </div>

        {/* Add Assigned Candidates Section */}
        {question.job_id && question.candidates && question.candidates.length > 0 && (
          <div className="mt-4">
            <h4 className="font-medium text-gray-700 mb-2">
              Assigned Candidates ({question.candidates.length})
            </h4>
            <div className="space-y-2">
              {question.candidates.map((candidate) => (
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
                    candidate.progress === 'Completed' ? 'bg-green-100 text-green-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {candidate.progress || 'Pending'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-2">
          {!question.job_id ? (
            <button
              onClick={() => onShowAssignModal(question)}
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg 
                hover:from-blue-700 hover:to-blue-800 transition-all duration-200 
                flex items-center gap-2 group shadow-md hover:shadow-lg"
            >
              <FileText size={16} className="group-hover:animate-bounce" />
              Assign to Job
            </button>
          ) : (
            !question.notify && (
              <button
                onClick={() => handleUnassignClick(question)}
                disabled={isUnassigning}
                className="px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-700 text-white rounded-lg 
                  hover:from-yellow-700 hover:to-yellow-800 transition-all duration-200 
                  flex items-center gap-2 group shadow-md hover:shadow-lg min-w-[130px] justify-center"
              >
                {isUnassigning ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    <span>Unassigning...</span>
                  </>
                ) : (
                  <>
                    <X size={16} className="group-hover:animate-bounce" />
                    <span>Unassign Job</span>
                  </>
                )}
              </button>
            )
          )}

          {canDelete && (
            <button 
              onClick={handleDeleteClick}
              className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg 
                hover:from-red-700 hover:to-red-800 transition-all duration-200 
                flex items-center gap-2 group shadow-md hover:shadow-lg"
            >
              <Trash2 size={16} className="group-hover:animate-bounce" />
              Delete
            </button>
          )}

          {question.job_id && (
            <button 
              onClick={handleStartHiringClick}
              className={`px-4 py-2 ${
                question.notify 
                  ? 'bg-gray-500 cursor-not-allowed' // Keep this consistent gray
                  : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
              } text-white rounded-lg transition-all duration-200 flex items-center gap-2 ${
                !question.notify && 'group shadow-md hover:shadow-lg'
              } min-w-[120px] justify-center`}
              disabled={question.notify || isNotifying}
            >
              {isNotifying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  <span>Notifying...</span>
                </>
              ) : (
                <>
                  <Play size={16} className="group-hover:animate-bounce" />
                  {question.notify ? 'Notified to HR' : 'Notify HR'}
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {showDeleteConfirm && createPortal(
        <div className="fixed inset-0 z-[9999] isolate">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-96 p-6 relative z-10">
              <h3 className="text-xl font-bold mb-4">Confirm Delete</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this question? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
                  disabled={isDeleting}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center justify-center min-w-[80px]"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      <span>Deleting...</span>
                    </>
                  ) : (
                    'Delete'
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

// Add PropTypes for QuestionCard
QuestionCard.propTypes = {
  question: PropTypes.object.isRequired,
  onStartHiring: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  taskId: PropTypes.number,
  onAssignJob: PropTypes.func.isRequired,
  onViewQuestions: PropTypes.func.isRequired,
  onShowAssignModal: PropTypes.func.isRequired,
  onUnassignJob: PropTypes.func.isRequired
};

// Update the getPanelLevel function to handle null or non-string panel_id
const getPanelLevel = (task, username) => {
  if (!task?.panel_id || typeof task.panel_id !== 'string') return '';
  
  const panels = task.panel_id.split(',');
  const index = panels.indexOf(username);
  
  switch(index) {
    case 0: return 'Beginner Level';
    case 1: return 'Intermediate Level';
    case 2: return 'Advanced Level';
    default: return '';
  }
};

const PanelDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();

    useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
      // Clear the navigation state after using it
      navigate(location.pathname, { replace: true });
    }
  }, [location, navigate]);
  
  // Add this function definition before any state or other declarations
  const getSelectedCount = () => {
    if (!candidates || (!candidates.mcq && !candidates.interview)) {
      return 0;
    }
    const allCandidates = [...(candidates.mcq || []), ...(candidates.interview || [])];
    return allCandidates.filter(c => c.selected === 'yes').length;
  };

  // Rest of your existing state declarations and code
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("tasks");
  const [prompt, setPrompt] = useState("");
  const [showMCQ, setShowMCQ] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generatedQuestion, setGeneratedQuestion] = useState("");
  const [generatedQuestions, setGeneratedQuestions] = useState([]);

  const [isButtonDisabled, setIsButtonDisabled] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  const cooldownTimerRef = useRef(null);
  const COOLDOWN_PERIOD = 30;

  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  const [assignedTasks, setAssignedTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const [questions, setQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [selectedQuestionType, setSelectedQuestionType] = useState("all");

  const [panelName, setPanelName] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const [showAssignJobModal, setShowAssignJobModal] = useState(false);
  const [selectedQuestionForJob, setSelectedQuestionForJob] = useState(null);
  const [availableJobs, setAvailableJobs] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [assigningJobId, setAssigningJobId] = useState(null); // Add this state

  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);

  const [statisticsPosts, setStatisticsPosts] = useState([]);
  const [loadingStats, setLoadingStats] = useState(false);

  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);

  const [questionsExistMap, setQuestionsExistMap] = useState({});

  const menuItems = [
    { id: "tasks", icon: <Clipboard />, label: "Assigned Tasks" },
    { id: "manage", icon: <FileText />, label: "Manage Questions" },
    { id: "stats", icon: <BarChart />, label: "Statistics" }
  ];
  

  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const username = localStorage.getItem("username");
    if (username) {
      setPanelName(username);
    }
  }, []);

  const startCooldown = () => {
    setIsButtonDisabled(true);
    setCooldownTime(COOLDOWN_PERIOD);
    cooldownTimerRef.current = setInterval(() => {
      setCooldownTime((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(cooldownTimerRef.current);
          setIsButtonDisabled(false);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);
  };

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

  const generateQuestion = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    const numMatch = prompt.match(/\d+/);
    const numQuestions = numMatch ? parseInt(numMatch[0]) : 10;
    
    if (numQuestions < 10 || numQuestions > 15) {
      toast.error("Please request between 10-15 questions");
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem("authToken");
      
      const isInterview = selectedTask 
        ? selectedTask.type.toUpperCase() === 'INTERVIEW'
        : prompt.toLowerCase().includes('interview');
      
      const cleanPrompt = prompt
        .replace(/generate|create|\d+|questions|interview|mcq|about/gi, '')
        .trim();

      if (!cleanPrompt) {
        toast.error("Please specify a subject or topic");
        setLoading(false);
        return;
      }

      const endpoint = isInterview 
        ? 'http://localhost:5002/api/panel/generate-interview-questions'
        : 'http://localhost:5002/api/panel/generate-question';

      console.log("Using endpoint:", endpoint);

      const response = await axios.post(
        endpoint,
        {
          prompt: cleanPrompt,
          num_questions: numQuestions,
          task_id: selectedTask?.id || null,
          type: isInterview ? 'INTERVIEW' : 'MCQ'
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (response.data?.success && response.data?.questions) {
        setGeneratedQuestions(response.data.questions);
        setShowMCQ(!isInterview);
        toast.success(`Generated ${response.data.questions.length} ${isInterview ? 'interview' : 'MCQ'} questions!`);
      } else {
        throw new Error("Invalid response format from server");
      }
    } catch (error) {
      console.error("Error generating questions:", error);
      toast.error(error.response?.data?.error || "Failed to generate questions. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleTaskSelect = (task) => {
    setSelectedTask(task);
    setActiveTab("generate");
  };

  const handleStartHiring = async (question, taskId) => {
    try {
      const post_id = taskId;

      const response = await axios.post(
        'http://localhost:5000/api/panel/notify-hr',
        {
          questionId: question.question_id,
          postId: post_id
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (response.data.status === "success") {
        toast.success(`Notified HR about "${question.question_title}"`, {
          duration: 3000
        });

        setQuestions(prevQuestions => 
          prevQuestions.map(q => 
            q.question_id === question.question_id 
              ? {...q, notify: true}
              : q
          )
        );

        if (selectedTask) {
          setAssignedTasks(prevTasks => 
            prevTasks.map(task => 
              task.id === selectedTask.id
                ? {...task, status: 'Completed'}
                : task
            )
          );
        }
      } else {
        throw new Error(response.data.message || "Failed to notify HR");
      }
    } catch (error) {
      console.error("Error notifying HR:", error);
      toast.error("Failed to notify HR. Please try again.");
    }
  };

  const handleDeleteQuestion = async (question) => {
    try {
      const response = await axios.delete(
        `http://localhost:5000/api/panel/delete-question/${question.question_id}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
            "Content-Type": "application/json"
          }
        }
      );

      if (response.data.status === "success") {
        setQuestions(prevQuestions => 
          prevQuestions.filter(q => q.question_id !== question.question_id)
        );
        
        toast.success("Question deleted successfully", {
          duration: 3000,
        });
      } else {
        throw new Error(response.data.message || "Failed to delete question");
      }
    } catch (error) {
      console.error("Error deleting question:", error);
      toast.error(
        error.response?.data?.message || 
        "Failed to delete question"
      );
    }
  };

  const fetchQuestions = async () => {
    setLoadingQuestions(true);
    try {
      const username = localStorage.getItem("username");
      if (!username) {
        toast.error("User not found. Please login again.");
        return;
      }

      // Get all questions first
      const response = await axios.get(
        `http://localhost:5000/api/questions?username=${username}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("authToken")}`
          }
        }
      );
      
      if (response.data?.status === "success") {
        // Filter questions based on selectedQuestionType
        const allQuestions = response.data.questions;
        const filteredQuestions = selectedQuestionType === "all" 
          ? allQuestions
          : allQuestions.filter(q => q.exam_type.toUpperCase() === selectedQuestionType.toUpperCase());

        setQuestions(filteredQuestions);
      } else {
        throw new Error("Invalid response format");
      }

    } catch (error) {
      console.error("Error fetching questions:", error);
      toast.error("Failed to fetch questions");
    } finally {
      setLoadingQuestions(false);
    }
  };

// Update the fetchAssignedTasks function
const fetchAssignedTasks = async () => {
  setLoadingTasks(true);
  try {
    const username = localStorage.getItem("username");
    const response = await axios.get(
      `http://localhost:5000/api/panel/tasks/${username}`
    );

    if (response.data?.status === "success") {
      if (response.data.tasks?.length > 0) {
        const postIds = response.data.tasks
          .map(task => task.id)
          .filter(Boolean)
          .join(',');

        if (postIds) {
          const questionsResponse = await axios.get(
            `http://localhost:5000/api/check-questions-bulk`,
            {
              params: { 
                postIds,
                username
              }
            }
          );

          const existingQuestions = questionsResponse.data?.exists || {};

          const tasks = response.data.tasks.map(task => ({
            ...task,
            panelLevel: getPanelLevel(task, username),
            levelIndicator: task.panel_id ? (
              task.panel_id.split(',')[0] === username ? 'Beginner Level' :
              task.panel_id.split(',')[1] === username ? 'Intermediate Level' :
              task.panel_id.split(',')[2] === username ? 'Advanced Level' :
              ''
            ) : '',
            post_stage: task.post_stage,
            hasExistingQuestions: existingQuestions[task.id] || false,
            // Ensure the date is properly formatted if it comes as a string
            application_deadline: task.application_deadline ? new Date(task.application_deadline) : null
          }));

          setAssignedTasks(tasks);
        } else {
          setAssignedTasks([]);
        }
      } else {
        setAssignedTasks([]);
      }
    }
  } catch (error) {
    console.error("Error fetching tasks:", error);
    toast.error("Failed to fetch assigned tasks");
    setAssignedTasks([]);
  } finally {
    setLoadingTasks(false);
  }
};

  // Update the fetchAvailableJobs function
  const fetchAvailableJobs = async (examType, questionLevel) => {
    setLoadingJobs(true);
    try {
      const username = localStorage.getItem("username");
      const response = await axios.get(
        `http://localhost:5000/api/active-jobs`,
        {
          params: {
            exam_type: examType,
            question_level: questionLevel,
            username: username
          },
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          }
        }
      );
      
      if (response.data.status === 'success') {
        // Filter out jobs that already have questions assigned
        const filteredJobs = response.data.jobs.filter(job => !job.hasAssignedQuestions);
        setAvailableJobs(filteredJobs);
      } else {
        throw new Error(response.data.message || 'Failed to fetch jobs');
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast.error('Failed to fetch available jobs');
      setAvailableJobs([]);
    } finally {
      setLoadingJobs(false);
    }
  };

  const handleAssignJob = async (questionId, jobId) => {
    setAssigningJobId(jobId); // Set the assigning job ID
    try {
      // First assign the job
      const response = await axios.post(
        'http://localhost:5000/api/assign-job',
        {
          questionId,
          jobId
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          }
        }
      );

      if (response.data.status === 'success') {
        // Then update question_start to 'No'
        const updateResponse = await axios.put(
          `http://localhost:5000/api/questions/${questionId}/start-status`,
          {
            startStatus: 'No'
          },
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("authToken")}`,
            }
          }
        );

        if (updateResponse.data.status === 'success') {
          toast.success('Job assigned successfully');
          setShowAssignJobModal(false);
          setSelectedQuestionForJob(null);
          fetchQuestions(); // Refresh questions list
        }
      }
    } catch (error) {
      console.error('Error assigning job:', error);
      toast.error('Failed to assign job');
    } finally {
      setAssigningJobId(null); // Reset the assigning job ID
    }
  };

  const handleViewQuestions = (question) => {
    // Parse the questions and show them in a modal
    try {
      const parsedQuestions = Array.isArray(question.questions) 
        ? question.questions 
        : JSON.parse(question.questions);
      setSelectedQuestion(question);
      setShowQuestionModal(true);
    } catch (err) {
      toast.error("Error viewing questions");
    }
  };

  const fetchStatisticsPosts = async () => {
    setLoadingStats(true);
    try {
      const username = localStorage.getItem("username");
      const response = await axios.get(
        `http://localhost:5000/api/panel/assigned-posts/${username}`
      );

      if (response.data?.status === "success") {
        setStatisticsPosts(response.data.posts);
      }
    } catch (error) {
      console.error("Error fetching posts:", error);
      toast.error("Failed to fetch assigned posts");
    } finally {
      setLoadingStats(false);
    }
  };

  // Update the fetchNotifications function
  const fetchNotifications = async () => {
    try {
      const username = localStorage.getItem("username");
      if (!username) {
        throw new Error("Username not found");
      }

      const response = await axios.get(
        `http://localhost:5000/api/panel/tasks/${username}`
      );

      if (response.data?.status === "success" && response.data.tasks?.length > 0) {
        const posts = response.data.tasks;
        setNotifications(posts);

        const postIds = posts.map(post => post.id).filter(Boolean);
        
        if (postIds.length > 0) {
          const questionsResponse = await axios.get(
            `http://localhost:5000/api/check-questions-bulk`,
            {
              params: {
                postIds: postIds.join(','),
                username // Add username to params
              }
            }
          );
          
          if (questionsResponse.data?.status === 'success') {
            setQuestionsExistMap(questionsResponse.data.exists);
          }
        }

        const twoDaysFromNow = new Date();
        twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
        
        const needsAttentionCount = posts.filter(post => {
          const testDate = new Date(post.test_start_date);
          testDate.setHours(0, 0, 0, 0);
          return testDate <= twoDaysFromNow;
        }).length;
        
        setNotificationCount(needsAttentionCount);
      } else {
        setNotifications([]);
        setNotificationCount(0);
      }
    } catch (error) {
      console.error("Error fetching notifications:", error);
      toast.error("Failed to fetch notifications");
      setNotifications([]);
      setNotificationCount(0);
    }
  };

  useEffect(() => {
    if (activeTab === "stats") {
      fetchStatisticsPosts();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "tasks") {
      fetchAssignedTasks();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "manage") {
      fetchQuestions();
    }
  }, [activeTab, selectedQuestionType]);

  useEffect(() => {
    const fetchCandidates = async () => {
      setLoadingCandidates(true);
      try {
        const token = localStorage.getItem("authToken");
        const userId = localStorage.getItem("userId");

        if (!panelMemberId) {
          toast.error("Panel member ID not found.");
          setLoadingCandidates(false);
          return;
        }

        const response = await axios.get(
          `http://localhost:5000/panel/assigned-candidates?id=${panelMemberId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        setCandidates(response.data.candidates || []);
      } catch (error) {
        console.error("Error fetching candidates:", error);
        const errorMessage =
          error.response?.data?.error ||
          error.message ||
          "Failed to fetch assigned candidates.";
        toast.error(errorMessage);
      } finally {
        setLoadingCandidates(false);
      }
    };

    if (activeTab === "candidates") {
      fetchCandidates();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "generate" && selectedTask) {
      setSelectedTask(null);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  // In the stats section where you handle the analytics button click
  const handleAnalyticsClick = (post) => {
    const analyticsPath = `/panel/analytics/${post.exam_type.toLowerCase()}/${post.post_id}`;
    navigate(analyticsPath);
  };

  const handleShowAssignModal = (question) => {
    setSelectedQuestionForJob(question);
    fetchAvailableJobs(question.exam_type, question.question_level);
    setShowAssignJobModal(true);
  };

  const handleUnassignJob = async (question) => {
    try {
      const response = await axios.post(
        'http://localhost:5000/api/unassign-job',
        {
          questionId: question.question_id
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken")}`,
          }
        }
      );

      if (response.data.status === 'success') {
        toast.success('Job unassigned successfully');
        fetchQuestions(); // Refresh questions list
      }
    } catch (error) {
      console.error('Error unassigning job:', error);
      toast.error('Failed to unassign job');
    }
  };

  useEffect(() => {
    const checkQuestionsExist = async () => {
      if (notifications.length > 0) {
        try {
          const username = localStorage.getItem("username");
          const response = await axios.get(
            `http://localhost:5000/api/check-questions-bulk`,
            {
              params: {
                postIds: notifications.map(post => post.id).join(','),
                username
              }
            }
          );
          
          if (response.data?.status === 'success') {
            setQuestionsExistMap(response.data.exists);
          }
        } catch (error) {
          console.error("Error checking questions:", error);
        }
      }
    };
  
    checkQuestionsExist();
  }, [notifications]);

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

  return (
    <div className="min-h-screen bg-gray-100">
      <button
        onClick={() => setSidebarOpen(!isSidebarOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-slate-800 text-white rounded-lg"
      >
        <Menu />
      </button>

      <aside
        className={`fixed top-0 left-0 h-full bg-slate-800 text-white transition-all duration-300 ease-in-out z-40 ${
          isSidebarOpen ? "w-64" : "w-0 md:w-20"
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          {isSidebarOpen && (
            <div className="flex items-center justify-between w-full">
              <div className="flex flex-col">
                <h2 className="text-xl font-bold">Panel Dashboard</h2>
                <p className="text-sm text-gray-300">Welcome, {panelName}</p>
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
        <nav className="mt-6 space-y-2 px-2 flex flex-col h-[calc(100%-5rem)]">
          {menuItems.map(({ id, icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center p-3 rounded-lg transition-colors ${
                activeTab === id ? "bg-blue-600" : "hover:bg-slate-700"
              }`}
            >
              {icon}
              {isSidebarOpen && <span className="ml-3">{label}</span>}
            </button>
          ))}
          <button
            onClick={handleLogout}
            className="w-full flex items-center p-3 rounded-lg transition-colors hover:bg-red-600 mt-auto"
          >
            <LogOut />
            {isSidebarOpen && <span className="ml-3">Logout</span>}
          </button>
        </nav>
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

      <main
        className={`transition-all duration-300 p-4 md:p-8 ${
          isSidebarOpen ? "md:ml-64" : "md:ml-20"
        } h-screen overflow-auto md:overflow-hidden`}
      >
        <div className="bg-white rounded-2xl shadow-sm p-6 h-[calc(100vh-4rem)] overflow-auto">
          {/* For Assigned Tasks tab */}
          {activeTab === "tasks" && (
            <div className="space-y-6">
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <Clipboard className="w-7 h-7 text-blue-600" />
                  Assigned Tasks
                </h1>
                <p className="text-gray-600 mt-1">
                  View and manage your assigned MCQ and Interview assessment tasks from HR
                </p>
              </div>
              {loadingTasks ? (
                <LoadingSpinner />
              ) : assignedTasks.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {assignedTasks.map((task) => (
                    <TaskCard 
                      key={task.id} 
                      task={task} 
                      onSelect={handleTaskSelect}
                      hasExistingQuestions={task.hasExistingQuestions}
                    />
                  ))}
                </div>
              ) : (
                <EmptyTaskState />
              )}
            </div>
          )}

          {/* For Manage Questions tab */}
          {activeTab === "manage" && (
            <div className="space-y-6">
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <FileText className="w-7 h-7 text-blue-600" />
                  Manage Questions
                </h1>
                <p className="text-gray-600 mt-1">
                  Review, edit, and manage your generated MCQ and Interview questions
                </p>
              </div>
              <div className="flex space-x-4 mb-6">
                <button
                  onClick={() => setSelectedQuestionType("all")}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    selectedQuestionType === "all"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 hover:bg-gray-300 text-gray-800"
                  }`}
                >
                  All Questions
                </button>
                <button
                  onClick={() => setSelectedQuestionType("MCQ")}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    selectedQuestionType === "MCQ"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 hover:bg-gray-300 text-gray-800"
                  }`}
                >
                  MCQ Questions
                </button>
                <button
                  onClick={() => setSelectedQuestionType("INTERVIEW")}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    selectedQuestionType === "INTERVIEW"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-200 hover:bg-gray-300 text-gray-800"
                  }`}
                >
                  Interview Questions
                </button>
              </div>

              {loadingQuestions ? (
                <LoadingSpinner />
              ) : questions.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {questions.map((question) => (
                    <QuestionCard
                      key={question.question_id}
                      question={question}
                      onStartHiring={handleStartHiring}
                      onDelete={handleDeleteQuestion}
                      taskId={selectedTask?.id}
                      onAssignJob={(question) => {
                        setSelectedQuestionForJob(question);
                        fetchAvailableJobs(question.exam_type, question.question_level);
                        setShowAssignJobModal(true);
                      }}
                      onViewQuestions={handleViewQuestions}  // Pass the new handler here
                      onShowAssignModal={handleShowAssignModal} // Add this prop
                      onUnassignJob={handleUnassignJob} // Add this prop
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[calc(100vh-16rem)] bg-white rounded-2xl p-8 text-center">
                  <div className="bg-blue-50 p-4 rounded-full mb-6">
                    <FileText className="w-16 h-16 text-blue-500" />
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-800 mb-3">
                    No Questions Found
                  </h3>
                  <p className="text-gray-600 mb-8 max-w-md">
                    Questions will appear here after you generate them from your assigned tasks. Check the Tasks tab for assignments.
                  </p>
                  <button
                    onClick={() => setActiveTab("tasks")}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                  >
                    <Clipboard className="w-5 h-5" />
                    View Assigned Tasks
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "generate" && (
            <div className="space-y-6">
              {generatedQuestions.length > 0 ? (
                <>
                  <button
                    onClick={() => {
                      setGeneratedQuestions([]);
                      setShowMCQ(false);
                    }}
                    className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    ← Back to Question Generator
                  </button>
                  {showMCQ ? (
                    <MCQPanelInterface 
                      questions={generatedQuestions}
                      prompt={prompt}
                      taskId={selectedTask?.id}
                      question_level={selectedTask?.panelLevel?.split(' ')[0]}
                    />
                  ) : (
                    <InterviewPanelInterface
                      questions={generatedQuestions}
                      prompt={prompt}
                      taskId={selectedTask?.id}
                      question_level={selectedTask?.panelLevel?.split(' ')[0]}
                    />
                  )}
                </>
              ) : (
                <>
                {/* Question Generation Container */}
                <div className="space-y-8">
                  {/* Currently Working On Card */}
                  {selectedTask && (
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-md">
                      <div className="flex items-start gap-6">
                        {/* Task Type Icon */}
                        <div className={`p-4 rounded-xl ${
                          selectedTask.type === 'MCQ' 
                            ? 'bg-gradient-to-br from-blue-50 to-blue-100 ring-1 ring-blue-100' 
                            : 'bg-gradient-to-br from-green-50 to-green-100 ring-1 ring-green-100'
                        }`}>
                          {selectedTask.type === 'MCQ' ? (
                            <FileText className={`w-8 h-8 ${
                              selectedTask.type === 'MCQ' ? 'text-blue-600' : 'text-green-600'
                            }`} />
                          ) : (
                            <Clipboard className="w-8 h-8 text-green-600" />
                          )}
                        </div>

                        {/* Task Details */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900">Currently working on:</h3>
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              selectedTask.type === 'MCQ'
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {selectedTask.type}
                            </span>
                          </div>

                          <h2 className="text-2xl font-bold text-gray-800 mb-4">
                            {selectedTask.title}
                          </h2>

                          {/* Task Metadata Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                            <div className="space-y-1">
                              <p className="text-sm text-gray-500">Level</p>
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                                selectedTask.panelLevel?.includes('Beginner') 
                                  ? 'bg-green-100 text-green-700' 
                                  : selectedTask.panelLevel?.includes('Intermediate') 
                                  ? 'bg-blue-100 text-blue-700' 
                                  : 'bg-purple-100 text-purple-700'
                              }`}>
                                {selectedTask.panelLevel || 'Not Set'}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <p className="text-sm text-gray-500">Time Allowed</p>
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-700">
                                {selectedTask.time} {selectedTask.time === 1 ? 'minute' : 'minutes'}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <p className="text-sm text-gray-500">Category</p>
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-700">
                                {selectedTask.category}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <p className="text-sm text-gray-500">Stage</p>
                              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-700">
                                Stage {selectedTask.post_stage || 1}
                              </span>
                            </div>
                          </div>

                          {/* Description Box */}
                          <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                            <p className="text-sm text-gray-600 leading-relaxed">
                              {selectedTask.description}
                            </p>
                          </div>

                          {/* Additional Info for Interview Type */}
                          {selectedTask.type === 'INTERVIEW' && (
                            <div className="grid grid-cols-2 gap-4 mt-4">
                              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                                <p className="text-sm text-gray-500 mb-1">Minimum Mark Required</p>
                                <p className="text-lg font-semibold text-gray-800">
                                  {selectedTask.coverage}%
                                </p>
                              </div>
                              <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                                <p className="text-sm text-gray-500 mb-1">Follow-up Questions</p>
                                <p className="text-lg font-semibold text-gray-800">
                                  {selectedTask.followup}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Question Generation Section */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Prompt Input Section */}
                    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                      <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <FileText className="w-6 h-6 text-blue-600" />
                        Generate Questions
                      </h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Enter your prompt below
                          </label>
                          <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            disabled={isButtonDisabled || loading}
                            placeholder={`Example: Generate 12 ${selectedTask?.type || 'MCQ'} about JavaScript at ${selectedTask?.panelLevel?.split(' ')[0] || 'Beginner'}`}
                            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-200 min-h-[120px] resize-none"
                          />
                        </div>

                        <button
                          onClick={generateQuestion}
                          disabled={isButtonDisabled || loading}
                          className={`w-full px-6 py-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-2
                            ${isButtonDisabled || loading
                              ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                              : "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg transform hover:scale-[1.02]"
                            }`}
                        >
                          {loading ? (
                            <>
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Generating...</span>
                            </>
                          ) : (
                            <>
                              <FileText className="w-5 h-5" />
                              <span>Generate Questions</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Guidelines Section */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="p-6 border-b border-gray-100">
                        <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                          <ClipboardList className="w-6 h-6 text-blue-600" />
                          How to Generate Questions
                        </h3>
                      </div>
                      
                      <div className="p-6 space-y-6">
                        {/* Important Note */}
                        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-4 rounded-xl border border-yellow-200">
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-yellow-100 rounded-lg">
                              <Bell className="w-5 h-5 text-yellow-700" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-yellow-800 mb-1">Important Note:</h4>
                              <p className="text-yellow-700">You must generate between 10-15 questions at a time.</p>
                            </div>
                          </div>
                        </div>

                        {/* Type-Specific Guidelines */}
                        <div className={`rounded-xl border ${
                          selectedTask?.type === 'MCQ' 
                            ? 'bg-blue-50/50 border-blue-200' 
                            : 'bg-green-50/50 border-green-200'
                        }`}>
                          <div className="p-5">
                            <h4 className={`font-semibold mb-3 flex items-center gap-2 ${
                              selectedTask?.type === 'MCQ' ? 'text-blue-800' : 'text-green-800'
                            }`}>
                              {selectedTask?.type === 'MCQ' ? (
                                <>
                                  <FileText className="w-5 h-5" />
                                  For MCQ Questions:
                                </>
                              ) : (
                                <>
                                  <Clipboard className="w-5 h-5" />
                                  For Interview Questions:
                                </>
                              )}
                            </h4>

                            <div className="bg-white/80 rounded-lg p-4 border border-gray-200 space-y-3">
                              <div>
                                <p className="text-sm font-medium text-gray-600">Prompt Template:</p>
                                <p className="font-mono text-sm bg-gray-50 p-2 rounded mt-1 border border-gray-200">
                                  Generate [number] {selectedTask?.type || 'MCQ'} about [topic] at {selectedTask?.panelLevel?.split(' ')[0] || 'Difficulty Level'}
                                </p>
                              </div>
                              
                              <div>
                                <p className="text-sm font-medium text-gray-600">Example:</p>
                                <p className="font-mono text-sm bg-gray-50 p-2 rounded mt-1 border border-gray-200">
                                  {selectedTask?.type === 'MCQ' 
                                    ? 'Generate 12 MCQ about Java at Beginner'
                                    : 'Generate 10 interview questions about Python at Intermediate'
                                  }
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                </>
              )}
            </div>
          )}

          {/* For Statistics tab */}
          {activeTab === "stats" && (
            <div className="space-y-6">
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                  <BarChart className="w-7 h-7 text-blue-600" />
                  Assessment Statistics
                </h1>
                <p className="text-gray-600 mt-1">
                  Track candidate performance and view assessment analytics for your assigned posts
                </p>
              </div>
              
              {loadingStats ? (
                <LoadingSpinner />
              ) : statisticsPosts.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {statisticsPosts
                    .filter(post => post.exam_status === 'started')
                    .map((post) => (
                      <div 
                        key={post.post_id}
                        className="bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-300 overflow-hidden group"
                      >
                        {/* Header Section */}
                        <div className="p-6 border-b border-gray-100">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4">
                              <div className={`p-3 rounded-xl shrink-0 transform group-hover:scale-110 transition-transform duration-300 ${
                                post.exam_type === 'MCQ' 
                                  ? 'bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600' 
                                  : 'bg-gradient-to-br from-green-50 to-green-100 text-green-600'
                              }`}>
                                {post.exam_type === 'MCQ' ? <FileText className="w-6 h-6" /> : <Clipboard className="w-6 h-6" />}
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-gray-800">{post.title}</h3>
                                <p className="text-sm text-gray-600 mt-1 line-clamp-2">{post.description}</p>
                              </div>
                            </div>
                          </div>

                          {/* Tags Section */}
                          <div className="flex flex-wrap gap-2 mt-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                              post.exam_type === 'MCQ' 
                                ? 'bg-blue-100 text-blue-700' 
                                : 'bg-green-100 text-green-700'
                            }`}>
                              {post.exam_type}
                            </span>
                            <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                              Stage {post.post_stage || 1}
                            </span>
                            <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
                              {post.time} {post.time === 1 ? 'minute' : 'minutes'}
                            </span>
                          </div>
                        </div>

                        {/* Details Grid */}
                        <div className="grid grid-cols-2 divide-x divide-y divide-gray-100">
                          <div className="p-4">
                            <p className="text-sm text-gray-500 mb-1">Category</p>
                            <p className="font-medium text-gray-800">{post.category}</p>
                          </div>
                          <div className="p-4">
                            <p className="text-sm text-gray-500 mb-1">Experience Required</p>
                            <p className="font-medium text-gray-800">{post.minimum_experience} years</p>
                          </div>
                          <div className="p-4">
                            <p className="text-sm text-gray-500 mb-1">Test Date</p>
                            <p className="font-medium text-gray-800">
                              {new Date(post.test_start_date).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="p-4">
                            <p className="text-sm text-gray-500 mb-1">Status</p>
                            <p className="font-medium text-green-600">In Progress</p>
                          </div>
                        </div>

                        {/* Action Button */}
                        <div className="p-4 bg-gray-50 flex justify-end">
                          <button
                            onClick={() => handleAnalyticsClick(post)}
                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg 
                              hover:from-blue-700 hover:to-blue-800 transition-all duration-300 
                              flex items-center gap-2 group/button shadow-md hover:shadow-lg"
                          >
                            <BarChart size={18} className="group-hover/button:animate-bounce" />
                            <span>View Analytics</span>
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              ) : (
                <EmptyStatsState />
              )}
            </div>
          )}
        </div>
      </main>

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

      {showAssignJobModal && createPortal(
        <div className="fixed inset-0 z-[9999] isolate">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl w-[600px] p-6 relative z-10"> {/* Increased width */}
              {/* Header Section */}
              <div className="border-b border-gray-200 pb-4 mb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">Assign to Job</h3>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          selectedQuestionForJob?.question_level === 'Beginner' ? 'bg-green-100 text-green-700' :
                          selectedQuestionForJob?.question_level === 'Intermediate' ? 'bg-blue-100 text-blue-700' :
                          'bg-purple-100 text-purple-700'
                        }`}>
                          {selectedQuestionForJob?.question_level} Level
                        </span>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                          {selectedQuestionForJob?.exam_type}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowAssignJobModal(false);
                      setSelectedQuestionForJob(null);
                    }}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="h-5 w-5 text-gray-500" />
                  </button>
                </div>
              </div>

{/* Jobs List */}
<div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
  {loadingJobs ? (
    <div className="flex items-center justify-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  ) : availableJobs.length > 0 ? (
    <div className="space-y-4">
    {availableJobs.map(job => (
      <button
        key={job.post_id}
        onClick={() => handleAssignJob(selectedQuestionForJob.question_id, job.post_id)}
        className={`w-full rounded-xl transition-all duration-200 
          ${job.hasExistingQuestions 
            ? 'bg-gray-50 cursor-not-allowed opacity-60' 
            : 'bg-white hover:bg-blue-50/50 border border-gray-200 hover:border-blue-300 hover:shadow-md group'
          } relative text-left overflow-hidden`}
        disabled={assigningJobId === job.post_id || job.hasExistingQuestions}
      >
        <div className="p-4">
          <div className="flex items-start gap-4">
            {/* Icon Container */}
            <div className={`p-3 rounded-lg shrink-0 
              ${job.exam_type === 'MCQ' 
                ? 'bg-blue-100 text-blue-600' 
                : 'bg-green-100 text-green-600'}`}
            >
              {assigningJobId === job.post_id ? (
                <div className="w-6 h-6 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                job.exam_type === 'MCQ' ? <FileText className="w-6 h-6" /> : <Clipboard className="w-6 h-6" />
              )}
            </div>

            {/* Content Container */}
            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-gray-800 truncate">
                {job.title}
              </h4>
                {job.hasExistingQuestions ? (
                  <p className="text-sm text-red-600 mt-1 flex items-center gap-1">
                    <X className="w-4 h-4" />
                    Questions already assigned for this level
                  </p>
                ) : (
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {job.description}
                  </p>
                )}

                {/* Tags Container */}
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="text-xs px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                    {job.category}
                  </span>
                  <span className="text-xs px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full font-medium">
                    {job.time} {job.time === 1 ? 'minute' : 'minutes'}
                  </span>
                  <span className="text-xs px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full font-medium">
                    Stage {job.post_stage || 1}
                  </span>
                </div>
              </div>

                {/* Right Arrow Indicator - Hide when assigning */}
                {!job.hasExistingQuestions && assigningJobId !== job.post_id && (
                <div className="self-center text-gray-400 group-hover:text-blue-500 transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </div>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  ) : (
    <div className="text-center py-12">
      <div className="bg-gray-50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
        <FileText className="h-10 w-10 text-gray-400" />
      </div>
      <h3 className="text-gray-800 font-semibold mb-2">No Available Jobs Found</h3>
      <p className="text-gray-500">
        No jobs available for {selectedQuestionForJob?.question_level} level questions
      </p>
    </div>
  )}
</div>

              {/* Footer */}
              <div className="border-t border-gray-200 mt-4 pt-4 flex justify-end">
                <button
                  onClick={() => {
                    setShowAssignJobModal(false);
                    setSelectedQuestionForJob(null);
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg 
                    transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

    {/* Question Viewing Modal */}
    {showQuestionModal && selectedQuestion && (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
    <div className="bg-white rounded-xl w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-xl">
      {/* Modal Header */}
      <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${
                selectedQuestion.exam_type === 'MCQ' 
                  ? 'bg-blue-100 text-blue-600' 
                  : 'bg-green-100 text-green-600'
              }`}>
                {selectedQuestion.exam_type === 'MCQ' ? (
                  <FileText className="w-5 h-5" />
                ) : (
                  <Clipboard className="w-5 h-5" />
                )}
              </div>
              <h3 className="text-xl font-bold text-gray-800">
                {selectedQuestion.question_title || 'View Questions'}
              </h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                selectedQuestion.exam_type === 'MCQ' 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-green-100 text-green-700'
              }`}>
                {selectedQuestion.exam_type}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                selectedQuestion.question_level === 'Beginner' ? 'bg-green-100 text-green-700' :
                selectedQuestion.question_level === 'Intermediate' ? 'bg-blue-100 text-blue-700' :
                'bg-purple-100 text-purple-700'
              }`}>
                {selectedQuestion.question_level} Level
              </span>
              {selectedQuestion.post_title && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                  Assigned to: {selectedQuestion.post_title}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => {
              setShowQuestionModal(false);
              setSelectedQuestion(null);
            }}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
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
                      /* MCQ Options */
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
                                Correct Answer
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      /* Interview Question Expected Answer */
                      <div className="bg-white rounded-lg border border-gray-500 p-6 mb-2">
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
                                <div key={idx} className="mb-2">
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

                    {/* Explanation Section - Common for both types */}
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

      {showNotifications && createPortal(
        <div className="fixed inset-0 z-[9999] isolate">
                   <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-[600px] max-h-[80vh] p-6 relative z-10">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Assigned Tasks</h3>
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
                  {notifications
                    .filter(post => {
                      // Only show posts that either don't have questions or haven't been notified
                      return !questionsExistMap[post.id] || !post.notify;
                    })
                    .map((post) => {
                      const testDate = new Date(post.test_start_date);
                      const today = new Date();
                      today.setHours(0, 0, 0, 0); // Reset time part for accurate date comparison
                      testDate.setHours(0, 0, 0, 0); // Fixed: sethours -> setHours
                      
                      const diffTime = testDate - today;
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      
                      const twoDaysFromNow = new Date();
                      twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
                      
                      const needsAttention = diffDays <= 2 && post.exam_status !== 'completed';

                      return (
                        <div
                          key={post.id}
                          className={`p-4 border rounded-lg transition-shadow ${
                            needsAttention ? 'bg-yellow-50 border-yellow-200' : 'hover:shadow-md'
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-semibold text-gray-800">{post.title}</h4>
                                {needsAttention && (
                                  <span className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded-full text-xs font-medium">
                                    Urgent
                                  </span>
                                )}
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  diffDays <= 0 
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
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{post.description}</p>
                              <div className="mt-2 flex flex-wrap gap-2">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  post.type === 'MCQ' 
                                    ? 'bg-blue-100 text-blue-700' 
                                    : 'bg-green-100 text-green-700'
                                }`}>
                                  {post.type}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  needsAttention
                                    ? 'bg-red-100 text-red-700' 
                                    : 'bg-gray-100 text-gray-700'
                                }`}>
                                  Test Date: {testDate.toLocaleDateString()}
                                </span>
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  !questionsExistMap[post.id]
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : !post.notify
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-green-100 text-green-700'
                                }`}>
                                  {!questionsExistMap[post.id] 
                                    ? 'Questions Not Generated'
                                    : !post.notify 
                                    ? 'HR Notification Required'
                                    : 'Questions Generated & Notified'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">
                    No assigned tasks found
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      <Toaster />
    </div>
  );
};

const EmptyTaskState = () => (
  <div className="flex flex-col items-center justify-center h-[calc(100vh-16rem)] bg-white rounded-2xl p-8 text-center">
    <div className="bg-blue-50 p-4 rounded-full mb-6"> 
      <ClipboardList className="w-16 h-16 text-blue-500" />
    </div>
    <h3 className="text-2xl font-semibold text-gray-800 mb-3">
      No Tasks Assigned Yet
    </h3>
    <p className="text-gray-600 mb-8 max-w-md">
      HR will assign MCQ or Interview tasksfor you to evaluatecandidates. Check back later for new assignments.
    </p>
    <div className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl">
      <Clipboard className="w-5 h-5" />
      <span>Waiting for Tasks</span>
    </div>
  </div>
);

// Add this new EmptyStatsState component near your other components
const EmptyStatsState = () => (
  <div className="flex flex-col items-center justify-center h-[calc(100vh-16rem)] bg-white rounded-2xl p-8 text-center">
    <div className="bg-blue-50 p-4 rounded-full mb-6">
      <BarChart className="w-16 h-16 text-blue-500" />
    </div>
    <h3 className="text-2xl font-semibold text-gray-800 mb-3">
      No Analytics Available Yet
    </h3>
    <p className="text-gray-600 mb-8 max-w-md">
      Analytics will appear here once HR has started the assessments for your assigned posts.
      Only posts with started exams will be shown here.
    </p>
    <div className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl">
      <BarChart className="w-5 h-5" />
      <span>Waiting for Started Assessments</span>
    </div>
  </div>
);

export default PanelDashboard;

// In your login component where you handle successful login
const handleLoginSuccess = (data) => {
  localStorage.setItem("authToken", data.token);
  localStorage.setItem("username", data.user.username);
  localStorage.setItem("panelid",data.user.id);
};

MCQPanelInterface.propTypes = {
  questions: PropTypes.array.isRequired,
  prompt: PropTypes.string.isRequired,
  taskId: PropTypes.number.isRequired
};



// Add a new StatisticsTab component
const StatisticsTab = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const username = localStorage.getItem("username");

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const response = await axios.get(
          `http://localhost:5000/api/panel/assigned-posts/${username}`
        );

        if (response.data?.status === "success") {
          setPosts(response.data.posts);
        }
      } catch (error) {
        console.error("Error fetching posts:", error);
        toast.error("Failed to fetch assigned posts");
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [username]);

  const handleAnalyticsClick = (post) => {
    const analyticsPath = post.exam_type === 'MCQ' 
      ? `/analytics/mcq/${post.post_id}`
      : `/analytics/interview/${post.post_id}`;
    navigate(analyticsPath);
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="space-y-6">
      <div className="grid gap-6">
        {posts.map((post) => (
          <div 
            key={post.post_id}
            className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-md transition-all"
          >
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-semibold text-gray-800">{post.title}</h3>
                <div className="flex items-center gap-3 mt-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    post.exam_type === 'MCQ' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {post.exam_type}
                  </span>
                  <span className="text-sm text-gray-500">
                    Test Date: {new Date(post.test_start_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleAnalyticsClick(post)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <BarChart size={16} />
                View Analytics
              </button>
            </div>
          </div>
        ))}

        {posts.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <p className="text-gray-500">No posts assigned for analytics</p>
          </div>
        )}
      </div>
    </div>
  );
};
