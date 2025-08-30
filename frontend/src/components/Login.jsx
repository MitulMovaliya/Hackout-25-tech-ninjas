import React, { useState } from "react";
import { Leaf } from "lucide-react"; // icon
import { Link, useNavigate } from "react-router-dom";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);

      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Login failed ❌");
        return;
      }

      // Save JWT token + user info in localStorage
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      alert(`Welcome back, ${data.user.fullName} 🌱`);

      // Redirect after login
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/image.png')", // keep image in /public
          filter: "blur(6px) brightness(0.7)",
        }}
      ></div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-green-900/30"></div>

      {/* Login Card */}
      <div className="relative bg-white/90 backdrop-blur-lg px-8 py-10 rounded-2xl shadow-2xl w-full max-w-md border border-green-300">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="bg-green-600 p-3 rounded-full shadow-lg">
            <Leaf className="text-white w-8 h-8" />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-green-800 text-center mb-2">
          Welcome Back to the Mangrove
        </h2>
        <p className="text-green-700 text-center mb-8">
          Reconnect and continue growing with us 🌿
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email */}
          <div>
            <label
              className="block text-green-800 font-semibold mb-2"
              htmlFor="email"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-green-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-green-50/70"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label
              className="block text-green-800 font-semibold mb-2"
              htmlFor="password"
            >
              Password
            </label>
            <input
              type="password"
              id="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-green-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-green-50/70"
              required
            />
          </div>

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 hover:cursor-pointer shadow-lg disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-green-800 mt-6">
          New here?{" "}
          <Link
            to="/signup"
            className="font-semibold text-green-900 hover:underline"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
