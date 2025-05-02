import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Homepage from "./components/Homepage";
import LoginPage from "./components/Loginpage";
import Candidateform from "./components/Candidateform";
import AdminDashboard from "./components/AdminDashboard";
import Registerform from "./components/Registerform";
import JobList from "./components/Joblist";
import HRDashboard from "./components/Hrdashboard";
import PanelDashboard from "./components/paneldashboard";
import MCQPanelInterface from "./components/McqQuestion"; // Import MCQ Panel Interface
import ApplyJob from "./components/ApplyJob"; // Import ApplyJob component
import { Rules } from "./components/Rules"; // Add import for Rules component
import { Interview } from "./components/Interview";
import { InterviewMCQ } from "./components/InterviewMCQ";
import { RankingsAnalytics } from "./components/Analytics";
import { MCQRankings } from "./components/AnalyticsMCQ";
import { HrVerifyCandidates } from './components/HrVerifyCandidates';
import { ThankYou } from './components/ThankYou';
import { NotFound } from './components/NotFound';
import UnauthorizedAccess from "./components/UnauthorizedAccess"; // Import UnauthorizedAccess component

const FullLayout = ({ children }) => (
  <>
    <Navbar />
    {children}
    <Footer />
  </>
);

const NavOnlyLayout = ({ children }) => (
  <>
    <Navbar />
    {children}
  </>
);

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const isAuthenticated = localStorage.getItem("isAuthenticated") === "true";
  const userRole = localStorage.getItem("userRole");

  if (!isAuthenticated) {
    // Redirect to UnauthorizedAccess if not authenticated
    return <Navigate to="/unauthorized" replace />;
  }

  if (!allowedRoles.includes(userRole?.toLowerCase())) {
    // Redirect to UnauthorizedAccess if the role is not allowed
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

// Remove the PanelDashboardLayout wrapper and update the routes
const App = () => {
  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <FullLayout>
              <Homepage />
            </FullLayout>
          }
        />

        {/* Job List Page */}
        <Route
          path="/jobs"
          element={
            <NavOnlyLayout>
              <JobList />
            </NavOnlyLayout>
          }
        />

        {/* Candidate Form with Job Details */}
        <Route
          path="/apply/:id"
          element={
            <NavOnlyLayout>
              <ApplyJob />
            </NavOnlyLayout>
          }
        />

        <Route
          path="/candidateform"
          element={
            <NavOnlyLayout>
              <Candidateform />
            </NavOnlyLayout>
          }
        />

        <Route path="/register" element={<Registerform />} />
        <Route path="/login" element={<LoginPage />} />

        {/* Admin Dashboard - Restricted to Admins */}
        <Route path="/admindashboard" element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        } />

        {/* HR Post Creation - Restricted to HR */}
        <Route path="/hrpost" element={
          <ProtectedRoute allowedRoles={["hr"]}>
            <HRDashboard />
          </ProtectedRoute>
        } />

        {/* Panel Dashboard - Restricted to Panel Members */}
        <Route path="/panel/*" element={
          <ProtectedRoute allowedRoles={["panel"]}>
            <Routes>
              <Route path="/" element={<PanelDashboard />} />
              <Route path="analytics/mcq/:postId" element={<MCQRankings />} />
              <Route path="analytics/interview/:postId" element={<RankingsAnalytics />} />
            </Routes>
          </ProtectedRoute>
        } />

        {/* MCQ Panel Interface - Restricted to Panel Members */}
        <Route path="/mcq-panel" element={
          <ProtectedRoute allowedRoles={["panel"]}>
            <MCQPanelInterface />
          </ProtectedRoute>
        } />

        {/* Updated Rules/Test route without any layout */}
        <Route
          path="/test/:candidateId/:postId"
          element={<Rules />}
        />

        <Route path="/mcq" element={<InterviewMCQ />} />
        <Route path="/interview/:candidateId/:postId" element={<Interview />} />

        {/* Add new route for HrVerifyCandidates */}
        <Route 
          path="/verify/:postId" 
          element={
            <ProtectedRoute allowedRoles={["hr"]}>
              <HrVerifyCandidates />
            </ProtectedRoute>
          } 
        />

        <Route path="/thank-you" element={<ThankYou />} />

        {/* Unauthorized Page */}
        <Route path="/unauthorized" element={<UnauthorizedAccess />} />

        {/* 404 Page */}
        <Route
          path="*"
          element={<NotFound />}
        />
      </Routes>
    </Router>
  );
};

export default App;
