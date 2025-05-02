import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  User, 
  Calendar, 
  X, 
  Star, 
  Brain, 
  MessageSquare, 
  Book, 
  CheckCircle2, 
  XCircle,
  TrendingUp,
  UserCheck,
  Plus,
  AlertTriangle,
  ArrowLeft,
  CheckCircle, 
  Percent 
} from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

const categories = ['Angular', 'C#', 'Django', 'Express.js', 'Flask', 'Go', 'Java', 'JavaScript', 'MySQL/PostgreSQL', 'MongoDB/Cassandra (NoSQL databases)', 'Node.js', 'Python', 'React', 'Ruby', 'Spring Boot'];
const examTypes = ['Interview', 'MCQ'];

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${className}`}>
    {children}
  </div>
);

export const HrVerifyCandidates = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState({ mcq: [], interview: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCandidates, setSelectedCandidates] = useState(new Set());
  const [isPostCreated, setIsPostCreated] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [interviewStage, setInterviewStage] = useState(0);
  const [newPostFormData, setNewPostFormData] = useState({
    title: '',
    description: '',
    category: '',
    followupCount: '',
    totalTime: '',
    coverageNeeded: '',
    examType: '',
    applicationDeadline: '',
    testStartDate: '',
    panelBeginner: '',
    panelIntermediate: '',
    panelAdvanced: ''
  });
  const [conversations, setConversations] = useState([]);
  const [rankings, setRankings] = useState([]);
  const [mcqResults, setMcqResults] = useState([]);
  const [selectedMcqResponse, setSelectedMcqResponse] = useState(null);
  const [showMcqModal, setShowMcqModal] = useState(false);
  const [selectedMcqResult, setSelectedMcqResult] = useState(null);
  const [postExamType, setPostExamType] = useState(null);
  const [showConversationModal, setShowConversationModal] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [showEndRecruitmentConfirm, setShowEndRecruitmentConfirm] = useState(false);
  const [isEndingRecruitment, setIsEndingRecruitment] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    minExperience: '',
    category: '',
    followupCount: '',
    totalTime: '',
    coverageNeeded: '',
    examType: '',
    applicationDeadline: '',
    testStartDate: '',
    panelBeginner: '',
    panelIntermediate: '',
    panelAdvanced: ''
  });

  const [panelMembers, setPanelMembers] = useState([]);

  // Add this with other state declarations at the top of the component
const [isCreatingLevel, setIsCreatingLevel] = useState(false);

// Add this state at the top of your component with other state declarations
const [isSubmitting, setIsSubmitting] = useState(false);

  // Add the getUnselectedCount function here
  const getUnselectedCount = () => {
    if (!candidates || (!candidates.mcq && !candidates.interview)) {
      return 0;
    }
    const allCandidates = [...(candidates.mcq || []), ...(candidates.interview || [])];
    return allCandidates.filter(c => !selectedCandidates.has(c.interview_id)).length;
  };

  // Don't forget to fetch panel members when component mounts
  useEffect(() => {
    const fetchPanelMembers = async () => {
      try {
        const response = await fetch('http://localhost:5010/panel-members');
        if (!response.ok) throw new Error('Failed to fetch panel members');
        const data = await response.json();
        setPanelMembers(data);
      } catch (error) {
        console.error('Error fetching panel members:', error);
        toast.error('Failed to fetch panel members');
      }
    };

    fetchPanelMembers();
  }, []);

  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const fetchCandidates = async () => {
      setLoading(true);
      try {
        const response = await fetch(`http://localhost:5005/get-reportable-candidates/${postId}`);
        if (!response.ok) throw new Error('Failed to fetch candidates');
        const data = await response.json();
        
        // Set selected candidates based on database values
        const selectedIds = new Set([
          ...data.mcq.filter(c => c.selected === 'yes').map(c => c.interview_id),
          ...data.interview.filter(c => c.selected === 'yes').map(c => c.interview_id)
        ]);
        
        setCandidates(data);
        setSelectedCandidates(selectedIds);

      } catch (err) {
        setError(err.message);
        toast.error('Error fetching candidates');
      } finally {
        setLoading(false);
      }
    };

    fetchCandidates();
  }, [postId]);

  // Update the useEffect for checking recruitment status
  useEffect(() => {
    const checkRecruitmentStatus = async () => {
      try {
        const response = await fetch(`http://localhost:5005/check-recruitment-status/${postId}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to check recruitment status');
        }
        const data = await response.json();
        setIsPostCreated(data.isCompleted); // Use isCompleted to control both buttons
      } catch (err) {
        console.error('Status check error:', err);
        toast.error('Failed to check recruitment status');
      }
    };

    checkRecruitmentStatus();
  }, [postId]);

  // Add useEffect to get interview stage
  useEffect(() => {
    const fetchInterviewStage = async () => {
      try {
        const response = await fetch(`http://localhost:5005/get-interview-stage/${postId}`);
        if (!response.ok) throw new Error('Failed to fetch interview stage');
        const data = await response.json();
        setInterviewStage(data.stage);
      } catch (err) {
        console.error('Error fetching interview stage:', err);
      }
    };

    fetchInterviewStage();
  }, [postId]);

  // Update the useEffect for fetching data
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch conversations
        const conversationsResponse = await fetch(`http://localhost:5005/get-conversation/${postId}`);
        if (conversationsResponse.ok) {
          const conversationsData = await conversationsResponse.json();
          setConversations(Array.isArray(conversationsData) ? conversationsData : [conversationsData]);
        }

        // Fetch rankings
        const rankingsResponse = await fetch(`http://localhost:5005/get-rankings/${postId}`);
        if (rankingsResponse.ok) {
          const rankingsData = await rankingsResponse.json();
          setRankings(Array.isArray(rankingsData) ? rankingsData : [rankingsData]);
        }

        // Fetch MCQ results
        const mcqResponse = await fetch(`http://localhost:5005/get-mcq-results/${postId}`);
        if (mcqResponse.ok) {
          const mcqData = await mcqResponse.json();
          setMcqResults(Array.isArray(mcqData) ? mcqData : [mcqData]);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, [postId]);

// Update the existing useEffect for fetching post details
useEffect(() => {
  const fetchPostDetails = async () => {
    try {
      const response = await fetch(`http://localhost:5010/posts/${postId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch post details');
      }
      const data = await response.json();
      setPostExamType(data.exam_type);
      setInterviewStage(data.post_stage || 1); // Add this line to set the stage
      console.log('Post details:', data); // Debug log
    } catch (err) {
      console.error('Error fetching post details:', err);
      toast.error('Failed to fetch post details');
    }
  };

  fetchPostDetails();
}, [postId]);

  // Modify the handleCheckboxChange function
  const handleCheckboxChange = (interviewId) => {
    console.log('Checkbox changed for interview ID:', interviewId); // Debug log
    setSelectedCandidates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(interviewId)) {
        newSet.delete(interviewId);
      } else {
        newSet.add(interviewId);
      }
      console.log('Updated selected candidates:', Array.from(newSet)); // Debug log
      return newSet;
    });
  };

  // Update the handleSelect function
const handleSelect = () => {
  // Update local state only
  setCandidates(prev => ({
    mcq: prev.mcq?.map(candidate => ({
      ...candidate,
      selected: selectedCandidates.has(candidate.interview_id) ? 'yes' : candidate.selected
    })) || [],
    interview: prev.interview?.map(candidate => ({
      ...candidate,
      selected: selectedCandidates.has(candidate.interview_id) ? 'yes' : candidate.selected
    })) || []
  }));
  
  // Clear selections after updating
  setSelectedCandidates(new Set());
  toast.success('Candidates marked as selected');
};

  // Update handleDeselect function for consistency
const handleDeselect = () => {
  // Update local state only
  setCandidates(prev => ({
    mcq: prev.mcq?.map(candidate => ({
      ...candidate,
      selected: selectedCandidates.has(candidate.interview_id) ? 'no' : candidate.selected
    })) || [],
    interview: prev.interview?.map(candidate => ({
      ...candidate,
      selected: selectedCandidates.has(candidate.interview_id) ? 'no' : candidate.selected
    })) || []
  }));
  
  // Clear selections after updating
  setSelectedCandidates(new Set());
  toast.success('Candidates deselected successfully');
};

  // Simplify handleEndRecruitment to just show confirmation modal
const handleEndRecruitment = () => {
  setShowEndRecruitmentConfirm(true);
};

// Remove validation from confirmEndRecruitment
const confirmEndRecruitment = async () => {
  setIsEndingRecruitment(true);
  try {
    // Get all candidates with their selected status
    const allCandidates = [
      ...(candidates.mcq || []),
      ...(candidates.interview || [])
    ];

    // End recruitment and update database
    const endRecruitmentResponse = await fetch('http://localhost:5005/end-recruitment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        postId: parseInt(postId),
        selectedCandidates: allCandidates
          .filter(candidate => candidate.selected === 'yes')
          .map(candidate => candidate.interview_id)
      })
    });

    if (!endRecruitmentResponse.ok) {
      const errorData = await endRecruitmentResponse.json();
      throw new Error(errorData.error || 'Failed to end recruitment');
    }

    // Delete the post
    const deleteResponse = await fetch(`http://localhost:5010/delete-post/${postId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!deleteResponse.ok) {
      throw new Error('Failed to delete post');
    }

    // Close modal and update state
    setIsPostCreated(true);
    setShowEndRecruitmentConfirm(false);
    
    toast.success('Recruitment process completed and emails sent!');
    
    // Short delay to ensure toast is visible
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    navigate('/hrpost', { 
      state: { 
        activeTab: 'verify-candidates',
        refreshData: true
      },
      replace: true 
    });

  } catch (err) {
    console.error('Error ending recruitment:', err);
    toast.error(err.message || 'Failed to end recruitment process');
  } finally {
    setIsEndingRecruitment(false);
  }
};

  // Update handleNewRecruitment function
  const handleNewRecruitment = () => {
    // Count selected candidates (those marked as 'yes')
    const selectedCount = [
      ...(candidates.mcq || []),
      ...(candidates.interview || [])
    ].filter(candidate => candidate.selected === 'yes').length;

    // Check if at least 2 candidates are marked as selected
    if (selectedCount < 2) {
      toast.error('Please select at least 2 candidates to proceed with new recruitment level');
      return;
    }

    // Reset the form data before opening the modal
    setFormData({
      title: '',
      description: '',
      minExperience: '',
      category: '',
      followupCount: '',
      totalTime: '',
      coverageNeeded: '',
      examType: '',
      applicationDeadline: '',
      testStartDate: '',
      panelBeginner: '',
      panelIntermediate: '',
      panelAdvanced: ''
    });
    setIsCreateModalOpen(true);
  };

  // Add handler for post creation completion
  const handlePostCreationComplete = () => {
    setIsCreateModalOpen(false);
    setIsPostCreated(true);
    toast.success('New recruitment process started');
  };

  // Add helper function for form input handling
  const handleNewPostInputChange = (e) => {
    const { name, value } = e.target;
    let validatedValue = value;
  
    if (name === 'examType' && value === 'MCQ') {
      setNewPostFormData(prev => ({
        ...prev,
        [name]: value,
        followupCount: '',
        coverageNeeded: ''
      }));
      return;
    }
  
    const numericFields = ['minExperience', 'followupCount', 'totalTime', 'coverageNeeded'];
    if (numericFields.includes(name)) {
      if (!/^\d*$/.test(value)) return;
      const numValue = parseInt(value) || 0;
      switch (name) {
        case 'minExperience':
          validatedValue = Math.min(Math.max(0, numValue), 50);
          break;
        case 'followupCount':
          validatedValue = Math.min(Math.max(0, numValue), 10);
          break;
        case 'totalTime':
          validatedValue = Math.min(Math.max(1, numValue), 300);
          break;
        case 'coverageNeeded':
          validatedValue = Math.min(Math.max(0, numValue), 100);
          break;
        default:
          break;
      }
    }
  
    setNewPostFormData(prev => ({
      ...prev,
      [name]: validatedValue
    }));
  };

  // Update the handleNewPostSubmit function
const handleNewPostSubmit = async (e) => {
  e.preventDefault();
  setIsSubmitting(true);
  try {
    // Get all candidates with their current selection status
    const allCandidates = [
      ...(candidates.mcq || []),
      ...(candidates.interview || [])
    ];

    const selectedCandidateIds = allCandidates
      .filter(c => c.selected === 'yes')
      .map(c => c.candidate_id);

    // Create new post first
    const createPostResponse = await fetch('http://localhost:5010/save-post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: formData.title,
        description: formData.description,
        minimum_experience: formData.minExperience,
        category: formData.category,
        exam_type: formData.examType,
        followup: formData.followupCount,
        coverage: formData.coverageNeeded,
        time: formData.totalTime,
        application_deadline: formData.applicationDeadline,
        test_start_date: formData.testStartDate,
        panel_members: [
          formData.panelBeginner,
          formData.panelIntermediate,
          formData.panelAdvanced
        ].filter(Boolean),
        post_stage: interviewStage + 1
      })
    });

    if (!createPostResponse.ok) {
      throw new Error('Failed to create new post');
    }

    const newPost = await createPostResponse.json();

    // Update candidates and send emails
    const updateResponse = await fetch('http://localhost:5000/update-candidates-new-recruitment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        selectedCandidates: selectedCandidateIds,
        newPostId: newPost.post_id,
        oldPostId: postId,
        title: formData.title,
        stage: interviewStage + 1
      })
    });

    if (!updateResponse.ok) {
      throw new Error('Failed to update candidates');
    }

    toast.success('New recruitment stage created successfully');
    setIsCreateModalOpen(false);
    navigate('/hrpost', { 
      state: { activeTab: 'verify-candidates' },
      replace: true 
    });

  } catch (err) {
    console.error('Error in new recruitment:', err);
    toast.error(err.message || 'Failed to start new recruitment');
  } finally {
    setIsSubmitting(false);
  }
};

  // Add this useEffect to check localStorage on component mount
  useEffect(() => {
    const isCompleted = localStorage.getItem(`post_${postId}_completed`) === 'true';
    setIsPostCreated(isCompleted);
  }, [postId]);

  // First, remove the MCQ responses from renderResultCards()
