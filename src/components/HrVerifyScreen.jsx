import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, User, CheckCircle2, Clock, Book, ArrowRight, ClipboardCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const EmptyVerificationState = () => (
  <div className="flex flex-col items-center justify-center h-[calc(100vh-16rem)] bg-white rounded-2xl p-8 text-center">
    <div className="bg-blue-50 p-4 rounded-full mb-6">
      <ClipboardCheck className="w-16 h-16 text-blue-500" />
    </div>
    <h3 className="text-2xl font-semibold text-gray-800 mb-3">
      No Reported Candidates Yet
    </h3>
    <p className="text-gray-600 mb-8 max-w-md">
      Posts with reported candidates will appear here. You'll be able to review interview recordings and MCQ results once candidates are reported by panel members.
    </p>
    <div className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl">
      <Calendar className="w-5 h-5" />
      Check back later for updates
    </div>
  </div>
);

export const HrVerifyScreen = () => {
  const [reportedPosts, setReportedPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchReportedPosts = async () => {
      try {
        // New endpoint to get posts with reported candidates
        const response = await fetch('http://localhost:5005/posts-with-reported-candidates');
        if (!response.ok) throw new Error('Failed to fetch posts');
        const data = await response.json();
        setReportedPosts(data);
      } catch (err) {
        console.error('Error fetching reported posts:', err);
        toast.error('Failed to fetch reported posts');
      } finally {
        setLoading(false);
      }
    };

    fetchReportedPosts();
  }, []);

  const handlePostClick = async (postId) => {
    try {
      const response = await fetch(`http://localhost:5005/get-reportable-candidate/${postId}`);
      if (!response.ok) throw new Error('Failed to fetch candidates');
      const data = await response.json();
      
      // Update the navigation path to match the route in App.jsx
      if (data.mcq.length > 0 || data.interview.length > 0) {
        navigate(`/verify/${postId}`);  // This should now match the route path
      } else {
        toast.error('No reported candidates found for this post');
      }
    } catch (err) {
      console.error('Error:', err);
      toast.error('Failed to fetch candidate details');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-16rem)]">
        <div className="relative w-20 h-20">
          <div className="absolute top-0 left-0 right-0 bottom-0">
            <div className="border-4 border-blue-200 border-t-blue-600 rounded-full w-20 h-20 animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
          <CheckCircle2 className="w-7 h-7 text-blue-600" />
          Verify Reported Candidates
        </h1>
        <p className="text-gray-600 mt-1">
          Review interview recordings and MCQ results for candidates reported by panel members
        </p>
      </div>

      {reportedPosts.length === 0 ? (
        <EmptyVerificationState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reportedPosts.map((post) => (
            <div
              key={post.post_id}
              onClick={() => handlePostClick(post.post_id)}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 ${
                  post.exam_type === 'MCQ' 
                    ? 'bg-blue-50' 
                    : 'bg-green-50'
                  } rounded-full flex items-center justify-center`}
                >
                  {post.exam_type === 'MCQ' ? (
                    <Book className="w-5 h-5 text-blue-600" />
                  ) : (
                    <User className="w-5 h-5 text-green-600" />
                  )}
                </div>
                <span className={`px-3 py-1 ${
                  post.exam_type === 'MCQ'
                    ? 'bg-blue-50 text-blue-700'
                    : 'bg-green-50 text-green-700'
                  } text-sm font-medium rounded-full`}
                >
                  {post.exam_type}
                </span>
              </div>

              <h2 className="text-lg font-semibold text-gray-800 mb-2">
                {post.title}
              </h2>

              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="w-4 h-4 mr-2" />
                  Created: {new Date(post.created_at).toLocaleDateString()}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="w-4 h-4 mr-2" />
                  Duration: {post.time === 1 ? '1 minute' : `${post.time} minutes`}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex items-center">
                  <div className="w-2 h-2 rounded-full mr-2 bg-blue-500" />
                  <span className="text-sm font-medium text-gray-600">
                    View Details
                  </span>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
