import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { Book, User, Calendar, CheckCircle2, XCircle, X, ChevronRight, ChevronLeft, Settings2 } from 'lucide-react';
import toast, { Toaster } from "react-hot-toast";
import { useParams, useNavigate } from 'react-router-dom';
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

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${className}`}>
    {children}
  </div>
);

const ResultModal = ({ result, onClose }) => {
  if (!result) return null;

  const calculateStats = (mcqResponses) => {
    const correct = mcqResponses.filter(a => a.selectedAnswer === a.correctAnswer).length;
    return {
      correct,
      incorrect: mcqResponses.length - correct,
      percentage: ((correct / mcqResponses.length) * 100).toFixed(1)
    };
  };

  const stats = calculateStats(result.mcqResponses);
  const pieData = [
    { name: 'Correct', value: stats.correct },
    { name: 'Incorrect', value: stats.incorrect }
  ];
  const COLORS = ['#10b981', '#ef4444'];

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0">
          <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-800">
            <Book className="w-5 h-5 text-blue-500" />
            MCQ Results - {result.candidateName}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="flex flex-col justify-center space-y-4">
              <div className="text-2xl font-bold text-gray-800">
                Score: {stats.percentage}%
              </div>
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="w-5 h-5" />
                <span>Correct Answers: {stats.correct}</span>
              </div>
              <div className="flex items-center gap-2 text-red-600">
                <XCircle className="w-5 h-5" />
                <span>Incorrect Answers: {stats.incorrect}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {result.mcqResponses.map((response, index) => (
              <div
                key={index}
                className={`p-4 rounded-xl ${
                  response.selectedAnswer === response.correctAnswer
                    ? 'bg-green-50'
                    : 'bg-red-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {response.selectedAnswer === response.correctAnswer ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-800 mb-2">
                      {index + 1}. {response.question}
                    </p>
                    <div className="space-y-1 text-sm">
                      <p className="flex items-center gap-2">
                        <span className="text-gray-600">Selected:</span>
                        <span className={response.selectedAnswer === response.correctAnswer ? 'text-green-600' : 'text-red-600'}>
                          {response.selectedAnswer}
                        </span>
                      </p>
                      {response.selectedAnswer !== response.correctAnswer && (
                        <p className="flex items-center gap-2">
                          <span className="text-gray-600">Correct:</span>
                          <span className="text-green-600">{response.correctAnswer}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Create a SortableResult component
const SortableResult = ({ result, index, onResultClick, topN }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: result.candidateId.toString() });

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
        ${index < topN ? 'border-amber-200 bg-amber-50/50 border-2' : 'border border-gray-100'}
        ${index === topN - 1 ? 'border-b-4 border-b-gray-300 mb-8' : ''}
        hover:shadow-md transition-all cursor-move
      `}
    >
      <div className="flex justify-between items-center">
        <div 
          className="flex-1 cursor-pointer" 
          onClick={() => onResultClick(result)}
        >
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 ${index < topN ? 'bg-amber-100' : 'bg-blue-100'} rounded-full flex items-center justify-center`}>
              <User className={`w-6 h-6 ${index < topN ? 'text-amber-600' : 'text-blue-600'}`} />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-800">
                {result.candidateName}
              </h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Calendar className="w-4 h-4" />
                  <span>{new Date(result.date).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-gray-100 px-2 py-1 rounded-md">
                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium">
                      {result.mcqResponses.filter(r => r.selectedAnswer === r.correctAnswer).length}
                      <span className="text-gray-400">/</span>
                      {result.mcqResponses.length}
                    </span>
                  </div>
                  <div className={`px-2 py-1 rounded-md text-sm font-medium ${
                    ((result.mcqResponses.filter(r => r.selectedAnswer === r.correctAnswer).length / result.mcqResponses.length) * 100) >= 70
                      ? 'bg-green-100 text-green-700'
                      : ((result.mcqResponses.filter(r => r.selectedAnswer === r.correctAnswer).length / result.mcqResponses.length) * 100) >= 50
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                  }`}>
                    {((result.mcqResponses.filter(r => r.selectedAnswer === r.correctAnswer).length / result.mcqResponses.length) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="cursor-move p-2">
          <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </div>
      </div>
    </div>
  );
};

// Update the ResultsList component
const ResultsList = ({ results, onResultClick, setResults, topN }) => {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = results.findIndex(item => item.candidateId.toString() === active.id);
      const newIndex = results.findIndex(item => item.candidateId.toString() === over.id);
      setResults(arrayMove(results, oldIndex, newIndex));
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={results.map(r => r.candidateId.toString())}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-6">
          {results.map((result, index) => (
            <SortableResult
              key={result.candidateId.toString()}
              result={result}
              index={index}
              onResultClick={onResultClick}
              topN={topN}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
};

export const MCQRankings = () => {
  const { postId } = useParams(); // Get postId from URL params
  const [mcqResults, setMcqResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedResult, setSelectedResult] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [sortedResults, setSortedResults] = useState([]);
  const [showReportConfirm, setShowReportConfirm] = useState(false);
  const [hasReported, setHasReported] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [panelLevel, setPanelLevel] = useState(null);
  const [numCandidatesToReport, setNumCandidatesToReport] = useState(() => {
    // Try to get saved value from localStorage, default to 1 if not found
    return parseInt(localStorage.getItem('topCandidatesCount')) || 1;
  });
  const [isEditingTopN, setIsEditingTopN] = useState(false); // Add this state for editing mode
  const username = localStorage.getItem("username");
  const navigate = useNavigate();

  const getPanelLevel = (username) => {
    switch(username) {
      case 'panel_user4': return 'Beginner';
      case 'panel_user5': return 'Intermediate';
      case 'panel_user': return 'Advanced';
      default: return null;
    }
  };

  const toast_during_mcq = 'mcq-warning';
  const TOP_PERFORMER_THRESHOLD = 3; // Number of top performers to highlight

  useEffect(() => {
    const fetchMCQResults = async () => {
      try {
        console.log('Fetching MCQ results for post:', postId);
        const response = await fetch(`http://localhost:5005/get-mcq-results/${postId}`);
        if (!response.ok) throw new Error('Failed to fetch MCQ results');
        
        const data = await response.json();
        console.log('Raw MCQ results:', data);

        // Filter results based on the panel level instead of hardcoding to Beginner
        const filteredResults = data.filter(result => 
          result.candidateLevel === panelLevel // Use panelLevel state instead of hardcoding
        );

        console.log(`Filtered results for ${panelLevel} level:`, filteredResults);
        setMcqResults(filteredResults);

      } catch (err) {
        console.error('Error:', err);
        toast.error('Error occurred while fetching MCQ results.');
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (postId && panelLevel) { // Add panelLevel dependency
      fetchMCQResults();
    }
  }, [postId, panelLevel]); // Add panelLevel to dependency array

  useEffect(() => {
    if (mcqResults.length > 0) {
      const sorted = [...mcqResults].sort((a, b) => {
        const scoreA = calculateAverage(a.mcqResponses);
        const scoreB = calculateAverage(b.mcqResponses);
        return scoreB - scoreA;
      });
      setSortedResults(sorted);
    }
  }, [mcqResults]);

  // Add this to the existing useEffect or create a new one
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

  const calculateAverage = (responses) => {
    if (!responses || responses.length === 0) return 0;
    const correct = responses.filter(r => r.selectedAnswer === r.correctAnswer).length;
    return (correct / responses.length) * 100;
  };

  const prepareChartData = () => {
    return mcqResults.map(result => {
      const correctCount = result.mcqResponses.filter(a => a.selectedAnswer === a.correctAnswer).length;
      const totalQuestions = result.mcqResponses.length;
      return {
        name: result.candidateName,
        date: new Date(result.date).toLocaleDateString(),
        score: ((correctCount / totalQuestions) * 100).toFixed(1),
        correct: correctCount,
        total: totalQuestions
      };
    });
  };

  const preparePerformanceGroups = () => {
    if (mcqResults.length === 0) {
      return [
        { name: 'Excellent', count: 0, percentage: "0.0" },
        { name: 'Very Good', count: 0, percentage: "0.0" },
        { name: 'Good', count: 0, percentage: "0.0" },
        { name: 'Fair', count: 0, percentage: "0.0" },
        { name: 'Poor', count: 0, percentage: "0.0" }
      ];
    }
  
    const groups = mcqResults.reduce((acc, result) => {
      const correctCount = result.mcqResponses.filter(a => a.selectedAnswer === a.correctAnswer).length;
      const score = (correctCount / result.mcqResponses.length) * 100;
      
      if (score >= 90) acc[0].count++;
      else if (score >= 80) acc[1].count++;
      else if (score >= 70) acc[2].count++;
      else if (score >= 60) acc[3].count++;
      else acc[4].count++;
      
      return acc;
    }, [
      { name: 'Excellent', count: 0 },
      { name: 'Very Good', count: 0 },
      { name: 'Good', count: 0 },
      { name: 'Fair', count: 0 },
      { name: 'Poor', count: 0 }
    ]);
  
    const total = groups.reduce((sum, group) => sum + group.count, 0);
    groups.forEach(group => {
      group.percentage = ((group.count / total) * 100).toFixed(1);
    });

    return groups;
  };

  const prepareRadarData = () => {
    if (mcqResults.length === 0) return [];

    const subjectPerformance = mcqResults.reduce((acc, result) => {
      result.mcqResponses.forEach(response => {
        if (!acc[response.subject]) {
          acc[response.subject] = {
            correct: 0,
            total: 0
          };
        }
        acc[response.subject].total++;
        if (response.selectedAnswer === response.correctAnswer) {
          acc[response.subject].correct++;
        }
      });
      return acc;
    }, {});

    return Object.entries(subjectPerformance).map(([subject, data]) => ({
      subject,
      score: ((data.correct / data.total) * 100).toFixed(1)
    }));
  };

  const handleReportToHR = async () => {
    try {
      setIsReporting(true);
      const topCandidates = sortedResults.slice(0, numCandidatesToReport);
      
      if (topCandidates.length === 0) {
        toast.error("No candidates to report");
        return;
      }

      const response = await fetch("http://localhost:5005/report-to-hr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: parseInt(postId, 10),
          candidateIds: topCandidates.map(c => parseInt(c.candidateId, 10)),
          level: panelLevel
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
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-red-500 bg-red-50 px-4 py-2 rounded-lg">{error}</div>
    </div>
  );

  const chartData = prepareChartData();
  const radarData = prepareRadarData();

  const summary = mcqResults.reduce((acc, result) => {
    const correctCount = result.mcqResponses.filter(a => a.selectedAnswer === a.correctAnswer).length;
    const score = result.mcqResponses.length > 0 
      ? (correctCount / result.mcqResponses.length) * 100 
      : 0;
  
    acc.totalAttempts++;
    acc.totalQuestions += result.mcqResponses.length;
    acc.totalCorrect += correctCount;
    acc.scores.push(score);
  
    if (score > acc.highestScore) {
      acc.highestScore = score;
      acc.topPerformer = `${result.candidateName}`;
    }
  
    return acc;
  }, {
    totalAttempts: 0,
    totalQuestions: 0,
    totalCorrect: 0,
    scores: [],
    highestScore: 0,
    topPerformer: 'No candidates yet' // Changed from 'No attempts yet'
  });

  // Calculate average score
  summary.averageScore = summary.totalQuestions > 0 
    ? ((summary.totalCorrect / summary.totalQuestions) * 100).toFixed(1) 
    : "0.0";
  
  // Calculate success rate - candidates who scored 70% or above
  summary.successRate = mcqResults.length > 0 
    ? ((mcqResults.filter(result => {
        const correctCount = result.mcqResponses.filter(a => a.selectedAnswer === a.correctAnswer).length;
        const score = (correctCount / result.mcqResponses.length) * 100;
        return score >= 70; // Using 70 as threshold
      }).length / mcqResults.length) * 100).toFixed(1)
    : "0.0";

  const handleSaveTopN = () => { // Add this function to handle saving the new value
    setIsEditingTopN(false);
    // Optional: Save to localStorage to persist the value
    localStorage.setItem('topCandidatesCount', numCandidatesToReport.toString());
  };

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
            <Book className="w-8 h-8 text-blue-500" />
            MCQ Rankings - {panelLevel} Level
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
                      max={sortedResults.length}
                      value={numCandidatesToReport}
                      onChange={(e) => setNumCandidatesToReport(
                        Math.max(1, Math.min(sortedResults.length, parseInt(e.target.value) || 1))
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

        {/* Add confirmation dialog */}
        {showReportConfirm && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
              <h2 className="text-2xl font-bold mb-4 text-gray-800">Confirm Report to HR</h2>
              <p className="text-gray-600 mb-6">
                Are you sure you want to report the top {numCandidatesToReport} candidate{numCandidatesToReport > 1 ? 's' : ''} to HR? 
                This action will mark their interviews for HR review.
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card>
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Score Trends</h2>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="#3b82f6"
                      name="Score (%)"
                      strokeWidth={2}
                      dot={{ strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </Card>

          <Card>
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Score Distribution</h2>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={preparePerformanceGroups()}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      labelLine={false}
                      label={({ name, percentage, cx, cy, midAngle, innerRadius, outerRadius, value }) => {
                        const RADIAN = Math.PI / 180;
                        const radius = outerRadius + 25;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        
                        return value > 0 ? (
                          <text
                            x={x}
                            y={y}
                            fill="#374151"
                            textAnchor={x > cx ? 'start' : 'end'}
                            dominantBaseline="central"
                            className="text-sm"
                          >
                            {`${name} (${percentage}%)`}
                          </text>
                        ) : null;
                      }}
                    >
                      {preparePerformanceGroups().map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={
                            index === 0 ? '#22c55e' :
                            index === 1 ? '#3b82f6' :
                            index === 2 ? '#a855f7' :
                            index === 3 ? '#f59e0b' :
                            '#ef4444'
                          }
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name, props) => [
                        `${value} attempts (${props.payload.percentage}%)`,
                        name
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="flex flex-wrap justify-center gap-4 mt-4">
              {preparePerformanceGroups().map((entry, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: 
                          index === 0 ? '#22c55e' :
                          index === 1 ? '#3b82f6' :
                          index === 2 ? '#a855f7' :
                          index === 3 ? '#f59e0b' :
                          '#ef4444'
                      }}
                    />
                    <span className="text-sm text-gray-600">{entry.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Summary Statistics Cards */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-8">
          <h2 className="text-xl font-semibold mb-6 text-gray-800">Summary Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-4 bg-gray-50 rounded-xl text-center">
              <h3 className="text-lg font-semibold text-gray-800">Total Attempts</h3>
              <p className="text-2xl font-bold text-blue-600">{summary.totalAttempts}</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl text-center">
              <h3 className="text-lg font-semibold text-gray-800">Average Score</h3>
              <p className="text-2xl font-bold text-purple-600">
                {summary.averageScore}%
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl text-center">
              <h3 className="text-lg font-semibold text-gray-800">Success Rate</h3>
              <p className="text-2xl font-bold text-green-600">
                {summary.successRate}%
              </p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl text-center">
              <h3 className="text-lg font-semibold text-gray-800">Top Performer</h3>
              <p className="text-2xl font-bold text-indigo-600">
                {summary.topPerformer}
              </p>
            </div>
          </div>
        </div>

        {/* Results List */}
        <div className="space-y-6 mb-8">
          <ResultsList
            results={sortedResults}
            onResultClick={(result) => {
              setSelectedResult(result);
              setShowModal(true);
            }}
            setResults={setSortedResults}
            topN={numCandidatesToReport} // Pass the number of candidates to highlight
          />
        </div>

        {showModal && (
          <ResultModal
            result={selectedResult}
            onClose={() => {
              setShowModal(false);
              setSelectedResult(null);
            }}
          />
        )}
        <Toaster/>
      </div>
    </div>
  );
};
