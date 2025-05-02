import React, { useState, useEffect } from "react";
import { Menu, Users, ChevronLeft, LogOut, RefreshCw, Trash, Check, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast, { Toaster } from 'react-hot-toast';
import { createPortal } from "react-dom";
import axios from "axios";

// Separate component for the form field to improve reusability
const FormField = ({ label, type = "text", value, onChange }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
    <input
      type={type}
      className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 
        focus:ring-blue-200 transition-all duration-300 hover:border-gray-300"
      value={value}
      onChange={onChange}
      placeholder={`Enter ${label.toLowerCase()}`}
    />
  </div>
);

// Separate component for the stats card to improve reusability
const StatsCard = ({ title, value, colorClass, icon: Icon }) => (
  <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300">
    <div className="flex items-center gap-4">
      <div className={`${colorClass} bg-opacity-10 p-3 rounded-lg`}>
        <Icon className={`w-6 h-6 ${colorClass}`} />
      </div>
      <div>
        <p className="text-sm text-gray-500">{title}</p>
        <h3 className={`text-2xl font-bold ${colorClass}`}>{value}</h3>
      </div>
    </div>
  </div>
);

// Add LoadingSpinner component at the top with other component definitions
const LoadingSpinner = () => (
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
);

// Add this component near the top of AdminDashboard.jsx with other component definitions
const DeleteConfirmToast = ({ onConfirm, onCancel }) => (
  <div className="flex items-center gap-3">
    <p className="font-medium">Are you sure you want to delete this user?</p>
    <div className="flex gap-2">
      <button
        onClick={onConfirm}
        className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
      >
        Delete
      </button>
      <button
        onClick={onCancel}
        className="px-3 py-1 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
      >
        Cancel
      </button>
    </div>
  </div>
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  
  // State management
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("users");
  const [usersList, setUsersList] = useState([]);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isTableLoading, setIsTableLoading] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState(null);
  // Add this with other state declarations
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  // Menu configuration
  const menuItems = [{ id: "users", icon: <Users />, label: "Manage Users" }];

  // Form handling functions
  const validateForm = () => {
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      toast.error("Please enter a valid email");
      return false;
    }
    if (!role) {
      toast.error("Please select a role");
      return false;
    }
    return true;
  };

  const handleCreateUser = async (event) => {
    event?.preventDefault();
    if (!validateForm()) return;

    setIsCreating(true);

    try {
      // Convert email to lowercase before checking
      const emailToCheck = email.toLowerCase();
      const checkEmailResponse = await fetch(`http://localhost:5000/api/check-email?email=${encodeURIComponent(emailToCheck)}`);
      const checkEmailData = await checkEmailResponse.json();

      if (checkEmailData.exists) {
        toast.error('This email is already registered');
        setIsCreating(false);
        return;
      }

      // If email doesn't exist, proceed with user creation
      // Note: Send original email case to maintain user's input
      const response = await fetch("http://localhost:5000/api/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email: email.toLowerCase(),
          role 
        }),
      });
      const data = await response.json();
      
      if (response.ok && data.success) {
        toast.success(data.message);
        await sendEmail();
        await fetchUsers(true); 
        setEmail("");
        setRole("");
      } else {
        toast.error(data.message || 'Failed to create user');
      }
    } catch (error) {
      toast.error("An error occurred while creating the user");
      console.error(error);
    } finally {
      setIsCreating(false);
    }
  };

  // API calls
  const sendEmail = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        toast.error("Failed to send email.");
      }
    } catch (error) {
      toast.error("Email service error.");
    }
  };

  const fetchUsers = async (isRefreshing = false) => {
    if (!isRefreshing) {
      setIsLoading(true); // Only set full page loading when not refreshing
    }
    setIsTableLoading(true); // Always set table loading
  
    try {
      const response = await fetch("http://localhost:5000/api/get-users");
      const data = await response.json();
      if (response.ok) setUsersList(data);
      else toast.error("Failed to load users.");
    } catch (error) {
      toast.error("Error fetching users.");
    } finally {
      if (!isRefreshing) {
        setIsLoading(false);
      }
      setIsTableLoading(false);
    }
  };

  const handleUpdateStatus = async (userId, newStatus) => {
    setUpdatingUserId(userId);
    try {
      const response = await fetch("http://localhost:5000/update-user-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, status: newStatus }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        await fetchUsers(true); // Use table-only refresh
        toast.success(data.message);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Failed to update status.");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeleteUser = (userId) => {
    setUserToDelete(userId);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      setUpdatingUserId(userToDelete);
      const response = await axios.delete(`http://localhost:5000/api/delete-user/${userToDelete}`);
      
      if (response.data?.success) {
        await fetchUsers(true);
        toast.success('User deleted successfully');
      } else {
        toast.error(response.data?.message || 'Failed to delete user');
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error.response?.data?.message || 'Failed to delete user');
    } finally {
      setUpdatingUserId(null);
      setShowDeleteConfirm(false);
      setUserToDelete(null);
    }
  };

  // Auth handling
  const handleLogout = () => setShowLogoutConfirm(true);
  
  const confirmLogout = () => {
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userId");
    localStorage.removeItem("username");
    localStorage.removeItem("email");
    sessionStorage.clear();
    navigate("/login", { replace: true });
  };

  // Initial data fetch
  useEffect(() => {
    fetchUsers();
  }, []);

  // UI Components
  const SidebarButton = ({ id, icon, label, onClick, isActive }) => (
    <button
      onClick={onClick}
      className={`w-full flex items-center p-3 rounded-lg transition-colors
        ${isActive ? "bg-blue-600" : "hover:bg-slate-700"}`}
    >
      {icon}
      {isSidebarOpen && <span className="ml-3">{label}</span>}
    </button>
  );

  const UsersTable = ({ users, onRefresh }) => (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={onRefresh}
          className="px-4 py-2 bg-white text-gray-700 rounded-lg hover:bg-gray-50 
          transition-all duration-200 flex items-center gap-2 group shadow-sm 
          hover:shadow-md border border-gray-200"
        >
          <RefreshCw 
            className={`w-4 h-4 ${isTableLoading ? 'animate-spin' : 'group-hover:rotate-180'}`} 
          />
          {isTableLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                  {user.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                  {user.email}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium
                    ${user.role === 'Admin' 
                      ? 'bg-purple-100 text-purple-700' 
                      : user.role === 'Hr'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-green-100 text-green-700'
                    }`}>
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-3 py-1 text-xs font-medium rounded-full 
                    ${user.status === "Activated" 
                      ? "bg-green-100 text-green-700" 
                      : "bg-red-100 text-red-700"}`}>
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {updatingUserId === user.id ? (
                      <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"/>
                    ) : (
                      <>
                        {user.role !== 'Admin' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(user.id, user.status === "Activated" ? "Deactivated" : "Activated")}
                              className={`p-2 rounded-lg transition-all duration-200 ${
                                user.status === "Activated" 
                                  ? "bg-red-100 text-red-600 hover:bg-red-200 hover:shadow-md" 
                                  : "bg-green-100 text-green-600 hover:bg-green-200 hover:shadow-md"
                              }`}
                              title={user.status === "Activated" ? "Deactivate User" : "Activate User"}
                            >
                              {user.status === "Activated" ? (
                                <Trash className="w-4 h-4" />
                              ) : (
                                <Check className="w-4 h-4" />
                              )}
                            </button>
                            
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 
                                hover:shadow-md transition-all duration-200"
                              title="Delete User"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile menu trigger */}
      <button
        onClick={() => setSidebarOpen(!isSidebarOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-slate-800 text-white rounded-lg"
      >
        <Menu />
      </button>

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full bg-slate-800 text-white transition-all duration-300 z-40 
        ${isSidebarOpen ? 'w-64' : 'w-0 md:w-20'}`}>
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          {isSidebarOpen && <h2 className="text-xl font-bold">Admin Dashboard</h2>}
        </div>

        <nav className="mt-6 space-y-2 px-2 flex flex-col h-[calc(100%-5rem)]">
          <div className="space-y-2">
            {menuItems.map(({ id, icon, label }) => (
              <SidebarButton
                key={id}
                id={id}
                icon={icon}
                label={label}
                onClick={() => setActiveTab(id)}
                isActive={activeTab === id}
              />
            ))}
          </div>
          
          {/* Logout Button - Moved to bottom of sidebar */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center p-3 rounded-lg transition-colors hover:bg-red-600 mt-auto"
          >
            <LogOut />
            {isSidebarOpen && <span className="ml-3">Logout</span>}
          </button>
        </nav>

        {/* Add collapse button with matching styles */}
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

      {/* Main content */}
      <main className={`transition-all duration-300 p-6 ${isSidebarOpen ? 'md:ml-64' : 'md:ml-20'}`}>
        <div className="bg-white rounded-2xl shadow-sm mt-12 md:mt-0 border border-gray-100">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Users className="w-7 h-7 text-blue-600" />
              Manage Users
            </h1>
            <p className="text-gray-600 mt-1">
              Create and manage HR and Panel member accounts, monitor user status and control access permissions
            </p>
          </div>
          
          <div className="p-6">
            {isLoading ? (
              <LoadingSpinner />
            ) : (
              <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <StatsCard 
                    title="Total Users" 
                    value={usersList.length}
                    colorClass="text-blue-600"
                    icon={Users}
                  />
                  <StatsCard 
                    title="HR Members" 
                    value={usersList.filter(user => user.role === "Hr").length}
                    colorClass="text-green-600"
                    icon={Users}
                  />
                  <StatsCard 
                    title="Panel Members" 
                    value={usersList.filter(user => user.role === "Panel").length}
                    colorClass="text-yellow-600"
                    icon={Users}
                  />
                </div>

                {/* Create User Form */}
                <div className="bg-gray-50 p-6 rounded-lg mb-6">
                  <h3 className="text-lg font-medium mb-4">Create New User</h3>
                  <div className="space-y-4">
                    <FormField 
                      label="Email" 
                      type="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
                      <select
                        className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                      >
                        <option value="">Select role</option>
                        <option value="Hr">HR</option>
                        <option value="Panel">Panel Member</option>
                      </select>
                    </div>
                    <button
                      onClick={handleCreateUser}
                      disabled={isCreating}
                      className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 ${
                        isCreating
                          ? 'bg-gray-500 cursor-not-allowed' 
                          : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-md hover:shadow-lg group'
                      } text-white`}
                    >
                      {isCreating ? (
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
                          Creating...
                        </>
                      ) : (
                        'Create User'
                      )}
                    </button>
                  </div>
                </div>

                {/* Users Table */}
                <UsersTable 
                  users={usersList} 
                  onRefresh={() => fetchUsers(true)} // Pass true to indicate refresh mode
                />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Logout Modal */}
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
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && createPortal(
        <div className="fixed inset-0 z-[9999] isolate">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="fixed inset-0 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-96 p-6 relative z-10">
              <h3 className="text-xl font-bold mb-4">Confirm Delete</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this user? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setUserToDelete(null);
                  }}
                  disabled={updatingUserId}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 disabled:bg-gray-100 disabled:text-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={updatingUserId}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:bg-red-400 flex items-center gap-2 min-w-[80px] justify-center"
                >
                  {updatingUserId ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
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

      <Toaster/>
    </div>
  );
};

export default AdminDashboard;
