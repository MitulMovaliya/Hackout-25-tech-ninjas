import React, { useState } from "react";
import { Leaf } from "lucide-react"; // icon
import { Link, useNavigate } from "react-router-dom";

function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert("Passwords do not match!");
      return;
    }

    try {
      setLoading(true);

      // Call your backend API
      const response = await fetch("http://localhost:5000/api/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Signup successful 🎉");
        navigate("/login"); // redirect to login after signup
      } else {
        alert(data.message || "Signup failed ❌");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex p-5 items-center justify-center">
      {/* Background Image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/image.png')",
          filter: "blur(6px) brightness(0.7)",
        }}
      ></div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-green-900/30"></div>

      {/* Signup Card */}
      <div className="relative bg-white/90 backdrop-blur-lg px-8 py-4 rounded-2xl shadow-2xl w-full max-w-md border border-green-300">
        {/* Logo */}
        <div className="flex justify-center mb-6 items-center gap-3">
          {/* <div className="bg-green-600 p-3 rounded-full shadow-lg">
            <Leaf className="text-white w-8 h-8" />
          </div> */}
          <h2 className="text-3xl font-bold text-green-800 text-center mb-2 pt-3">
            Create Your Account
          </h2>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Full Name */}
          <div>
            <label
              className="block text-green-800 font-semibold mb-2"
              htmlFor="fullname"
            >
              Full Name
            </label>
            <input
              type="text"
              id="fullname"
              placeholder="Enter your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-3 border border-green-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-green-50/70"
              required
            />
          </div>

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
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-green-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 bg-green-50/70"
              required
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label
              className="block text-green-800 font-semibold mb-2"
              htmlFor="confirmPassword"
            >
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
            {loading ? "Signing Up..." : "Sign Up"}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-green-800 mt-6">
          Already a member?{" "}
          <Link
            to="/login"
            className="font-semibold text-green-900 hover:underline"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default SignupPage;
