import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
   <nav className="fixed top-0 left-0 w-full bg-white text-black shadow-md z-50 ">
    <div className="container mx-auto flex justify-between items-center px-6 py-4">
      <h1 className="text-xl text-green-700 font-bold"> <i className="fa-solid fa-tree"></i>  MangroveWatch</h1>
      <div className="flex gap-4">
        <Link to="/" className="hover:underline"><i className="fa-solid fa-house-chimney"></i> Home</Link>
        <Link to="/report" className="hover:underline"><i className="fa-regular fa-file-lines"></i> Report</Link>
        <Link to="/leaderboard" className="hover:underline"><i className="fa-solid fa-chart-column"></i> Leaderboard</Link>
        <Link to="/profile" className="hover:underline"><i className="fa-solid fa-user"></i> Profile</Link>
      </div>
    </div>
  </nav>
  )
}

export default Navbar;