const renderResultCards = () => (
  <div className="space-y-4">
    {rankings?.map((ranking, index) => (
      <div
        key={index}
        className="bg-white rounded-2xl shadow-sm border p-6 hover:shadow-md transition-all cursor-pointer"
        onClick={() => {
          setSelectedConversation(conversations.find(c => 
            c.candidateId === ranking.candidateId
          ));
          setShowConversationModal(true);
        }}
      >
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-6 h-6 text-blue-600" />
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
                { icon: Star, color: 'text-blue-500', label: 'Fluency', value: ranking.scores.fluency },
                { icon: Brain, color: 'text-purple-500', label: 'Subject Knowledge', value: ranking.scores.subjectKnowledge },
                { icon: UserCheck, color: 'text-green-500', label: 'Professional Behavior', value: ranking.scores.professionalBehavior },
                { icon: TrendingUp, color: 'text-indigo-500', label: 'Average', value: (Object.values(ranking.scores).reduce((a, b) => a + b, 0) / 3).toFixed(2) }
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
            </div>
            <p className="text-gray-600 leading-relaxed">{ranking.feedback}</p>
            {ranking.panelReview && (
              <div className="mt-4 p-4 bg-blue-50 rounded-xl">
                <h4 className="font-medium text-blue-800 mb-2">Panel Review</h4>
                <p className="text-blue-600">{ranking.panelReview.text}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    ))}

    {/* Conversation Modal */}
    {showConversationModal && (
      <ConversationModal
        conversation={selectedConversation}
        onClose={() => {
          setShowConversationModal(false);
          setSelectedConversation(null);
        }}
      />
    )}
  </div>
);

// Update the ConversationModal component
const ConversationModal = ({ conversation, onClose }) => {
  if (!conversation) return null;

  // Helper function to get message type and style
  const getMessageStyle = (key) => {
    if (key.toLowerCase().includes('feedback')) {
      return {
        containerClass: 'bg-green-50 border-green-100',
        textClass: 'text-green-800',
        icon: <MessageSquare className="w-4 h-4 text-green-500" />
      };
    } else if (key.toLowerCase().includes('candidate')) {
      return {
        containerClass: 'bg-blue-50 border-blue-100',
        textClass: 'text-blue-800',
        icon: <User className="w-4 h-4 text-blue-500" />
      };
    } else {
      return {
        containerClass: 'bg-purple-50 border-purple-100',
        textClass: 'text-purple-800',
        icon: <Brain className="w-4 h-4 text-purple-500" />
      };
    }
  };

  // Create ordered entries with correct sequence
  const messageGroups = [
    {
      title: 'Introduction',
      keys: ['Welcome Message', 'Candidate Welcome Reply', 'Introduction Question', 'Candidate Introduction Reply']
    },
    {
      title: 'Technical Assessment',
      keys: Array.from({ length: 10 }, (_, i) => i + 1).flatMap(num => [
        `Question ${num}`,
        `Candidate Answer ${num}`,
        `Question_Feedback ${num}`,
        `Followup_Question ${num}`,
        `Candidate Followup_Answer ${num}`,
        `Followup_Question_Feedback ${num}`
      ]).filter(key => conversation[key])
    },
    {
      title: 'Conclusion',
      keys: ['Interview_End']
    }
  ];

  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden shadow-xl relative">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <MessageSquare className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Interview Conversation</h2>
                <p className="text-sm text-gray-500">Technical Assessment Review</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Conversation Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
            {messageGroups.map((group, groupIndex) => (
              <div key={groupIndex} className="mb-8 last:mb-0">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  {group.title}
                  <div className="h-px flex-1 bg-gray-200 ml-4" />
                </h3>
                <div className="space-y-4">
                  {group.keys.map(key => {
                    if (!conversation[key]) return null;
                    const { containerClass, textClass, icon } = getMessageStyle(key);
                    const coverage = conversation[key].match(/Coverage=(\d+)/);
                    const displayContent = coverage ? 
                      conversation[key].replace(/Coverage=\d+/, '').trim() : 
                      conversation[key];

                    return (
                      <div 
                        key={key} 
                        className={`rounded-xl border p-4 transition-all hover:shadow-md ${containerClass}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-white rounded-lg shadow-sm">
                            {icon}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium text-gray-700">
                                {key.replace(/_/g, ' ')}
                              </h4>
                              {coverage && (
                                <span className="px-2 py-1 bg-white text-green-700 text-sm rounded-full font-medium shadow-sm">
                                  Coverage: {coverage[1]}%
                                </span>
                              )}
                            </div>
                            <p className={`whitespace-pre-wrap ${textClass}`}>
                              {displayContent}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

  // Update the fetchMcqResponse function
const fetchMcqResponse = async (candidate) => {
  try {
    console.log('Fetching MCQ response for candidate:', candidate);
    const response = await fetch(`http://localhost:5005/get-mcq-results/${postId}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch MCQ responses');
    }
    
    const results = await response.json();
    console.log('All MCQ results:', results);

    // Find the result for this specific candidate
    const candidateResult = results.find(r => 
      parseInt(r.candidateId) === candidate.candidate_id
    );

    if (!candidateResult || !candidateResult.mcqResponses) {
      throw new Error('No MCQ responses found for this candidate');
    }

    setSelectedMcqResponse(candidateResult);
    setShowMcqModal(true);
  } catch (err) {
    console.error('Error fetching MCQ responses:', err);
    toast.error('Error loading MCQ responses');
  }
};

  const McqResponseModal = ({ response, onClose }) => {
    if (!response) return null;
  
    return (
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden shadow-xl">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-800">
              <Brain className="w-5 h-5 text-blue-500" />
              MCQ Responses - {response.candidateName}
            </h2>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
            <div className="space-y-4">
              {response.mcqResponses.map((mcq, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-xl">
                  <p className="font-medium text-gray-700 mb-2">{mcq.question}</p>
                  <div className="ml-4 space-y-1">
                    <p className={`${mcq.selectedAnswer === mcq.correctAnswer ? 'text-green-600' : 'text-red-600'}`}>
                      Selected: {mcq.selectedAnswer}
                    </p>
                    {mcq.selectedAnswer !== mcq.correctAnswer && (
                      <p className="text-green-600">Correct: {mcq.correctAnswer}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Add this custom tooltip component
const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2 shadow-lg rounded-lg border border-gray-200">
        <p className={`${payload[0].name === 'Correct' ? 'text-green-600' : 'text-red-600'} font-medium`}>
          {payload[0].name}: {payload[0].value}
        </p>
      </div>
    );
  }
  return null;
};

  // Update the ResultModal component
const ResultModal = ({ result, onClose }) => {
  if (!result) return null;

  const calculateStats = (mcqResponses) => {
    const correct = mcqResponses.filter(r => r.selectedAnswer === r.correctAnswer).length;
    return {
      correct,
      incorrect: mcqResponses.length - correct,
      percentage: ((correct / mcqResponses.length) * 100).toFixed(1)
    };
  };

  const stats = calculateStats(result.mcqResponses);

  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden shadow-xl relative">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Book className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">
                  MCQ Performance Report
                </h2>
                <p className="text-sm text-gray-500">{result.candidateName}</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(85vh-80px)]">
            {/* Performance Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-green-600">Correct Answers</p>
                  <span className="p-1.5 bg-green-100 rounded-lg">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </span>
                </div>
                <div className="mt-3">
                  <h3 className="text-2xl font-bold text-green-700">{stats.correct}</h3>
                  <p className="text-sm text-green-600">out of {result.mcqResponses.length} questions</p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-red-50 to-rose-50 p-4 rounded-xl border border-red-100">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-red-600">Incorrect Answers</p>
                  <span className="p-1.5 bg-red-100 rounded-lg">
                    <XCircle className="w-4 h-4 text-red-600" />
                  </span>
                </div>
                <div className="mt-3">
                  <h3 className="text-2xl font-bold text-red-700">{stats.incorrect}</h3>
                  <p className="text-sm text-red-600">wrong attempts</p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-blue-600">Overall Score</p>
                  <span className="p-1.5 bg-blue-100 rounded-lg">
                    <Percent className="w-4 h-4 text-blue-600" />
                  </span>
                </div>
                <div className="mt-3">
                  <h3 className="text-2xl font-bold text-blue-700">{stats.percentage}%</h3>
                  <p className="text-sm text-blue-600">performance score</p>
                </div>
              </div>
            </div>

            {/* Detailed Questions */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Detailed Responses</h3>
              {result.mcqResponses.map((mcq, index) => (
                <div 
                  key={index} 
                  className={`p-4 rounded-xl border ${
                    mcq.selectedAnswer === mcq.correctAnswer
                      ? 'bg-green-50 border-green-100'
                      : 'bg-red-50 border-red-100'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`mt-1 p-1.5 rounded-lg ${
                      mcq.selectedAnswer === mcq.correctAnswer
                        ? 'bg-green-100'
                        : 'bg-red-100'
                    }`}>
                      {mcq.selectedAnswer === mcq.correctAnswer ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800 mb-2">
                        Q{index + 1}. {mcq.question}
                      </p>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-600">Selected:</span>
                          <span className={mcq.selectedAnswer === mcq.correctAnswer 
                            ? 'text-green-600' 
                            : 'text-red-600'
                          }>
                            {mcq.selectedAnswer}
                          </span>
                        </div>
                        {mcq.selectedAnswer !== mcq.correctAnswer && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-600">Correct:</span>
                            <span className="text-green-600">{mcq.correctAnswer}</span>
                          </div>
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
    </div>
  );
};

  // Update the findRankingForCandidate helper function
const findRankingForCandidate = (candidateId, rankings) => {
  const ranking = rankings.find(r => r.candidateId === candidateId);
  if (!ranking) return null;
  
  return {
    ...ranking,
    interview_performance: ranking.interview_performance || {
      scores: { fluency: 0, subjectKnowledge: 0, professionalBehavior: 0 },
      feedback: '',
      panelReview: null
    }
  };
};

  const handleBack = () => {
    navigate('/hrpost', { state: { activeTab: 'verify-candidates' } });
  };

  useEffect(() => {
    console.log('Selected candidates updated:', Array.from(selectedCandidates));
  }, [selectedCandidates]);

  // Add this function with your other state declarations and utility functions
const getSelectedCount = () => {
  if (!candidates || (!candidates.mcq && !candidates.interview)) {
    return 0;
  }
  const allCandidates = [...(candidates.mcq || []), ...(candidates.interview || [])];
  return allCandidates.filter(c => c.selected === 'yes').length;
};

  // Add this validation function
const validatePanelAssignment = (name, value, currentFormData) => {
  // Get other panel assignments
  const otherPanels = Object.entries(currentFormData)
    .filter(([key, val]) => 
      key.startsWith('panel') && 
      key !== name && 
      val !== ''
    )
    .map(([_, val]) => val);

  // Check if this panel member is already assigned
  if (otherPanels.includes(value)) {
    toast.error('This panel member is already assigned to another level');
    return false;
  }
  return true;
};

// Update the handleInputChange function
const handleInputChange = (e) => {
  const { name, value } = e.target;
  let validatedValue = value;

  // Panel assignment validation
  if (name.startsWith('panel')) {
    if (value && !validatePanelAssignment(name, value, formData)) {
      return;
    }
  }

  // Rest of your existing validation logic...
  setFormData(prev => ({
    ...prev,
    [name]: validatedValue
  }));
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
    <div className="min-h-screen w-full bg-white">
      <div className="flex flex-col items-center justify-center h-[calc(100vh-16rem)]">
        <div className="text-red-500 bg-red-50 px-6 py-3 rounded-lg">
          {error}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white p-8">
      {/* Add back button */}
      <button
        onClick={handleBack}
        className="mb-6 px-4 py-2 flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Dashboard
      </button>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                Verify Candidates
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                  Stage {interviewStage}
                </span>
              </h1>
              <p className="text-gray-600 mt-1">
                Select candidates to proceed to the next stage
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleSelect}
                disabled={selectedCandidates.size === 0 || isPostCreated}
                className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-200 
                  ${(selectedCandidates.size === 0 || isPostCreated)
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'}`}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Select ({getUnselectedCount()})
              </button>
              <button
                onClick={handleDeselect}
                disabled={selectedCandidates.size === 0 || isPostCreated}
                className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-200 
                  ${(selectedCandidates.size === 0 || isPostCreated)
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border border-yellow-200'}`}
              >
                <XCircle className="w-4 h-4 mr-2" />
                Deselect ({selectedCandidates.size})
              </button>
              <button
                onClick={handleEndRecruitment}
                disabled={isPostCreated}
                className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-200 
                  ${isPostCreated
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'}`}
              >
                <X className="w-4 h-4 mr-2" />
                End Recruitment
              </button>
              <button
                onClick={handleNewRecruitment}
                disabled={isPostCreated || getSelectedCount() < 2}
                className={`inline-flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-200 
                  ${isPostCreated || getSelectedCount() < 2
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                }`}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Recruitment {getSelectedCount() > 0 && `(${getSelectedCount()})`}
              </button>
            </div>
          </div>
        </div>

        {/* Only show MCQ Candidates section if exam type is MCQ */}
        {postExamType === 'MCQ' && candidates.mcq.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">MCQ Candidates</h2>
              <p className="text-gray-600 text-sm mt-1">
                Candidates who have completed the MCQ assessment
              </p>
            </div>
            <div className="divide-y divide-gray-100">
              {candidates.mcq.map(candidate => {
                // Calculate performance stats for the candidate
                const mcqResult = mcqResults.find(r => 
                  parseInt(r.candidateId) === candidate.candidate_id
                );
                
                const stats = mcqResult ? {
                  correct: mcqResult.mcqResponses.filter(r => 
                    r.selectedAnswer === r.correctAnswer
                  ).length,
                  total: mcqResult.mcqResponses.length,
                  percentage: ((mcqResult.mcqResponses.filter(r => 
                    r.selectedAnswer === r.correctAnswer
                  ).length / mcqResult.mcqResponses.length) * 100).toFixed(1)
                } : null;
        
                return (
                  <div 
                    key={candidate.interview_id} 
                    className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={async () => {
                      try {
                        await fetchMcqResponse(candidate);
                      } catch (err) {
                        console.error('Error:', err);
                        toast.error('Failed to load MCQ responses');
                      }
                    }}
                  >
                    <div className="flex flex-col gap-4">
                      {/* Candidate Info */}
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900 flex items-center gap-2">
                              {candidate.candidate_name}
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                candidate.candidate_level === 'Beginner' 
                                  ? 'bg-green-100 text-green-700' 
                                  : candidate.candidate_level === 'Intermediate'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-purple-100 text-purple-700'
                              }`}>
                                {candidate.candidate_level}
                              </span>
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Calendar className="w-4 h-4" />
                              <span>{new Date(candidate.createdat).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium 
                            ${candidate.selected === 'yes' 
                              ? 'bg-green-50 text-green-700 ring-1 ring-green-600/20' 
                              : 'bg-gray-50 text-gray-600 ring-1 ring-gray-500/20'}`}>
                            {candidate.selected === 'yes' ? 'Selected' : 'Not Selected'}
                          </span>
                          <div className="relative flex items-center">
                            <input
                              type="checkbox"
                              checked={selectedCandidates.has(candidate.interview_id)}
                              onChange={() => handleCheckboxChange(candidate.interview_id)}
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log('Clicked checkbox for interview ID:', candidate.interview_id); // Debug log
                              }}
                              disabled={isPostCreated}
                              className={`w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500
                                ${isPostCreated ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            />
                          </div>
                        </div>
                      </div>
        
                      {/* Performance Stats */}
                      {stats && (
                        <div className="grid grid-cols-3 gap-4 mt-2">
                          <div className="p-2 bg-green-50 rounded-lg">
                            <div className="text-xs text-green-700 font-medium">Correct Answers</div>
                            <div className="text-sm font-semibold text-green-900">{stats.correct}/{stats.total}</div>
                          </div>
                          <div className="p-2 bg-red-50 rounded-lg">
                            <div className="text-xs text-red-700 font-medium">Incorrect Answers</div>
                            <div className="text-sm font-semibold text-red-900">{stats.total - stats.correct}/{stats.total}</div>
                          </div>
                          <div className="p-2 bg-blue-50 rounded-lg">
                            <div className="text-xs text-blue-700 font-medium">Score</div>
                            <div className="text-sm font-semibold text-blue-900">{stats.percentage}%</div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Interview Candidates Section - Only show for Interview exam type */}
        {postExamType === 'Interview' && candidates.interview.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-800">Interview Candidates</h2>
              <p className="text-gray-600 text-sm mt-1">
                Candidates who have completed the interview process
              </p>
            </div>
            <div className="divide-y divide-gray-100">
              {candidates.interview.map(candidate => {
                const ranking = findRankingForCandidate(candidate.candidate_id, rankings);
                const averageScore = ranking?.scores ? 
                  Object.values(ranking.scores).reduce((a, b) => a + b, 0) / 3 : null;
        
                return (
                  <div 
                    key={candidate.interview_id} 
                    className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={async () => {
                      try {
                        const response = await fetch(
                          `http://localhost:5005/get-conversation-hr/${postId}/${candidate.candidate_id}`
                        );
                        
                        if (!response.ok) {
                          const errorData = await response.json();
                          throw new Error(errorData.error || 'Failed to fetch conversation');
                        }
                        
                        const conversation = await response.json();
                        
                        if (!conversation) {
                          throw new Error('No conversation data found');
                        }
                        
                        setSelectedConversation(conversation);
                        setShowConversationModal(true);
                      } catch (err) {
                        console.error('Error fetching conversation:', err);
                        toast.error('Failed to load conversation');
                      }
                    }}
                  >
                    <div className="flex flex-col gap-4">
                      {/* Header with name and actions */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center">
                            <User className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900 flex items-center gap-2">
                              {candidate.candidate_name}
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                candidate.candidate_level === 'Beginner' 
                                  ? 'bg-green-100 text-green-700' 
                                  : candidate.candidate_level === 'Intermediate'
                                  ? 'bg-blue-100 text-blue-700'
                                  : 'bg-purple-100 text-purple-700'
                              }`}>
                                {candidate.candidate_level}
                              </span>
                            </h3>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <Calendar className="w-4 h-4" />
                              <span>{new Date(candidate.createdat).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium 
                            ${candidate.selected === 'yes' 
                              ? 'bg-green-50 text-green-700 ring-1 ring-green-600/20' 
                              : 'bg-gray-50 text-gray-600 ring-1 ring-gray-500/20'}`}>
                            {candidate.selected === 'yes' ? 'Selected' : 'Not Selected'}
                          </span>
                          <div className="relative flex items-center">
                            <input
                              type="checkbox"
                              checked={selectedCandidates.has(candidate.interview_id)}
                              onChange={() => handleCheckboxChange(candidate.interview_id)}
                              onClick={(e) => {
                                e.stopPropagation();
                                console.log('Clicked checkbox for interview ID:', candidate.interview_id); // Debug log
                              }}
                              disabled={isPostCreated}
                              className={`w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500
                                ${isPostCreated ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                            />
                          </div>
                        </div>
                      </div>
        
                      {/* Rankings and Feedback Section */}
                      {ranking && (
                        <div className="mt-4 space-y-4">
                          {/* Scores */}
                          <div className="grid grid-cols-4 gap-4">
                            <div className="col-span-1 p-3 bg-blue-50 rounded-lg">
                              <div className="text-sm text-blue-700 font-medium">Fluency</div>
                              <div className="text-lg font-semibold text-blue-900">
                                {ranking.interview_performance?.scores?.fluency || 0}/10
                              </div>
                            </div>
                            <div className="col-span-1 p-3 bg-purple-50 rounded-lg">
                              <div className="text-sm text-purple-700 font-medium">Subject</div>
                              <div className="text-lg font-semibold text-purple-900">
                                {ranking.interview_performance?.scores?.subjectKnowledge || 0}/10
                              </div>
                            </div>
                            <div className="col-span-1 p-3 bg-green-50 rounded-lg">
                              <div className="text-sm text-green-700 font-medium">Behavior</div>
                              <div className="text-lg font-semibold text-green-900">
                                {ranking.interview_performance?.scores?.professionalBehavior || 0}/10
                              </div>
                            </div>
                            <div className="col-span-1 p-3 bg-gray-50 rounded-lg">
                              <div className="text-sm text-gray-700 font-medium">Average</div>
                              <div className="text-lg font-semibold text-gray-900">
                                {ranking.interview_performance?.scores ? 
                                  (Object.values(ranking.interview_performance.scores).reduce((a, b) => a + b, 0) / 3).toFixed(1)
                                  : "0.0"}/10
                              </div>
                            </div>
                          </div>
        
                          {/* Feedback */}
                          <div className="text-sm">
                            <div className="font-medium text-gray-700 mb-1">Feedback:</div>
                            <p className="text-gray-600">
                              {ranking.interview_performance?.feedback || 'No feedback available'}
                            </p>
                          </div>
        
                          {/* Panel Review if exists */}
                          {ranking.interview_performance?.panelReview && (
                            <div className="text-sm bg-blue-50 p-3 rounded-lg">
                              <div className="font-medium text-blue-700 mb-1">Panel Review:</div>
                              <p className="text-blue-600">{ranking.interview_performance.panelReview.text}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Keep existing modal code */}

        {showMcqModal && selectedMcqResponse && (
          <ResultModal
            result={selectedMcqResponse}
            onClose={() => {
              setShowMcqModal(false);
              setSelectedMcqResponse(null);
            }}
          />
        )}

        {/* Add this right before the closing div */}
        {showConversationModal && selectedConversation && (
          <ConversationModal
            conversation={selectedConversation}
            onClose={() => {
              setShowConversationModal(false);
              setSelectedConversation(null);
            }}
          />
        )}

        {/* Add this modal JSX right before the closing div of your return statement */}
        {isCreateModalOpen && (
          <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/90 rounded-xl p-8 w-full max-w-3xl shadow-xl max-h-[90vh] flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Create New Recruitment Level</h2>
                <button 
                  onClick={() => setIsCreateModalOpen(false)} 
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form 
                id="jobForm" 
                onSubmit={handleNewPostSubmit} 
                className="space-y-6 overflow-y-auto flex-1 pr-2"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Job Title</label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Job Description</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows="4"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Skill required</label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select Skills</option>
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Exam Type</label>
                    <select
                      name="examType"
                      value={formData.examType}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select Type</option>
                      {examTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Minimum Experience Required (years)</label>
                    <input
                      type="number"
                      name="minExperience"
                      value={formData.minExperience}
                      onChange={handleInputChange}
                      min="0"
                      max="50"
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Follow-up Questions Count</label>
                    <input
                      type="number"
                      name="followupCount"
                      value={formData.followupCount}
                      onChange={handleInputChange}
                      min="0"
                      max="10"
                      disabled={formData.examType === 'MCQ'}
                      className={`w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formData.examType === 'MCQ' ? 'bg-gray-100' : ''}`}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Test Duration (minutes)</label>
                    <input
                      type="number"
                      name="totalTime"
                      value={formData.totalTime}
                      onChange={handleInputChange}
                      min="1"
                      max="300"
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Minimum Mark (%)</label>
                    <input
                      type="number"
                      name="coverageNeeded"
                      value={formData.coverageNeeded}
                      onChange={handleInputChange}
                      min="0"
                      max="100"
                      disabled={formData.examType === 'MCQ'}
                      className={`w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${formData.examType === 'MCQ' ? 'bg-gray-100' : ''}`}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Application Deadline</label>
                    <input
                      type="date"
                      name="applicationDeadline"
                      value={formData.applicationDeadline}
                      onChange={handleInputChange}
                      min={getTodayString()}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Test Start Date</label>
                    <input
                      type="date"
                      name="testStartDate"
                      value={formData.testStartDate}
                      onChange={handleInputChange}
                      min={formData.applicationDeadline || getTodayString()}
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  {/* Panel Assignment Section */}
                  <div className="col-span-2">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Panel Assignment</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {['Beginner', 'Intermediate', 'Advanced'].map((level) => (
                        <div key={`panel-section-${level}`}>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            {level} Level Panel
                          </label>
                          <select
                            name={`panel${level}`}
                            value={formData[`panel${level}`]}
                            onChange={handleInputChange}
                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                          >
                            <option value="">Select Panel Member</option>
                            {panelMembers.map(member => (
                              <option 
                                key={`${level}-${member.username}`}
                                value={member.username}
                                disabled={Object.entries(formData)
                                  .filter(([key, val]) => 
                                    key.startsWith('panel') && 
                                    key !== `panel${level}` && 
                                    val === member.username
                                  ).length > 0}
                              >
                                {member.username}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </form>

              <div className="flex justify-end gap-4 pt-4 mt-4 border-t border-gray-200">
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="jobForm"
                  disabled={isSubmitting}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center min-w-[120px]"
                >
                  {isSubmitting ? (
                    <>
                      <svg 
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" 
                        xmlns="http://www.w3.org/2000/svg" 
                        fill="none" 
                        viewBox="0 0 24 24"
                      >
                        <circle 
                          className="opacity-25" 
                          cx="12" 
                          cy="12" 
                          r="10" 
                          stroke="currentColor" 
                          strokeWidth="4"
                        />
                        <path 
                          className="opacity-75" 
                          fill="currentColor" 
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Creating...
                    </>
                  ) : (
                    'Create Level'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {showEndRecruitmentConfirm && (
          <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-[60]">
            <div className="bg-white rounded-xl p-6 w-full max-w-md m-4 shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-yellow-500" />
                <h3 className="text-xl font-semibold text-gray-800">End Recruitment Process</h3>
              </div>
              
              {/* Split the text and list into separate elements */}
              <div className="text-gray-600 mb-6">
                <p className="mb-2">
                  Are you sure you want to end the recruitment process? This will:
                </p>
                <ul className="list-disc ml-6">
                  <li>Mark selected candidates as hired</li>
                  <li>Mark unselected candidates as rejected</li>
                  <li>Complete the job posting</li>
                </ul>
              </div>

              <div className="flex justify-end gap-4">
                <button
                  onClick={() => setShowEndRecruitmentConfirm(false)}
                  disabled={isEndingRecruitment}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmEndRecruitment}
                  disabled={isEndingRecruitment}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center min-w-[80px]"
                >
                  {isEndingRecruitment ? (
                    <>
                      <svg 
                        className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" 
                        xmlns="http://www.w3.org/2000/svg" 
                        fill="none" 
                        viewBox="0 0 24 24"
                      >
                        <circle 
                          className="opacity-25" 
                          cx="12" 
                          cy="12" 
                          r="10" 
                          stroke="currentColor" 
                          strokeWidth="4"
                        />
                        <path 
                          className="opacity-75" 
                          fill="currentColor" 
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Processing...
                    </>
                  ) : (
                    'End Recruitment'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <Toaster/>
    </div>
  );
};
