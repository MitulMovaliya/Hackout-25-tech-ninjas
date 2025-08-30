import React, { useState } from "react";
import { User, Mail, Lock } from "lucide-react";
import { Link } from "react-router-dom";

function SignupPage() {
  const serverurl=import.meta.env.VITE_SERVER_URL
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullname: "",
    username: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const nextStep = () => {
    if (step === 1) {
      if (
        !formData.fullname ||
        !formData.username ||
        !formData.email ||
        formData.mobile.length < 10
      ) {
        alert("Please fill all fields correctly.");
        return;
      }
    }
    setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    try {
      const res = await fetch(`${serverurl}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (res.ok) {
        // Save token and user to local storage
        if (data.token) {
          localStorage.setItem("token", data.token);
        }
        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
        }
        alert("Account created successfully!");
        console.log(data);
      } else {
        alert(data.message || "Something went wrong");
      }
    } catch (err) {
      console.error(err);
      alert("Error connecting to server.");
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-green-50">
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <div className="flex flex-col items-center">
          <div className="bg-green-600 text-white p-3 rounded-full mb-4">
            <User className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-green-700">
            Join MangroveWatch
          </h2>
          <p className="text-gray-500 text-sm mb-4 text-center">
            Help protect our planet’s coastal guardians
          </p>
        </div>

        {/* Progress */}
        <div className="flex justify-between text-sm mb-2 text-gray-600">
          <span>Step {step} of 2</span>
          <span>{step === 1 ? "Account Details" : "Verification"}</span>
        </div>
        <div className="w-full bg-gray-200 h-2 rounded-full mb-6">
          <div
            className="h-2 rounded-full bg-green-600"
            style={{ width: step === 1 ? "50%" : "100%" }}
          ></div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {step === 1 && (
            <>
              {/* Full Name */}
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">
                  Full Name
                </label>
                <div className="flex items-center border rounded-lg px-3 py-2">
                  <User className="w-5 h-5 text-gray-400 mr-2" />
                  <input
                    type="text"
                    name="fullname"
                    placeholder="Your full name"
                    value={formData.fullname}
                    onChange={handleChange}
                    className="w-full outline-none"
                  />
                </div>
              </div>

              {/* Username */}
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">
                  Username
                </label>
                <div className="flex items-center border rounded-lg px-3 py-2">
                  <User className="w-5 h-5 text-gray-400 mr-2" />
                  <input
                    type="text"
                    name="username"
                    placeholder="Choose a username"
                    value={formData.username}
                    onChange={handleChange}
                    className="w-full outline-none"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">
                  Email
                </label>
                <div className="flex items-center border rounded-lg px-3 py-2">
                  <Mail className="w-5 h-5 text-gray-400 mr-2" />
                  <input
                    type="email"
                    name="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full outline-none"
                  />
                </div>
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">
                  Mobile Number
                </label>
                <div className="flex items-center border rounded-lg px-3 py-2">
                  <span className="mr-2 text-gray-700 font-medium select-none">
                    +91
                  </span>
                  <input
                    type="text"
                    name="mobile"
                    placeholder="Enter 10-digit number"
                    value={formData.mobile}
                    maxLength={10}
                    pattern="\d*"
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      setFormData({ ...formData, mobile: value });
                    }}
                    className="w-full outline-none text-lg"
                    autoComplete="off"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={nextStep}
                className="w-full bg-green-600 hover:bg-green-800 hover:cursor-pointer text-white py-2 rounded-lg font-medium"
              >
                Continue
              </button>
            </>
          )}

          {step === 2 && (
            <>
              {/* Password */}
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">
                  Password
                </label>
                <div className="flex items-center border rounded-lg px-3 py-2">
                  <Lock className="w-5 h-5 text-gray-400 mr-2" />
                  <input
                    type="password"
                    name="password"
                    placeholder="Enter Your password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full outline-none"
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">
                  Confirm Password
                </label>
                <div className="flex items-center border rounded-lg px-3 py-2">
                  <Lock className="w-5 h-5 text-gray-400 mr-2" />
                  <input
                    type="password"
                    name="confirmPassword"
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="w-full outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={prevStep}
                  className="w-1/2 bg-green-100 hover:bg-green-200 hover:cursor-pointer text-green-700 py-2 rounded-lg font-medium"
                >
                  Back
                </button>
                <button
                  type="submit"
                  className="w-1/2 bg-green-600 hover:bg-green-800 hover:cursor-pointer text-white py-2 rounded-lg font-medium"
                >
                  Create Account
                </button>
              </div>
            </>
          )}
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{" "}
          <Link to="/login" className="text-green-600 hover:underline cursor-pointer font-medium">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default SignupPage;
