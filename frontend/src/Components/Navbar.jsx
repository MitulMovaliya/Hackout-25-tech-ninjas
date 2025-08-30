import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { isAuthenticated, getUser, logout } from "../utils/auth";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      const authStatus = isAuthenticated();
      setIsLoggedIn(authStatus);
      if (authStatus) {
        setUser(getUser());
      }
    };

    checkAuth();
    // Check auth status on storage change (for cross-tab login/logout)
    window.addEventListener("storage", checkAuth);
    return () => window.removeEventListener("storage", checkAuth);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleLogout = () => {
    logout();
    setIsLoggedIn(false);
    setUser(null);
  };

  return (
    <nav className="fixed top-0 left-0 w-full bg-white text-black shadow-lg z-50 border-b border-green-100">
      <div className="max-w-7xl mx-auto flex justify-between items-center px-4 sm:px-6 py-3">
        {/* Logo */}
        <h1 className="text-xl sm:text-2xl text-green-700 font-bold">
          <Link
            to="/"
            className="flex items-center gap-2 hover:text-green-800 transition-colors"
          >
            <i className="fa-solid fa-tree text-green-600"></i>
            <span>MangroveWatch</span>
          </Link>
        </h1>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-4">
          <Link
            to="/"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-green-100 text-green-700 hover:bg-green-500 hover:text-white transition-all duration-300"
          >
            <i className="fa-solid fa-house-chimney"></i>
            <span>Home</span>
          </Link>

          <Link
            to="/report"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-green-100 text-green-700 hover:bg-green-500 hover:text-white transition-all duration-300"
          >
            <i className="fa-regular fa-file-lines"></i>
            <span>Report</span>
          </Link>

          <Link
            to="/leaderboard"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-green-100 text-green-700 hover:bg-green-500 hover:text-white transition-all duration-300"
          >
            <i className="fa-solid fa-chart-column"></i>
            <span>Leaderboard</span>
          </Link>

          <Link
            to="/profile"
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-green-100 text-green-700 hover:bg-green-500 hover:text-white transition-all duration-300"
          >
            <i className="fa-solid fa-user"></i>
            <span>Profile</span>
          </Link>

          {isLoggedIn ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 px-2">
                Welcome, {user?.fullName?.split(" ")[0] || "User"}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-all duration-300"
              >
                <i className="fa-solid fa-sign-out-alt"></i>
                <span>Logout</span>
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border-2 border-green-700 text-green-700 hover:bg-green-700 hover:text-white transition-all duration-300"
            >
              <i className="fa-solid fa-sign-in-alt"></i>
              <span>Login</span>
            </Link>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={toggleMenu}
          className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg border-2 border-green-700 text-green-700 hover:bg-green-700 hover:text-white transition-all duration-300"
          aria-label="Toggle navigation menu"
        >
          <i className={`fa-solid ${isMenuOpen ? "fa-times" : "fa-bars"}`}></i>
        </button>
      </div>

      {/* Mobile Navigation Menu */}
      {isMenuOpen && (
        <div className="lg:hidden bg-white border-t border-green-100 shadow-lg">
          <div className="px-4 py-2 space-y-2">
            <Link
              to="/"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-green-700 hover:bg-green-50 transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              <i className="fa-solid fa-house-chimney w-5"></i>
              <span>Home</span>
            </Link>

            <Link
              to="/report"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-green-700 hover:bg-green-50 transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              <i className="fa-regular fa-file-lines w-5"></i>
              <span>Report</span>
            </Link>

            <Link
              to="/leaderboard"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-green-700 hover:bg-green-50 transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              <i className="fa-solid fa-chart-column w-5"></i>
              <span>Leaderboard</span>
            </Link>

            <Link
              to="/profile"
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-green-700 hover:bg-green-50 transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              <i className="fa-solid fa-user w-5"></i>
              <span>Profile</span>
            </Link>

            {isLoggedIn ? (
              <div className="px-4 py-3 space-y-2">
                <div className="text-sm text-gray-600 px-2 py-1">
                  Welcome, {user?.fullName?.split(" ")[0] || "User"}
                </div>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-red-600 text-red-600 hover:bg-red-600 hover:text-white transition-all duration-300"
                >
                  <i className="fa-solid fa-sign-out-alt w-5"></i>
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-green-700 text-green-700 hover:bg-green-700 hover:text-white transition-all duration-300 mx-2 my-2"
                onClick={() => setIsMenuOpen(false)}
              >
                <i className="fa-solid fa-sign-in-alt w-5"></i>
                <span>Login</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
