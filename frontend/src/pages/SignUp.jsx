import React, { useState } from "react";
import { User, Mail, Lock, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

function SignupPage() {
  const serverurl = import.meta.env.VITE_SERVER_URL;
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      setIsLoggedIn(true);
      window.location.href = "/profile";
    }
  }, []);

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateStep1 = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required";
    }

    if (!formData.username.trim()) {
      newErrors.username = "Username is required";
    } else if (formData.username.length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (formData.phone.length !== 10) {
      newErrors.phone = "Phone number must be 10 digits";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};

    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    if (!formData.confirmPassword.trim()) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
  };

  const nextStep = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const prevStep = () => {
    setStep(1);
    setErrors({});
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateStep2()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    const submitData = {
      ...formData,
      phone: "+91" + formData.phone,
    };
    delete submitData.confirmPassword;

    try {
      const res = await fetch(`${serverurl}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(submitData),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.token) {
          localStorage.setItem("token", data.token);
        }
        if (data.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
        }
        window.location.href = "/profile";
      } else {
        // Handle specific error cases
        if (res.status === 400) {
          setErrors({ general: data.message || "Invalid input data" });
        } else if (res.status === 409) {
          setErrors({
            general: "User already exists with this email or username",
          });
        } else {
          setErrors({ general: data.message || "Registration failed" });
        }
      }
    } catch (err) {
      console.error("Registration error:", err);
      setErrors({ general: "Unable to connect to server. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  const ErrorMessage = ({ error }) => {
    if (!error) return null;
    return (
      <div className="flex items-center text-red-500 text-sm mt-1">
        <AlertCircle className="w-4 h-4 mr-1" />
        {error}
      </div>
    );
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
            Help protect our planet's coastal guardians
          </p>
        </div>

        {/* General Error Message */}
        {errors.general && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <div className="flex items-center text-red-700">
              <AlertCircle className="w-5 h-5 mr-2" />
              {errors.general}
            </div>
          </div>
        )}

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
                <div
                  className={`flex items-center border rounded-lg px-3 py-2 ${
                    errors.fullName ? "border-red-300" : "border-gray-300"
                  }`}
                >
                  <User className="w-5 h-5 text-gray-400 mr-2" />
                  <input
                    type="text"
                    name="fullName"
                    placeholder="Your full name"
                    value={formData.fullName}
                    onChange={handleChange}
                    className="w-full outline-none"
                  />
                </div>
                <ErrorMessage error={errors.fullName} />
              </div>

              {/* Username */}
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">
                  Username
                </label>
                <div
                  className={`flex items-center border rounded-lg px-3 py-2 ${
                    errors.username ? "border-red-300" : "border-gray-300"
                  }`}
                >
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
                <ErrorMessage error={errors.username} />
              </div>

              {/* Email */}
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">
                  Email
                </label>
                <div
                  className={`flex items-center border rounded-lg px-3 py-2 ${
                    errors.email ? "border-red-300" : "border-gray-300"
                  }`}
                >
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
                <ErrorMessage error={errors.email} />
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">
                  Mobile Number
                </label>
                <div
                  className={`flex items-center border rounded-lg px-3 py-2 ${
                    errors.phone ? "border-red-300" : "border-gray-300"
                  }`}
                >
                  <span className="mr-2 text-gray-700 font-medium select-none">
                    +91
                  </span>
                  <input
                    type="text"
                    name="phone"
                    placeholder="Enter 10-digit number"
                    value={formData.phone}
                    maxLength={10}
                    pattern="\d*"
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");
                      setFormData({ ...formData, phone: value });
                      if (errors.phone) {
                        setErrors({ ...errors, phone: "" });
                      }
                    }}
                    className="w-full outline-none text-lg"
                    autoComplete="off"
                  />
                </div>
                <ErrorMessage error={errors.phone} />
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
                <div
                  className={`flex items-center border rounded-lg px-3 py-2 ${
                    errors.password ? "border-red-300" : "border-gray-300"
                  }`}
                >
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
                <ErrorMessage error={errors.password} />
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-gray-700 text-sm font-medium mb-1">
                  Confirm Password
                </label>
                <div
                  className={`flex items-center border rounded-lg px-3 py-2 ${
                    errors.confirmPassword
                      ? "border-red-300"
                      : "border-gray-300"
                  }`}
                >
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
                <ErrorMessage error={errors.confirmPassword} />
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
                  disabled={isLoading}
                  className="w-1/2 bg-green-600 hover:bg-green-800 hover:cursor-pointer text-white py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Creating..." : "Create Account"}
                </button>
              </div>
            </>
          )}
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{" "}
          <Link
            to="/login"
            className="text-green-600 hover:underline cursor-pointer font-medium"
          >
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}

export default SignupPage;
