import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom"; 
import logo from "../assets/logo.png"; 
import { navItems } from "../constants";
import { ChevronDown, Menu, X } from "lucide-react";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="h-[76px]"> {/* Add wrapper div with fixed height */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300
        ${isScrolled 
          ? 'py-3 bg-gray-900/95 backdrop-blur-sm border-b border-white/5 shadow-xl shadow-black/5' 
          : 'py-5 bg-gradient-to-r from-gray-900 via-black to-gray-900'}`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Logo Section */}
            <Link 
              to="/" 
              className="flex items-center space-x-3 group"
            >
              <div className="relative">
                <div className="absolute -inset-1.5 bg-gradient-to-r from-blue-600 to-cyan-500 
                  rounded-full opacity-0 group-hover:opacity-25 blur-sm transition-all duration-300" />
                <img 
                  src={logo} 
                  alt="Logo" 
                  className="h-12 w-12 relative transform group-hover:scale-105 transition-transform duration-300" 
                />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text 
                text-transparent group-hover:from-blue-400 group-hover:to-cyan-400 transition-all duration-300">
                Innovative Hiring
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-1">
              {navItems.map((item, index) =>
                item.type !== "kebab" && (
                  <Link
                    key={index}
                    to={item.href}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300
                      ${location.pathname === item.href
                        ? 'text-blue-400 bg-blue-500/10'
                        : 'text-gray-300 hover:text-white hover:bg-white/5'
                      }`}
                  >
                    {item.label}
                  </Link>
                )
              )}

              {/* Account Button */}
              <div className="relative ml-2">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center space-x-1 px-4 py-2 rounded-lg text-gray-300 
                    hover:text-white hover:bg-white/5 transition-all duration-300"
                >
                  <span className="font-medium">Account</span>
                  <ChevronDown 
                    size={16} 
                    className={`transform transition-transform duration-300 ${menuOpen ? 'rotate-180' : ''}`} 
                  />
                </button>

                {/* Dropdown */}
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-48 py-2 bg-gray-900/95 backdrop-blur-sm 
                    rounded-lg shadow-xl border border-white/10 z-50 animate-in fade-in slide-in-from-top-5">
                    {navItems.find(item => item.type === "kebab")?.items.map((subItem, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          navigate(subItem.href);
                          setMenuOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:text-white 
                          hover:bg-gradient-to-r from-blue-500/10 to-cyan-500/10 transition-all duration-300"
                      >
                        {subItem.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6 text-gray-300" />
              ) : (
                <Menu className="w-6 h-6 text-gray-300" />
              )}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="lg:hidden fixed inset-x-0 top-[73px] p-4 bg-gray-900/95 backdrop-blur-sm 
              border-b border-white/5 animate-in slide-in-from-top duration-300">
              <div className="space-y-1">
                {navItems.map((item, index) =>
                  item.type !== "kebab" && (
                    <Link
                      key={index}
                      to={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300
                        ${location.pathname === item.href
                          ? 'text-blue-400 bg-blue-500/10'
                          : 'text-gray-300 hover:text-white hover:bg-white/5'
                        }`}
                    >
                      {item.label}
                    </Link>
                  )
                )}
                
                {/* Mobile Account Buttons */}
                <div className="pt-4 mt-4 border-t border-white/10">
                  {navItems.find(item => item.type === "kebab")?.items.map((subItem, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        navigate(subItem.href);
                        setMobileMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 mb-2 text-sm font-medium text-white rounded-lg
                        bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700
                        transition-all duration-300"
                    >
                      {subItem.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>
    </div>
  );
};

export default Navbar;
