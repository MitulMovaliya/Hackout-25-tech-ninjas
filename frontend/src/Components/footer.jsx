import React from "react";


const Footer = () => {
  return (
    <footer className="from-green-600 to-emerald-500 text-white py-10 mt-16">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Brand Section */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <i className="fa-solid fa-tree text-green-400"></i> MangroveWatch
          </h1>
          <p className="mt-4 text-sm text-gray-300">
            Protecting nature, empowering communities. Together we can restore and 
            preserve mangroves for a greener tomorrow.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Quick Links</h2>
          <ul className="space-y-2">
            <li>
              <a href="/" className="hover:text-green-400 transition">Home</a>
            </li>
            <li>
              <a href="/report" className="hover:text-green-400 transition">Report Issue</a>
            </li>
            <li>
              <a href="/leaderboard" className="hover:text-green-400 transition">Leaderboard</a>
            </li>
            <li>
              <a href="/profile" className="hover:text-green-400 transition">Profile</a>
            </li>
          </ul>
        </div>

        {/* Social Media */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Connect With Us</h2>
          <div className="flex gap-4 text-lg">
            <a href="#" className="hover:text-green-400 transition">
              <i className="fa-brands fa-facebook"></i>
            </a>
            <a href="#" className="hover:text-green-400 transition">
              <i className="fa-brands fa-twitter"></i>
            </a>
            <a href="#" className="hover:text-green-400 transition">
              <i className="fa-brands fa-instagram"></i>
            </a>
            <a href="#" className="hover:text-green-400 transition">
              <i className="fa-brands fa-linkedin"></i>
            </a>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-green-700 mt-10 pt-4 text-center text-sm text-gray-300">
        © {new Date().getFullYear()} MangroveWatch. All rights reserved.
      </div>
    </footer>
  );
};

export default Footer;
