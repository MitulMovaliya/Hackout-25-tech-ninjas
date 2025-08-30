import React from "react";


import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav className="fixed top-0 left-0 w-full bg-white text-black shadow-md z-50">
      <div className="mx-auto flex justify-between items-center px-6 py-4">
        <h1 className="text-xl text-green-700 font-bold">
          <i className="fa-solid fa-tree"></i> MangroveWatch
        </h1>
        <div className="flex justify-center items-center gap-15">
          <Link 
            to="/"
            className="w-32 h-10 flex justify-center items-center rounded-2xl text-lg bg-green-200 hover:bg-green-500"
          >
            <i className="fa-solid fa-house-chimney"></i>   <p className="px-2">Home</p>
          </Link>

          <Link
            to="/report"
            className="w-32 h-10 flex justify-center items-center rounded-2xl text-lg bg-green-200 hover:bg-green-500"
          >
            <i className="fa-regular fa-file-lines"></i> <p className="px-2"> Report</p>
          </Link>

          <Link
            to="/leaderboard"
            className="w-44 h-10 flex justify-center items-center rounded-2xl text-lg bg-green-200 hover:bg-green-500"
          >
            <i className="fa-solid fa-chart-column"></i> <p className="px-2"> Leaderboard</p>
          </Link>

          <Link
            to="/profile"
            className="w-32 h-10 flex justify-center items-center rounded-2xl text-lg bg-green-200 hover:bg-green-500"
          >
            <i className="fa-solid fa-user"></i> <p className="px-2"> Profile</p>
          </Link>

           <Link
            to="/profile"
            className="w-28 h-10 flex justify-center items-center rounded-2xl text-xl border-2 text-black hover:bg-green-500 "
          >
             <p className="px-2"> Login</p>
          </Link>
        </div>
      </div>
    </nav>
  );
};



export default Navbar