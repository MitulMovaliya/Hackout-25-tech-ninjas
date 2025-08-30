import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isAuthenticated, refreshAuthState } from "../utils/auth";

const ProtectedRoute = ({ children, redirectTo = "/login" }) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!refreshAuthState()) {
      navigate(redirectTo);
    }
  }, [navigate, redirectTo]);

  if (!isAuthenticated()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-green-700 font-medium">
            Checking authentication...
          </p>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
