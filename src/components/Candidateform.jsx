import React, { useState, useEffect } from "react";
import { User, Mail, Phone, FileText, Upload, CheckCircle, X, ArrowLeft } from "lucide-react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";

const LoadingSpinner = () => (
  <div className="flex flex-col items-center justify-center min-h-[40vh]"> {/* Changed from 60vh to 40vh */}
    <div className="relative">
      <div className="h-24 w-24 rounded-full border-t-4 border-b-4 border-cyan-400 animate-spin"></div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="h-16 w-16 rounded-full bg-gray-950"></div>
      </div>
    </div>
    <div className="mt-8 text-cyan-400 font-medium text-lg tracking-wide animate-pulse">
      Submitting Application...
    </div>
  </div>
);

const CandidateForm = ({ jobId, jobTitle }) => {
  // Add new state for confirmation
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    resume: null
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!jobId || isNaN(jobId) || jobId <= 0) {
      console.error('Invalid or missing job ID');
      // You could set some error state here if needed
      return;
    }
    // Any initialization code with the jobId can go here
  }, [jobId]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const checkExistingApplication = async (email) => {
    try {
      const response = await axios.post("http://127.0.0.1:5000/api/check-application", {
        email: email,
        job_id: jobId
      });
      return response.data.exists;
    } catch (error) {
      console.error("Error checking application:", error);
      return false;
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    const allowedFileTypes = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/png", "image/jpeg"];
    if (file && allowedFileTypes.includes(file.type)) {
      setFormData({ ...formData, resume: file });
    } else {
      toast.error("Invalid file type. Upload PDF, DOCX, PNG, or JPG.");
      e.target.value = "";
    }
  };

  // Add new confirmation handler
  const handleConfirmSubmit = () => {
    setShowConfirmation(true);
  };

  // Modify handleSubmit to remove toast loading
  const handleSubmit = async (e) => {
    e.preventDefault();
    handleConfirmSubmit(); // Show confirmation instead of submitting directly
  };

  // Modify the handleFinalSubmit function
  const handleFinalSubmit = async () => {
    setShowConfirmation(false); // Close confirmation window first
    setLoading(true);
    try {
      // Check for existing application first
      const exists = await checkExistingApplication(formData.email);
      if (exists) {
        toast.error("You have already applied for this position!");
        setLoading(false);
        return;
      }

      const formDataObj = new FormData();
      formDataObj.append("name", formData.name);
      formDataObj.append("email", formData.email);
      formDataObj.append("phone", formData.phone);
      formDataObj.append("job_id", jobId.toString());
      if (formData.resume) {
        formDataObj.append("resume", formData.resume);
      }

      const response = await axios.post("http://127.0.0.1:5001/submit", formDataObj, {
        headers: { 
          "Content-Type": "multipart/form-data"
        },
        timeout: 60000,
      });
      
      if (response.data.success) {
        // Reset form data
        setFormData({
          name: "",
          email: "",
          phone: "",
          resume: null
        });
        
        // Reset file input more safely
        const fileInput = document.querySelector('input[type="file"]');
        if (fileInput) {
          fileInput.value = "";
        }

        toast.success("Application submitted successfully!");
      } else {
        throw new Error(response.data.error || "Failed to submit application");
      }
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        toast.error("Request timed out. Please try uploading again.");
      } else if (error.response?.status === 413) {
        toast.error("File is too large. Please upload a smaller file.");
      } else if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error("Error submitting application. Please try again.");
      }
      console.error("Submission error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Add Confirmation Modal Component
  const ConfirmationModal = () => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 max-w-md w-full mx-4 
        animate-in fade-in slide-in-from-bottom-4">
        <div className="flex items-center gap-3 mb-6">
          <CheckCircle className="w-8 h-8 text-cyan-400" />
          <h3 className="text-2xl font-bold text-white">Confirm Application</h3>
        </div>
        
        <div className="space-y-4 mb-8">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <p className="text-gray-400 text-sm mb-1 flex items-center gap-2">
              <User className="w-4 h-4" /> Full Name
            </p>
            <p className="text-white">{formData.name}</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <p className="text-gray-400 text-sm mb-1 flex items-center gap-2">
              <Mail className="w-4 h-4" /> Email Address
            </p>
            <p className="text-white">{formData.email}</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <p className="text-gray-400 text-sm mb-1 flex items-center gap-2">
              <Phone className="w-4 h-4" /> Phone Number
            </p>
            <p className="text-white">{formData.phone}</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <p className="text-gray-400 text-sm mb-1 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Resume File
            </p>
            <p className="text-white">{formData.resume?.name}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            onClick={() => setShowConfirmation(false)}
            className="px-4 py-2 rounded-lg border border-gray-700 text-gray-300 
              hover:bg-gray-800 transition-colors text-sm flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Edit
          </button>
          <button
            onClick={handleFinalSubmit}
            className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 
              text-white text-sm font-medium hover:from-cyan-600 hover:to-blue-600 
              transition-colors flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4" /> Confirm & Submit
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 text-white">
      <Toaster position="top-center" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 text-transparent bg-clip-text mb-4">
            Join Our Team
          </h1>
          <div className="inline-flex items-center px-6 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20">
            <span className="text-xl text-cyan-400 font-medium">{jobTitle}</span>
          </div>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : (
          <div className="max-w-3xl mx-auto">
            <div className="bg-gray-900/50 backdrop-blur-xl rounded-2xl border border-gray-800/50 
              overflow-hidden transition-all duration-300 hover:border-cyan-500/50 hover:shadow-lg 
              hover:shadow-cyan-500/10 p-8">
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-cyan-400 
                      transition-transform group-focus-within:scale-110" />
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="Full Name"
                      required
                      className="w-full pl-12 pr-4 py-4 rounded-xl bg-gray-800/50 border-2 border-gray-700/50 
                        text-white placeholder-gray-400 focus:border-cyan-500/50 focus:ring-2 
                        focus:ring-cyan-500/20 transition-all duration-300"
                    />
                  </div>

                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-cyan-400 
                      transition-transform group-focus-within:scale-110" />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="Email Address"
                      required
                      className="w-full pl-12 pr-4 py-4 rounded-xl bg-gray-800/50 border-2 border-gray-700/50 
                        text-white placeholder-gray-400 focus:border-cyan-500/50 focus:ring-2 
                        focus:ring-cyan-500/20 transition-all duration-300"
                    />
                  </div>

                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-cyan-400 
                      transition-transform group-focus-within:scale-110" />
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="Phone Number"
                      required
                      className="w-full pl-12 pr-4 py-4 rounded-xl bg-gray-800/50 border-2 border-gray-700/50 
                        text-white placeholder-gray-400 focus:border-cyan-500/50 focus:ring-2 
                        focus:ring-cyan-500/20 transition-all duration-300"
                    />
                  </div>

                  <div className="relative group">
                    <FileText className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-cyan-400 
                      transition-transform group-focus-within:scale-110" />
                    <input
                      type="file"
                      accept=".pdf,.docx,.png,.jpg"
                      onChange={handleFileChange}
                      required
                      className="w-full pl-12 pr-4 py-4 rounded-xl bg-gray-800/50 border-2 border-gray-700/50 
                        text-white file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 
                        file:bg-cyan-500/10 file:text-cyan-400 file:cursor-pointer 
                        hover:file:bg-cyan-500/20 cursor-pointer focus:border-cyan-500/50 
                        focus:ring-2 focus:ring-cyan-500/20 transition-all duration-300"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-xl font-semibold text-lg transition-all duration-300 
                    flex items-center justify-center gap-2 group
                    bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-blue-500 hover:to-cyan-500 
                    text-white shadow-lg hover:shadow-cyan-500/25 disabled:opacity-50 
                    disabled:cursor-not-allowed disabled:hover:shadow-none"
                >
                  {loading ? (
                    <>
                      <Upload className="w-5 h-5 animate-bounce" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      <span>Submit Application</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="mt-8 text-center text-sm text-gray-400">
              <p>By submitting this application, you agree to our terms and conditions.</p>
              <p>Only PDF, DOCX, PNG, and JPG files are accepted for resume upload.</p>
            </div>
          </div>
        )}

        {showConfirmation && <ConfirmationModal />}
      </div>
    </div>
  );
};

export default CandidateForm;
