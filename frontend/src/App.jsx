import React from "react";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import LoginPage from "./pages/Login";
import SignupPage from "./pages/SignUp";
import Home from "./pages/Home";

const router = createBrowserRouter([
  
  {
    path: "/",
    element:
      <Home/>
  },
  {
    path: "/login",
    element:
      <LoginPage/>
  },
  {
    path: "/signup",
    element:
      <SignupPage/>
  }
]);

function App() {
  return (
    <div className="h-screen">
      <RouterProvider router={router} />
    </div>
  );
}

export default App;
