import React from "react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="bg-gradient-to-r from-green-900 via-green-800 to-emerald-700 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2 mb-4">
              <i className="fa-solid fa-tree text-green-400"></i>
              <span>MangroveWatch</span>
            </h1>
            <p className="text-sm sm:text-base text-gray-300 leading-relaxed mb-6 max-w-md">
              Protecting nature, empowering communities. Together we can restore
              and preserve mangroves for a greener tomorrow. Join our mission to
              safeguard coastal ecosystems worldwide.
            </p>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 text-sm text-green-300">
                <i className="fa-solid fa-users"></i>
                <span>3,456+ Active Members</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-green-300">
                <i className="fa-solid fa-chart-line"></i>
                <span>1,247+ Reports Filed</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h2 className="text-lg sm:text-xl font-semibold mb-4 text-green-300">
              Quick Links
            </h2>
            <ul className="space-y-3">
              <li>
                <Link
                  to="/"
                  className="text-gray-300 hover:text-green-400 transition-colors duration-300 flex items-center gap-2"
                >
                  <i className="fa-solid fa-house-chimney text-xs"></i>
                  <span>Home</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/report"
                  className="text-gray-300 hover:text-green-400 transition-colors duration-300 flex items-center gap-2"
                >
                  <i className="fa-regular fa-file-lines text-xs"></i>
                  <span>Report Issue</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/leaderboard"
                  className="text-gray-300 hover:text-green-400 transition-colors duration-300 flex items-center gap-2"
                >
                  <i className="fa-solid fa-chart-column text-xs"></i>
                  <span>Leaderboard</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/profile"
                  className="text-gray-300 hover:text-green-400 transition-colors duration-300 flex items-center gap-2"
                >
                  <i className="fa-solid fa-user text-xs"></i>
                  <span>Profile</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/login"
                  className="text-gray-300 hover:text-green-400 transition-colors duration-300 flex items-center gap-2"
                >
                  <i className="fa-solid fa-sign-in-alt text-xs"></i>
                  <span>Login</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Social */}
          <div>
            <h2 className="text-lg sm:text-xl font-semibold mb-4 text-green-300">
              Connect With Us
            </h2>
            <div className="space-y-4">
              <div className="flex flex-col space-y-2 text-sm text-gray-300">
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-envelope text-green-400"></i>
                  <span>info@mangrovewatch.org</span>
                </div>
                <div className="flex items-center gap-2">
                  <i className="fa-solid fa-phone text-green-400"></i>
                  <span>+1 (555) 123-4567</span>
                </div>
              </div>

              <div>
                <p className="text-sm text-gray-400 mb-3">
                  Follow us on social media
                </p>
                <div className="flex gap-3">
                  <a
                    href="#"
                    className="w-10 h-10 rounded-full bg-green-800 hover:bg-green-600 transition-colors duration-300 flex items-center justify-center text-white"
                    aria-label="Facebook"
                  >
                    <i className="fa-brands fa-facebook text-lg"></i>
                  </a>
                  <a
                    href="#"
                    className="w-10 h-10 rounded-full bg-green-800 hover:bg-green-600 transition-colors duration-300 flex items-center justify-center text-white"
                    aria-label="Twitter"
                  >
                    <i className="fa-brands fa-twitter text-lg"></i>
                  </a>
                  <a
                    href="#"
                    className="w-10 h-10 rounded-full bg-green-800 hover:bg-green-600 transition-colors duration-300 flex items-center justify-center text-white"
                    aria-label="Instagram"
                  >
                    <i className="fa-brands fa-instagram text-lg"></i>
                  </a>
                  <a
                    href="#"
                    className="w-10 h-10 rounded-full bg-green-800 hover:bg-green-600 transition-colors duration-300 flex items-center justify-center text-white"
                    aria-label="LinkedIn"
                  >
                    <i className="fa-brands fa-linkedin text-lg"></i>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-green-700 mt-12 pt-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-gray-300">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <span>
                © {new Date().getFullYear()} MangroveWatch. All rights reserved.
              </span>
              <div className="flex gap-4">
                <a href="#" className="hover:text-green-400 transition-colors">
                  Privacy Policy
                </a>
                <a href="#" className="hover:text-green-400 transition-colors">
                  Terms of Service
                </a>
                <a href="#" className="hover:text-green-400 transition-colors">
                  Contact
                </a>
              </div>
            </div>
            <div className="flex items-center gap-2 text-green-300">
              <i className="fa-solid fa-heart text-red-400"></i>
              <span>Made with love for our planet</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
