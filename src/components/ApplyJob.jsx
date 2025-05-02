import React, { useEffect, useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import toast, { Toaster } from 'react-hot-toast';
import CandidateForm from './Candidateform';

const ApplyJob = () => {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [jobTitle, setJobTitle] = useState(location.state?.jobTitle || "Job Position");
  
  useEffect(() => {
    const parsedId = parseInt(id);
    if (!id || isNaN(parsedId) || parsedId <= 0) {
      toast.error("Invalid job ID");
      navigate('/jobs');
      return;
    }
    
    // If no job title is provided in state, you could fetch it here
    if (!location.state?.jobTitle) {
      // Optional: Fetch job title from API using the ID
      // For now, we'll use a default
      console.log("No job title provided in navigation state");
    }
  }, [id, location.state, navigate]);

  return (
    <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
      <Toaster/>
      <div className="flex-1 container mx-auto px-4 py-4 flex flex-col items-center">
        <div className="w-full max-w-4xl h-full">
          {id && (
            <CandidateForm 
              jobId={parseInt(id)}
              jobTitle={jobTitle}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ApplyJob;