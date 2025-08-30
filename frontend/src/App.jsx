import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import LoginPage from "./pages/Login";
import SignupPage from "./pages/SignUp";
import Home from "./pages/Home";
import Leaderboard from "./pages/LeaderBoard.jsx";
import Report from "./pages/Report";
import Profile from "./pages/Profile.jsx";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/signup",
    element: <SignupPage />,
  },
  {
    path: "/leaderboard",
    element: <Leaderboard />,
  },
  {
    path: "/report",
    element: <Report />,
  },
  {
    path: "/profile",
    element: <Profile />,
  },
]);

function App() {
  return (
    <div className="h-screen">
      <RouterProvider router={router} />
    </div>
  );
}

export default App;
