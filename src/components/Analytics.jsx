import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { User, Calendar, Star, Brain, UserCheck, TrendingUp, X, MessageSquare, ChevronLeft, Settings2, CheckCircle2 } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';

import toast, { Toaster } from "react-hot-toast";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export const RankingsAnalytics = () => {
  const { postId } = useParams(); // Get postId from URL params
  const navigate = useNavigate(); // Add navigate hook
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [topN, setTopN] = useState(5); // Number of top performers to highlight
  const [sortedRankings, setSortedRankings] = useState([]);
  const [reviews, setReviews] = useState({});
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [currentReviewCandidate, setCurrentReviewCandidate] = useState(null);
  const [showReportConfirm, setShowReportConfirm] = useState(false); // Add new state for confirmation dialog
  const [hasReported, setHasReported] = useState(false); // Add new state for tracking report status
  const [isReporting, setIsReporting] = useState(false); // Add new state for button loading
  const [panelLevel, setPanelLevel] = useState(null);
  const username = localStorage.getItem('username');

  const threshold = 7; // Threshold for success rate

  const toast_during_ranks = 'rank-warning';
  const toast_during_conversation = 'conversation-warning';

  // Add these state variables at the top of your component
  const [numCandidatesToReport, setNumCandidatesToReport] = useState(() => {
    return parseInt(localStorage.getItem('topCandidatesCount')) || 1;
  });
  const [isEditingTopN, setIsEditingTopN] = useState(false);

  // Add this function to handle saving the new value
  const handleSaveTopN = () => {
    setIsEditingTopN(false);
    localStorage.setItem('topCandidatesCount', numCandidatesToReport.toString());
  };

  // Update the fetchRankings function
  const fetchRankings = async () => {
    try {
      // First get the panel level
      const levelResponse = await fetch(
        `http://localhost:5005/api/get-panel-level/${postId}?username=${username}`
      );
      
      if (!levelResponse.ok) {
        throw new Error('Failed to fetch panel level');
      }
      const levelData = await levelResponse.json();
      setPanelLevel(levelData.level);

      // Then get rankings
      const response = await fetch(`http://localhost:5005/get-rankings/${postId}`);
      if (!response.ok) throw new Error('Failed to fetch rankings');
      
      const data = await response.json();
      console.log('Raw rankings data:', data);

      // Filter rankings based on the panel level
      const filteredRankings = data.filter(ranking => 
        ranking.candidateLevel === levelData.level // Use the fetched level
      );
      
      console.log(`Filtered rankings for ${levelData.level} level:`, filteredRankings);
      
      // Initialize reviews from existing panel reviews
      const initialReviewsData = {};
      filteredRankings.forEach(ranking => {
        if (ranking.interview_performance?.panelReview) {
          const key = ranking.candidateName + ranking.date;
          initialReviewsData[key] = ranking.interview_performance.panelReview;
        }
      });
      
      setReviews(initialReviewsData);
      setRankings(filteredRankings);
      setSortedRankings(filteredRankings.sort((a, b) => new Date(b.date) - new Date(a.date)));

    } catch (err) {
      console.error('Error fetching rankings:', err);
      toast.error('Error occurred while fetching data.');
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Update useEffect to use the moved function
  useEffect(() => { 
    fetchRankings();
  }, []);

  // Update the useEffect with rankings sorting
  useEffect(() => {
    if (rankings.length > 0) {
      const sorted = [...rankings].sort((a, b) => {
        const scoresA = a.interview_performance?.scores || { fluency: 0, subjectKnowledge: 0, professionalBehavior: 0 };
        const scoresB = b.interview_performance?.scores || { fluency: 0, subjectKnowledge: 0, professionalBehavior: 0 };
        
        const avgA = Object.values(scoresA).reduce((sum, score) => sum + (Number(score) || 0), 0) / 3;
        const avgB = Object.values(scoresB).reduce((sum, score) => sum + (Number(score) || 0), 0) / 3;
        
        return avgB - avgA;
      });
      setSortedRankings(sorted);
    }
  }, [rankings]);

  // Add this useEffect to check report status
  useEffect(() => {
    const checkReportStatus = async () => {
      try {
        const response = await fetch(
          `http://localhost:5005/check-report-status/${postId}?level=${panelLevel}`
        );
        if (!response.ok) throw new Error('Failed to check report status');
        const data = await response.json();
        setHasReported(data.hasReported);
      } catch (err) {
        console.error('Error checking report status:', err);
      }
    };

    if (postId && panelLevel) {
      checkReportStatus();
    }
  }, [postId, panelLevel]);

  // Add this useEffect to fetch panel level
  useEffect(() => {
    const fetchPanelLevel = async () => {
      try {
        const response = await fetch(
          `http://localhost:5005/api/get-panel-level/${postId}?username=${username}`
        );
        
        if (!response.ok) {
          throw new Error('Failed to fetch panel level');
        }
        
        const data = await response.json();
        console.log('Panel level data:', data);
        setPanelLevel(data.level);
        
      } catch (error) {
        console.error('Error:', error);
        setError('Failed to determine panel level');
      }
    };

    if (postId && username) {
      fetchPanelLevel();
    }
  }, [postId, username]);

  // Update the fetchConversation function
  const fetchConversation = async (ranking) => {
    try {
      const response = await fetch(
        `http://localhost:5005/get-conversation/${postId}/${ranking.candidateId}`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch conversation');
      }
      
      const data = await response.json();
      console.log('Received conversation data:', data);
      
      if (!data || !data.interview_response) {
        throw new Error('No conversation data found');
      }
      
      setSelectedConversation(data.interview_response);
      setShowModal(true);
    } catch (err) {
      console.error('Error fetching conversation:', err);
      toast.error('Error occurred while fetching conversation.');
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      setSortedRankings((items) => {
        const oldIndex = items.findIndex(item => item.candidateName + item.date === active.id);
        const newIndex = items.findIndex(item => item.candidateName + item.date === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Update handleReportToHR function to include the level parameter
  const handleReportToHR = async () => {
    try {
      setIsReporting(true);
      const topCandidates = sortedRankings.slice(0, numCandidatesToReport);
      
      if (topCandidates.length === 0) {
        toast.error("No candidates to report");
        return;
      }

      const candidateIds = topCandidates.map(c => parseInt(c.candidateId, 10));

      const response = await fetch("http://localhost:5005/report-to-hr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: parseInt(postId, 10),
          candidateIds: candidateIds,
          level: panelLevel // Add panel level
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to report to HR');
      }

      toast.success(`Successfully reported ${topCandidates.length} ${panelLevel} level candidate${topCandidates.length > 1 ? 's' : ''} to HR`);
      setShowReportConfirm(false);
      setHasReported(true);

    } catch (error) {
      console.error('Error reporting to HR:', error);
      toast.error(error.message || "Failed to report to HR");
    } finally {
      setIsReporting(false);
    }
  };

  const ConversationModal = ({ conversation, onClose }) => {
    if (!conversation) return null;

    // Helper function to get all keys related to a specific question number
    const getQuestionGroup = (questionNum) => {
      const group = [];
      // Main question and answer
      if (conversation[`Question ${questionNum}`]) {
        group.push(`Question ${questionNum}`);
        if (conversation[`Candidate Answer ${questionNum}`]) {
          group.push(`Candidate Answer ${questionNum}`);
        }
        if (conversation[`Question_Feedback ${questionNum}`]) {
          group.push(`Question_Feedback ${questionNum}`);
        }
      }
      // Followup questions and answers
      if (conversation[`Followup_Question ${questionNum}`]) {
        group.push(`Followup_Question ${questionNum}`);
        if (conversation[`Candidate Followup_Answer ${questionNum}`]) {
          group.push(`Candidate Followup_Answer ${questionNum}`);
        }
        if (conversation[`Followup_Question_Feedback ${questionNum}`]) {
          group.push(`Followup_Question_Feedback ${questionNum}`);
        }
      }
      return group;
    };

    // Create ordered entries with correct sequence
    const orderedKeys = [
      // Initial messages
      'Welcome Message',
      'Candidate Welcome Reply',
      'Introduction Question',
      'Candidate Introduction Reply',
      'Start The Question Message',
      // Questions and followups
      ...Array.from({ length: 10 }, (_, i) => i + 1).flatMap(num => getQuestionGroup(num)),
      // End message
      'Interview_End'
    ].filter(key => conversation[key]);

    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-800">
              <MessageSquare className="w-5 h-5 text-blue-500" />
              Interview Conversation
            </h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
            {orderedKeys.map(key => {
              if (conversation[key]) {
                const isInterviewer = !key.toLowerCase().includes('candidate');
                const isFeedback = key.includes('Feedback');
                const coverage = conversation[key].match(/Coverage=(\d+)/);
                const displayContent = coverage ? 
                  conversation[key].replace(/Coverage=\d+/, '').trim() : 
                  conversation[key];

                return (
                  <div key={key} 
                    className={`mb-4 rounded-xl ${
                      isFeedback ? 'bg-green-50' : 
                      isInterviewer ? 'bg-blue-50' : 
                      'bg-gray-50'
                    } backdrop-blur-sm`}
                  >
                    <div className="p-4">
                      <div className="flex justify-between items-center mb-2">
                        <div className="text-sm text-gray-600 font-medium">
                          {key.replace(/_/g, ' ')}
                        </div>
                        {coverage && (
                          <div className="px-2 py-1 bg-green-100 text-green-800 text-sm rounded-full">
                            Coverage: {coverage[1]}%
                          </div>
                        )}
                      </div>
                      <div className="text-gray-800 whitespace-pre-wrap">
                        {displayContent}
                      </div>
                    </div>
                  </div>
                );
              }
              return null;
            })}
          </div>
        </div>
      </div>
    );
  };

  const ReviewModal = ({ candidateId, onClose, onSubmit }) => {
    const [reviewText, setReviewText] = useState(reviews[candidateId]?.text || '');

    const handleSubmit = (e) => {
      e.preventDefault();
      onSubmit(candidateId, reviewText);
      onClose();
    };

    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-2xl w-full shadow-xl">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Write Review</h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-6">
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              className="w-full h-40 p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Write your review here..."
              required
            />
            <div className="flex justify-end mt-4 gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Submit Review
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  // Update the loading state
  if (loading) return (
    <div className="min-h-screen w-full bg-white">
      <div className="flex flex-col items-center justify-center h-[calc(100vh-16rem)]">
        <div className="relative w-20 h-20">
          <div className="absolute top-0 left-0 right-0 bottom-0">
            <div className="border-4 border-blue-200 border-t-blue-600 rounded-full w-20 h-20 animate-spin"></div>
          </div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-8 h-8 bg-white rounded-full"></div>
          </div>
        </div>
        <p className="mt-4 text-gray-600 font-medium">Loading...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen w-full bg-white">
      <div className="flex items-center justify-center h-[calc(100vh-16rem)]">
        <div className="text-red-500 bg-red-50 px-4 py-2 rounded-lg">{error}</div>
      </div>
    </div>
  );

  // Create a SortableRanking component
  const SortableRanking = ({ ranking, index, onConversationClick, isTopPerformer, numCandidatesToReport }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
    } = useSortable({ id: ranking.candidateName + ranking.date });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    return (
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        className={`
          bg-white rounded-2xl shadow-sm p-6 
          transition-all cursor-move
          ${index < numCandidatesToReport ? 'border-amber-200 bg-amber-50/50 border-2' : 'border border-gray-100'}
          ${index === numCandidatesToReport - 1 ? 'border-b-4 border-b-gray-300 mb-8' : ''}
          hover:shadow-md
        `}
        onClick={() => onConversationClick(ranking)}
      >
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 ${isTopPerformer ? 'bg-amber-100' : 'bg-blue-100'} rounded-full flex items-center justify-center`}>
              <User className={`w-6 h-6 ${isTopPerformer ? 'text-amber-600' : 'text-blue-600'}`} />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">{ranking.candidateName}</h2>
          </div>
          <div className="flex items-center gap-2 text-gray-500">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">
              {new Date(ranking.date).toLocaleString()}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <h3 className="font-semibold flex items-center gap-2 text-gray-800">
              <Star className="w-5 h-5 text-yellow-500" />
              Performance Scores
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {[
                { 
                  icon: Star, 
                  color: 'text-blue-500', 
                  label: 'Fluency', 
                  value: ranking.interview_performance?.scores?.fluency || 0 
                },
                { 
                  icon: Brain, 
                  color: 'text-purple-500', 
                  label: 'Subject Knowledge', 
                  value: ranking.interview_performance?.scores?.subjectKnowledge || 0 
                },
                { 
                  icon: UserCheck, 
                  color: 'text-green-500', 
                  label: 'Professional Behavior', 
                  value: ranking.interview_performance?.scores?.professionalBehavior || 0 
                },
                { 
                  icon: TrendingUp, 
                  color: 'text-indigo-500', 
                  label: 'Average', 
                  value: ranking.interview_performance?.scores ? 
                    (Object.values(ranking.interview_performance.scores)
                      .reduce((a, b) => Number(a || 0) + Number(b || 0), 0) / 3).toFixed(2) 
                    : "0.00"
                }
              ].map((item, i) => (
                <div key={i} className="col-span-2 md:col-span-1">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                    <div className="flex items-center gap-2">
                      <item.icon className={`w-4 h-4 ${item.color}`} />
                      <span className="text-gray-600">{item.label}</span>
                    </div>
                    <span className="font-semibold text-gray-800">{item.value}/10</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-800">Feedback</h3>
              {isTopPerformer && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentReviewCandidate(ranking.candidateName + ranking.date);
                    setShowReviewModal(true);
                  }}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200"
                >
                  {ranking.interview_performance?.panelReview ? 'Edit Review' : 'Add Review'}
                </button>
              )}
            </div>
            <p className="text-gray-600 leading-relaxed">
              {ranking.interview_performance?.feedback || 'No feedback available'}
            </p>
            {ranking.interview_performance?.panelReview && (
              <div className="mt-4 p-4 bg-blue-50 rounded-xl">
                <h4 className="font-medium text-blue-800 mb-2">Panel Review</h4>
                <p className="text-blue-600">{ranking.interview_performance.panelReview.text}</p>
                <div className="text-sm text-blue-400 mt-1">
                  {new Date(ranking.interview_performance.panelReview.timestamp).toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Update the rankings list section in your main component
  return (
    <div className="min-h-screen w-full bg-white">
      <div className="p-6 max-w-7xl mx-auto">
        <button
          onClick={() => navigate('/panel', { state: { activeTab: 'stats' } })}
          className="mb-6 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Dashboard
        </button>
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold flex items-center gap-3 text-gray-800">
            <TrendingUp className="w-8 h-8 text-blue-500" />
            Interview Analytics - {panelLevel} Level
          </h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-xl border border-gray-200">
              <span className="text-sm font-medium text-gray-600">
                Select candidates:
              </span>
              <div className="flex items-center gap-2">
                {isEditingTopN ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max={sortedRankings.length}
                      value={numCandidatesToReport}
                      onChange={(e) => setNumCandidatesToReport(
                        Math.max(1, Math.min(sortedRankings.length, parseInt(e.target.value) || 1))
                      )}
                      className="w-16 px-2 py-1 border border-blue-500 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-center"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveTopN}
                      className="p-1 hover:bg-blue-100 rounded-full transition-colors"
                    >
                      <CheckCircle2 className="w-5 h-5 text-blue-600" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-blue-600 min-w-[2rem] text-center">
                      {numCandidatesToReport}
                    </span>
                    <button
                      onClick={() => setIsEditingTopN(true)}
                      className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                    >
                      <Settings2 className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => setShowReportConfirm(true)}
              disabled={hasReported}
              className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all duration-200
                ${hasReported 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-green-600 text-white hover:bg-green-700'
                }`}
            >
              <User className="w-5 h-5" />
              {hasReported ? 'Reported to HR' : 'Report to HR'}
            </button>
          </div>
        </div>

        {showReportConfirm && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">Confirm Report to HR</h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to report the top {topN} candidates to HR? This action will mark their interviews for HR review.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowReportConfirm(false)}
                  disabled={isReporting}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-all duration-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReportToHR}
                  disabled={isReporting}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all duration-200 disabled:opacity-50 flex items-center gap-2"
                >
                  {isReporting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Reporting...
                    </>
                  ) : (
                    'Confirm Report'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-xl font-semibold mb-6 text-gray-800">Interview Score Trends</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={rankings.map(r => ({
              ...r,
              scores: r.interview_performance?.scores || { 
                fluency: 0, 
                subjectKnowledge: 0, 
                professionalBehavior: 0 
              }
            }))}>
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => new Date(date).toLocaleDateString()} 
                stroke="#94a3b8"
              />
              <YAxis domain={[0, 10]} stroke="#94a3b8" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="scores.fluency" 
                stroke="#3b82f6" 
                name="Fluency"
                strokeWidth={2}
                dot={{ strokeWidth: 2 }}
              />
              <Line 
                type="monotone" 
                dataKey="scores.subjectKnowledge" 
                stroke="#8b5cf6" 
                name="Subject Knowledge"
                strokeWidth={2}
                dot={{ strokeWidth: 2 }}
              />
              <Line 
                type="monotone" 
                dataKey="scores.professionalBehavior" 
                stroke="#10b981" 
                name="Professional Behavior"
                strokeWidth={2}
                dot={{ strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-xl font-semibold mb-6 text-gray-800">Summary Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-4 bg-gray-50 rounded-xl text-center">
              <h3 className="text-lg font-semibold text-gray-800">Total Attempts</h3>
              <p className="text-2xl font-bold text-blue-600">{rankings.length || 0}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl text-center">
              <h3 className="text-lg font-semibold text-gray-800">Average Score</h3>
              <p className="text-2xl font-bold text-purple-600">
                {rankings.length > 0 ? (
                  (rankings.reduce((acc, ranking) => {
                    const scores = ranking.interview_performance?.scores || { 
                      fluency: 0, 
                      subjectKnowledge: 0, 
                      professionalBehavior: 0 
                    };
                    const sum = Object.values(scores).reduce((a, b) => 
                      Number(a || 0) + Number(b || 0), 0);
                    return acc + (sum / 3);
                  }, 0) / rankings.length).toFixed(2)
                ) : "0.00"}
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl text-center">
              <h3 className="text-lg font-semibold text-gray-800">Success Rate</h3>
              <p className="text-2xl font-bold text-green-600">
                {rankings.length > 0 ? (
                  (rankings.filter(ranking => {
                    const scores = ranking.interview_performance?.scores || { 
                      fluency: 0, 
                      subjectKnowledge: 0, 
                      professionalBehavior: 0 
                    };
                    const avg = Object.values(scores)
                      .reduce((a, b) => Number(a || 0) + Number(b || 0), 0) / 3;
                    return avg >= threshold;
                  }).length / rankings.length * 100).toFixed(2)
                ) : "0.00"}%
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl text-center">
              <h3 className="text-lg font-semibold text-gray-800">Top Performer</h3>
              <p className="text-2xl font-bold text-indigo-600">
                {rankings.length > 0 ? rankings.reduce((top, current) => {
                  const topScores = top.interview_performance?.scores || { 
                    fluency: 0, 
                    subjectKnowledge: 0, 
                    professionalBehavior: 0 
                  };
                  const currentScores = current.interview_performance?.scores || { 
                    fluency: 0, 
                    subjectKnowledge: 0, 
                    professionalBehavior: 0 
                  };
                  
                  const topAvg = Object.values(topScores)
                    .reduce((a, b) => Number(a || 0) + Number(b || 0), 0) / 3;
                  const currentAvg = Object.values(currentScores)
                    .reduce((a, b) => Number(a || 0) + Number(b || 0), 0) / 3;
                  
                  return currentAvg > topAvg ? current : top;
                }).candidateName : 'No attempts yet'}
              </p>
            </div>
          </div>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedRankings.map(r => r.candidateName + r.date)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-6">
              {sortedRankings.map((ranking, index) => (
                <SortableRanking
                  key={ranking.candidateName + ranking.date}
                  ranking={ranking}
                  index={index}
                  isTopPerformer={index < numCandidatesToReport}
                  onConversationClick={fetchConversation}
                  numCandidatesToReport={numCandidatesToReport}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {showModal && (
          <ConversationModal
            conversation={selectedConversation}
            onClose={() => {
              setShowModal(false);
              setSelectedConversation(null);
            }}
          />
        )}
        {showReviewModal && (
          <ReviewModal
            candidateId={currentReviewCandidate}
            onClose={() => {
              setShowReviewModal(false);
              setCurrentReviewCandidate(null);
            }}
            onSubmit={async (candidateId, text) => {
              try {
                const ranking = sortedRankings.find(
                  r => r.candidateName + r.date === candidateId
                );
        
                if (!ranking) throw new Error('Ranking not found');
        
                const review = {
                  text,
                  timestamp: new Date().toISOString()
                };
        
                const response = await fetch(`http://localhost:5005/update-panel-review`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    candidateName: ranking.candidateName,
                    date: ranking.date,
                    review,
                    postId: postId // Use postId from params
                  })
                });
        
                if (!response.ok) {
                  const errorData = await response.json();
                  throw new Error(errorData.error || 'Failed to save review');
                }
        
                // Update the rankings state with the new review
                setSortedRankings(prevRankings => 
                  prevRankings.map(r => {
                    if (r.candidateName + r.date === candidateId) {
                      return {
                        ...r,
                        interview_performance: {
                          ...r.interview_performance,
                          panelReview: review
                        }
                      };
                    }
                    return r;
                  })
                );
        
                // Also update the reviews state
                setReviews(prev => ({
                  ...prev,
                  [candidateId]: review
                }));
        
                toast.success('Review saved successfully');
              } catch (error) {
                console.error('Error saving review:', error);
                toast.error(error.message || 'Failed to save review');
              }
            }}
          />
        )}
        <Toaster/>
      </div>
    </div>
  );
};