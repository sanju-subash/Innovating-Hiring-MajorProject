import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Timer, Users, Briefcase, Award, Calendar, ChevronRight, Search } from "lucide-react";

const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center min-h-[60vh]">
    <div className="relative">
      <div className="h-24 w-24 rounded-full border-t-4 border-b-4 border-cyan-400 animate-spin"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-16 w-16 rounded-full bg-gray-950"></div>
      </div>
    </div>
    <div className="mt-8 text-cyan-400 font-medium text-lg tracking-wide animate-pulse">
      Loading Opportunities...
    </div>
  </div>
);

const JobList = () => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        setLoading(true);
        const response = await fetch("http://localhost:5000/jobs", {
          headers: { Accept: "application/json" },
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Fetched jobs:", data); // Add this for debugging

        if (Array.isArray(data)) {
          setJobs(data);
        } else {
          console.error("Unexpected data format:", data);
          setError("Invalid data format received");
        }
      } catch (error) {
        console.error("Error fetching jobs:", error);
        setError("Failed to load jobs. Please try again later.");
        toast.error("Failed to load jobs");
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 text-center">
            <div className="text-red-400 text-xl font-medium">{error}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8"> {/* Reduced top padding */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 text-transparent bg-clip-text mb-4">
            Available Positions
          </h1>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Explore our current opportunities and find your next challenge
          </p>
        </div>

        <div className="space-y-8">
          {loading ? (
            <LoadingSpinner />
          ) : jobs.length > 0 ? (
            jobs.map((job) => (
              <div
                key={job.job_id}
                onClick={() => navigate(`/apply/${job.job_id}`, { 
                  state: { jobId: job.job_id, jobTitle: job.job_title }
                })}
                className="group relative bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800/50 
                  overflow-hidden transition-all duration-300 hover:border-cyan-500/50 hover:shadow-lg 
                  hover:shadow-cyan-500/10 cursor-pointer"
              >
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 opacity-0 
                  group-hover:opacity-100 transition-opacity duration-300"></div>

                <div className="relative p-8">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-4">
                      <h2 className="text-2xl font-bold text-white group-hover:text-cyan-400 
                        transition-colors duration-300">
                        {job.job_title}
                      </h2>
                      
                      <div className="flex flex-wrap gap-3">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm 
                          bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          <Briefcase className="w-4 h-4 mr-2" />
                          {job.exam_type}
                        </span>
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm 
                          bg-purple-500/10 text-purple-400 border border-purple-500/20">
                          <Award className="w-4 h-4 mr-2" />
                          {job.minimum_experience} years experience
                        </span>
                        {job.application_deadline && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm 
                            bg-red-500/10 text-red-400 border border-red-500/20">
                            <Timer className="w-4 h-4 mr-2" />
                            Deadline: {job.application_deadline}
                          </span>
                        )}
                      </div>

                      <p className="text-gray-400 leading-relaxed max-w-3xl">
                        {job.description}
                      </p>

                      <div className="pt-4 flex items-center text-sm text-cyan-400 font-medium">
                        Learn more
                        <ChevronRight className="w-4 h-4 ml-2 group-hover:translate-x-2 transition-transform" />
                      </div>
                    </div>

                    <div className="hidden lg:block">
                      <div className="w-12 h-12 rounded-xl bg-cyan-500/10 text-cyan-400 
                        flex items-center justify-center border border-cyan-500/20 
                        group-hover:scale-110 transition-transform">
                        <Users className="w-6 h-6" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-16 bg-gray-900/50 backdrop-blur-xl rounded-2xl 
              border border-gray-800/50">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full 
                bg-gray-800/50 text-cyan-400 mb-6">
                <Search className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">No Positions Available</h3>
              <p className="text-gray-400 max-w-md mx-auto">
                We don't have any open positions right now. Please check back later for new opportunities.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JobList;
