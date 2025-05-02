import React, { useState } from 'react';
import { 
  PlusCircle, X, UserPlus, Calendar, AlertTriangle, ClipboardList,
  FileText, Clipboard, PencilIcon, Trash2, Code2, ClipboardCheck,
  Users, UserCircle 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const API_BASE_URL = 'http://localhost:5010'; 

export const JobPostingSystem = ({ onPostUpdate }) => {
  const [posts, setPosts] = useState([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
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
  const [isEditMode, setIsEditMode] = useState(false);
  const [editFormData, setEditFormData] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [postToDelete, setPostToDelete] = useState(null);
  const [isLoading, setIsLoading] = useState(true); // Update initial value to true
  const [error, setError] = useState(null);
  const [panelMembers, setPanelMembers] = useState([]);
  const [panelMemberNames, setPanelMemberNames] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const navigate = useNavigate();

  const categories = ['Angular', 'C#', 'Django', 'Express.js', 'Flask', 'Go', 'Java', 'JavaScript','MySQL/PostgreSQL','MongoDB/Cassandra (NoSQL databases)', 'Node.js', 'Python', 'React', 'Ruby', 'Spring Boot'];

  const examTypes = ['Interview', 'MCQ'];

  // Add this validation function
  const validatePanelAssignment = (name, value) => {
    // Get other panel assignments
    const otherPanels = Object.entries(formData)
      .filter(([key, val]) => key.startsWith('panel') && key !== name && val !== '')
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

    // Date validation
    if (name === 'applicationDeadline' || name === 'testStartDate') {
      const applicationDeadline = name === 'applicationDeadline' ? value : formData.applicationDeadline;
      const testStartDate = name === 'testStartDate' ? value : formData.testStartDate;

      if (applicationDeadline && testStartDate) {
        if (new Date(applicationDeadline) > new Date(testStartDate)) {
          toast.error('Application deadline cannot be after test start date');
          return;
        }
      }
    }

    // Rest of your existing validation logic
    if (name.startsWith('panel')) {
      if (value && !validatePanelAssignment(name, value)) {
        return;
      }
    }

    // Special handling for exam type changes
    if (name === 'examType') {
      if (value === 'MCQ') {
        setFormData(prev => ({
          ...prev,
          [name]: value,
          followupCount: '',
          coverageNeeded: ''
        }));
        return;
      }
    }

    // Handle numeric fields
    const numericFields = ['minExperience', 'followupCount', 'totalTime', 'coverageNeeded'];
    if (numericFields.includes(name)) {
      if (!/^\d*$/.test(value)) {
        return;
      }
      
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

    setFormData(prev => ({
      ...prev,
      [name]: validatedValue
    }));
  };

  // Add a new function to handle keypress
  const handleKeyPress = (e) => {
    const numericFields = ['minExperience', 'followupCount', 'totalTime', 'coverageNeeded'];
    if (numericFields.includes(e.target.name)) {
      // Allow only numbers and control keys
      if (!/[\d\b]/.test(e.key)) {
        e.preventDefault();
      }
    }
  };

  const getTodayString = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const canEditPost = (post) => {
    const deadline = new Date(post.applicationDeadline);
    const today = new Date();
    return today <= deadline;
  };

  // Add this function to reset the form
  const resetFormData = () => {
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
  };

  // Add this check function
  const isMCQSelected = () => formData.examType === 'MCQ';

  // Update handleSubmit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      const panelMembers = [
        formData.panelBeginner,
        formData.panelIntermediate,
        formData.panelAdvanced
      ];

      const postData = {
        title: formData.title,
        description: formData.description,
        minimum_experience: parseInt(formData.minExperience),
        category: formData.category,
        exam_type: formData.examType,
        followup: formData.examType === 'MCQ' ? null : parseInt(formData.followupCount),
        coverage: formData.examType === 'MCQ' ? null : parseInt(formData.coverageNeeded),
        time: parseInt(formData.totalTime),
        application_deadline: formData.applicationDeadline,
        test_start_date: formData.testStartDate,
        panel_members: panelMembers
      };

      const response = await fetch(`${API_BASE_URL}/save-post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData)
      });

      if (response.ok) {
        const newPost = await response.json();
        // Add the new post to the posts array with correct field mapping
        setPosts(currentPosts => [{
          ...postData,
          id: newPost.post_id,
          post_id: newPost.post_id,
          status: 'active',
          post_stage: 1,
          panel: panelMembers,
          minExperience: postData.minimum_experience,
          examType: postData.exam_type,
          followupCount: postData.followup,
          coverageNeeded: postData.coverage,
          totalTime: postData.time,
          applicationDeadline: postData.application_deadline,
          testStartDate: postData.test_start_date,
        }, ...currentPosts]);

        resetFormData();
        setIsCreateModalOpen(false);
        toast.success('Job post created successfully!');
        await onPostUpdate?.(); // Optional: Call the update function if needed
      }
    } catch (error) {
      console.error('Error saving post:', error);
      toast.error('Failed to create job post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = (postId) => {
    setPostToDelete(postId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    setIsDeletingPost(true);
    try {
      const response = await fetch(`${API_BASE_URL}/delete-post/${postToDelete}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        setPosts(posts.filter(post => post.id !== postToDelete));
        setShowDeleteConfirm(false);
        setIsDetailsModalOpen(false);
        setPostToDelete(null);
        toast.success('Job post deleted successfully');
        await onPostUpdate?.(); // Call the update function
      }
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    } finally {
      setIsDeletingPost(false);
    }
  };

  // Update the handleEdit function
  const handleEdit = () => {
    // Format dates to YYYY-MM-DD for input[type="date"]
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    };

    // Create edit data with proper field mapping
    const editData = {
      ...selectedPost,
      title: selectedPost.title,
      description: selectedPost.description,
      minExperience: selectedPost.minimum_experience || selectedPost.minExperience,
      category: selectedPost.category,
      examType: selectedPost.exam_type || selectedPost.examType,
      followupCount: selectedPost.followup || selectedPost.followupCount || '',
      totalTime: selectedPost.time || selectedPost.totalTime,
      coverageNeeded: selectedPost.coverage || selectedPost.coverageNeeded || '',
      applicationDeadline: formatDate(selectedPost.applicationDeadline),
      testStartDate: formatDate(selectedPost.testStartDate)
    };

    setEditFormData(editData);
    setFormData(editData);
    setIsEditMode(true);
    setIsDetailsModalOpen(false);
    setIsCreateModalOpen(true);
  };

  // Update the handleEditSubmit function
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setIsSubmitting(true); // Start loading
    
    try {
      const postData = {
        title: formData.title,
        description: formData.description,
        minimum_experience: parseInt(formData.minExperience),
        category: formData.category,
        exam_type: formData.examType,
        followup: parseInt(formData.followupCount),
        coverage: parseInt(formData.coverageNeeded),
        time: parseInt(formData.totalTime),
        application_deadline: formData.applicationDeadline,
        test_start_date: formData.testStartDate
      };

      const response = await fetch(`${API_BASE_URL}/update-post/${editFormData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(postData)
      });

      if (response.ok) {
        // Update local state
        setPosts(posts.map(post => 
          post.id === editFormData.id ? { ...formData, id: post.id, panel: post.panel } : post
        ));
        resetFormData();
        setIsCreateModalOpen(false);
        setIsEditMode(false);
        setEditFormData(null);
        toast.success('Job post updated successfully!');
        await onPostUpdate?.(); // Call the update function
      }

    } catch (error) {
      console.error('Error updating post:', error);
      toast.error('Failed to update post. Please try again.');
    } finally {
      setIsSubmitting(false); // Reset loading state
    }
  };

  React.useEffect(() => {
    if (isEditMode && editFormData) {
      setFormData({
        ...editFormData,
        minExperience: editFormData.minimum_experience || editFormData.minExperience,
        followupCount: editFormData.followup || editFormData.followupCount || '',
        totalTime: editFormData.time || editFormData.totalTime,
        coverageNeeded: editFormData.coverage || editFormData.coverageNeeded || '',
        examType: editFormData.exam_type || editFormData.examType,
        applicationDeadline: editFormData.applicationDeadline,
        testStartDate: editFormData.testStartDate
      });
    }
  }, [isEditMode, editFormData]);

  // Update the useEffect hook that fetches posts
  React.useEffect(() => {
    const fetchPosts = async () => {
      setIsLoading(true); // Set loading to true before fetching
      try {
        const response = await fetch(`${API_BASE_URL}/post`);
        if (!response.ok) {
          throw new Error('Failed to fetch posts');
        }
        const data = await response.json();
        setPosts(data.map(post => ({
          ...post,
          id: post.post_id,
          minExperience: post.minimum_experience,
          examType: post.exam_type,
          followupCount: post.followup,
          coverageNeeded: post.coverage,
          totalTime: post.time,
          applicationDeadline: post.application_deadline,
          testStartDate: post.test_start_date,
          panel: post.panel_members
        })));
      } catch (error) {
        console.error('Error fetching posts:', error);
        toast.error('Failed to fetch posts');
      } finally {
        setIsLoading(false); // Set loading to false after fetching
      }
    };

    fetchPosts();
  }, []);

  React.useEffect(() => {
    const fetchPanelMembers = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/panel-members`);
        if (!response.ok) {
          throw new Error('Failed to fetch panel members');
        }
        const data = await response.json();
        setPanelMembers(data.map(member => ({
          userid: member.id,  // Note: changed from userid to id to match backend
          username: member.username
        })));
      } catch (error) {
        console.error('Error fetching panel members:', error);
        setError('Failed to fetch panel members');
      }
    };

    fetchPanelMembers();
  }, []);

  React.useEffect(() => {
    const fetchPanelMemberNames = async (ids) => {
      try {
        const uniqueIds = [...new Set(ids)];
        const names = {};
        for (const id of uniqueIds) {
          const member = panelMembers.find(m => m.userid.toString() === id);
          if (member) {
            names[id] = member.username;
          }
        }
        setPanelMemberNames(names);
      } catch (error) {
        console.error('Error fetching panel member names:', error);
      }
    };

    if (selectedPost?.panel?.length > 0) {
      fetchPanelMemberNames(selectedPost.panel);
    }
  }, [selectedPost?.panel, panelMembers]);

  const ErrorMessage = ({ message }) => (
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
      {message}
    </div>
  );

  // Update the EmptyState component
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-16rem)] bg-white rounded-2xl p-8 text-center">
      <div className="bg-blue-50 p-4 rounded-full mb-6">
        <ClipboardList className="w-16 h-16 text-blue-500" />
      </div>
      <h3 className="text-2xl font-semibold text-gray-800 mb-3">
        No Job Posts Yet
      </h3>
      <p className="text-gray-600 mb-8 max-w-md">
        Get started by creating your first job post. Click the button below to create a new position.
      </p>
      <button
        onClick={() => {
          resetFormData();
          setIsCreateModalOpen(true);
        }}
        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
      >
        <PlusCircle className="w-5 h-5" />
        Create Job Post
      </button>
    </div>
  );

  // Update the return statement's main container
  return (
    <div className="w-full h-full">
      {/* Create Post Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/90 rounded-xl p-8 w-full max-w-3xl shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                {isEditMode ? 'Edit Job Post' : 'Create New Job Post'}
              </h2>
              <button 
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setIsEditMode(false);
                  setEditFormData(null);
                  resetFormData();
                }} 
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form 
              id="jobForm"  // Add this line
              onSubmit={isEditMode ? handleEditSubmit : handleSubmit} 
              className="space-y-6 overflow-y-auto flex-1 pr-2"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="col-span-2">
                  <label className="block text-sm font-semibold text-gray-700 mb-2"> Job Title</label>
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
                  <label className="block text-sm font-semibold text-gray-700 mb-2"> Job Description</label>
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
                    onWheel={(e) => e.target.blur()}
                    onKeyPress={handleKeyPress}
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
                    onWheel={(e) => e.target.blur()}
                    onKeyPress={handleKeyPress}
                    disabled={isMCQSelected()}
                    className={`w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isMCQSelected() ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
                    onWheel={(e) => e.target.blur()}
                    onKeyPress={handleKeyPress}
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
                    onWheel={(e) => e.target.blur()}
                    onKeyPress={handleKeyPress}
                    disabled={isMCQSelected()}
                    className={`w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${isMCQSelected() ? 'bg-gray-100 cursor-not-allowed' : ''}`}
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
                    min={getTodayString()}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                {!isEditMode && (
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
                            {panelMembers.map(member => {
                              // Check if this panel member is already assigned to another level
                              const isAssigned = Object.entries(formData)
                                .filter(([key, val]) => 
                                  key.startsWith('panel') && 
                                  key !== `panel${level}` && 
                                  val === member.username
                                ).length > 0;

                              return (
                                <option 
                                  key={`${level}-${member.username}`}
                                  value={member.username}
                                  disabled={isAssigned}
                                  className={isAssigned ? 'text-gray-400' : ''}
                                >
                                  {member.username}
                                </option>
                              );
                            })}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </form>

            <div className="flex justify-end gap-4 pt-4 mt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => {
                  setIsCreateModalOpen(false);
                  setIsEditMode(false);
                  setEditFormData(null);
                  resetFormData();
                }}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                form="jobForm"  // This now matches the form id
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isSubmitting ? (
                  <>
                    <svg 
                      className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" 
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
                    {isEditMode ? 'Saving...' : 'Creating...'}
                  </>
                ) : (
                  isEditMode ? 'Save Changes' : 'Create Post'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Posts Grid */}
      <div className="w-full">
        {isLoading ? (
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
        ) : error ? (
          <ErrorMessage message={error} />
        ) : posts.length === 0 ? (
          <EmptyState />
        ) : (
          // Modified posts grid
          <div className="space-y-4">
            {posts.map(post => (
              <div 
                key={post.id} 
                className="group relative bg-white rounded-xl p-6 border border-gray-200 transition-all duration-300 hover:border-blue-300 hover:shadow-lg"
              >
                <div
                  onClick={() => {
                    setSelectedPost(post);
                    setIsDetailsModalOpen(true);
                  }}
                  className="cursor-pointer"
                >
                  <div className="transition-transform duration-300 group-hover:-translate-y-1">
                    <div className="flex justify-between items-start">
                      <div className="space-y-3 flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xl font-semibold text-gray-800">{post.title}</h3>
                          <div className="flex gap-2">
                            <span className={`px-3 py-1 text-xs rounded-full ${
                              post.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {post.status}
                            </span>
                            <span className="px-3 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                              Stage {post.post_stage}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                            {post.category}
                          </span>
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800">
                            {post.examType}
                          </span>
                        </div>
                        {/* Keep panel information */}
                        <div className="flex flex-col gap-1 text-sm text-gray-600">
                          {post.panel && post.panel.length > 0 && (
                            <>
                              <div className="flex items-center">
                                <UserPlus className="w-4 h-4 mr-2 text-gray-400" />
                                <span>Beginner: {post.panel[0]}</span>
                              </div>
                              <div className="flex items-center">
                                <UserPlus className="w-4 h-4 mr-2 text-gray-400" />
                                <span>Intermediate: {post.panel[1]}</span>
                              </div>
                              <div className="flex items-center">
                                <UserPlus className="w-4 h-4 mr-2 text-gray-400" />
                                <span>Advanced: {post.panel[2]}</span>
                              </div>
                            </>
                          )}
                          <div className="flex items-center mt-2">
                            <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                            <span>Application Deadline: {new Date(post.applicationDeadline).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => {
          resetFormData();
          setIsCreateModalOpen(true);
        }}
        className="fixed bottom-8 right-8 flex items-center justify-center w-16 h-16 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105"
      >
        <PlusCircle className="w-8 h-8" />
      </button>

      {/* Details Modal */}
      {isDetailsModalOpen && selectedPost && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-4xl m-4 max-h-[90vh] overflow-y-auto shadow-2xl transform transition-all">
            {/* Header Section */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-sm px-8 py-6 border-b border-gray-100">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold text-gray-800 group">
                    {selectedPost.title}
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      selectedPost.status === 'active' 
                        ? 'bg-green-100 text-green-800 border border-green-200' 
                        : 'bg-gray-100 text-gray-800 border border-gray-200'
                    }`}>
                      {selectedPost.status}
                    </span>
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200">
                      Stage {selectedPost.post_stage}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {canEditPost(selectedPost) && (
                    <button
                      onClick={handleEdit}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                        transition-all duration-200 flex items-center gap-2 hover:scale-105"
                    >
                      <PencilIcon className="w-4 h-4" />
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(selectedPost.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 
                      transition-all duration-200 flex items-center gap-2 hover:scale-105"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                  <button 
                    onClick={() => setIsDetailsModalOpen(false)} 
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-gray-500" />
                  </button>
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="p-8 space-y-6">
              {/* Description Card */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
                <h3 className="font-semibold text-lg text-gray-800 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Job Description
                </h3>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {selectedPost.description}
                </p>
              </div>

              {/* Job Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Technical Requirements */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-100">
                  <h3 className="font-semibold text-lg text-gray-800 mb-4 flex items-center gap-2">
                    <Code2 className="w-5 h-5 text-purple-600" />
                    Technical Requirements
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Required Skill</span>
                      <span className="font-semibold text-purple-700 bg-purple-100 px-3 py-1 rounded-full">
                        {selectedPost.category}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Experience Needed</span>
                      <span className="font-semibold text-purple-700">
                        {selectedPost.minExperience} {selectedPost.minExperience === 1 ? 'year' : 'years'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Assessment Details */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-xl border border-green-100">
                  <h3 className="font-semibold text-lg text-gray-800 mb-4 flex items-center gap-2">
                    <ClipboardCheck className="w-5 h-5 text-green-600" />
                    Assessment Details
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Exam Type</span>
                      <span className="font-semibold text-green-700 bg-green-100 px-3 py-1 rounded-full">
                        {selectedPost.examType}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Time Allowed</span>
                      <span className="font-semibold text-green-700">
                        {selectedPost.totalTime} {selectedPost.totalTime === 1 ? 'minute' : 'minutes'}
                      </span>
                    </div>
                    {selectedPost.examType !== 'MCQ' && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Minimum Mark</span>
                          <span className="font-semibold text-green-700">
                            {selectedPost.coverageNeeded}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-600">Follow-up Questions</span>
                          <span className="font-semibold text-green-700">
                            {selectedPost.followupCount}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Important Dates */}
              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 p-6 rounded-xl border border-amber-100">
                <h3 className="font-semibold text-lg text-gray-800 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-600" />
                  Important Dates
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <span className="text-gray-600">Application Deadline</span>
                    <span className="font-semibold text-amber-700 mt-1">
                      {new Date(selectedPost.applicationDeadline).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-gray-600">Test Start Date</span>
                    <span className="font-semibold text-amber-700 mt-1">
                      {new Date(selectedPost.testStartDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Panel Members */}
              <div className="bg-gradient-to-br from-sky-50 to-blue-50 p-6 rounded-xl border border-sky-100">
                <h3 className="font-semibold text-lg text-gray-800 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-sky-600" />
                  Assigned Panel Members
                </h3>
                {selectedPost.panel && selectedPost.panel.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white/50 p-4 rounded-lg border border-sky-100">
                      <span className="text-sm text-sky-600 font-medium">Beginner Level</span>
                      <p className="font-semibold text-gray-800 mt-1 flex items-center gap-2">
                        <UserCircle className="w-5 h-5 text-sky-500" />
                        {selectedPost.panel[0]}
                      </p>
                    </div>
                    <div className="bg-white/50 p-4 rounded-lg border border-sky-100">
                      <span className="text-sm text-sky-600 font-medium">Intermediate Level</span>
                      <p className="font-semibold text-gray-800 mt-1 flex items-center gap-2">
                        <UserCircle className="w-5 h-5 text-sky-500" />
                        {selectedPost.panel[1]}
                      </p>
                    </div>
                    <div className="bg-white/50 p-4 rounded-lg border border-sky-100">
                      <span className="text-sm text-sky-600 font-medium">Advanced Level</span>
                      <p className="font-semibold text-gray-800 mt-1 flex items-center gap-2">
                        <UserCircle className="w-5 h-5 text-sky-500" />
                        {selectedPost.panel[2]}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No panels assigned to this job.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {showDeleteConfirm && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl p-6 w-full max-w-md m-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <h3 className="text-xl font-semibold text-gray-800">Confirm Deletion</h3>
            </div>
            <p className="text-gray-600 mb-6">Are you sure you want to delete this job post? This action cannot be undone.</p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setPostToDelete(null);
                }}
                disabled={isDeletingPost}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeletingPost}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center min-w-[80px]"
              >
                {isDeletingPost ? (
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
                    Deleting...
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};