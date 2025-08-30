import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Navbar from "../Components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "../Components/Card";
import { Badge } from "../Components/Badge";
import Button from "../Components/Button";
import Footer from "../Components/footer";
import { isAuthenticated, getUser, logout } from "../utils/auth";
import { fadeInUp, scaleIn, staggerContainer } from "../utils/animations";

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userStats, setUserStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login");
      return;
    }

    const userData = getUser();
    setUser(userData);
    fetchProfileData(userData.id || userData._id);
  }, [navigate]);

  const fetchProfileData = async (userId) => {
    try {
      setIsLoading(true);

      // Fetch user stats
      const statsResponse = await fetch(
        `${process.env.REACT_APP_API_URL}/api/users/${userId}/stats`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setUserStats(statsData);
      }

      // Fetch recent activity
      const activityResponse = await fetch(
        `${process.env.REACT_APP_API_URL}/api/users/${userId}/activity`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        setRecentActivity(activityData);
      }

      // Fetch achievements
      const achievementsResponse = await fetch(
        `${process.env.REACT_APP_API_URL}/api/users/${userId}/achievements`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (achievementsResponse.ok) {
        const achievementsData = await achievementsResponse.json();
        setAchievements(achievementsData);
      }
    } catch (error) {
      console.error("Error fetching profile data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      logout();
    }
  };

  const updateNotificationSettings = async (settings) => {
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/users/${
          user.id || user._id
        }/notifications`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(settings),
        }
      );

      if (response.ok) {
        alert("Settings updated successfully!");
      }
    } catch (error) {
      console.error("Error updating settings:", error);
      alert("Failed to update settings");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-green-700 font-medium">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50">
      <Navbar />

      <main className="pt-20 pb-16">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Profile Header */}
          <motion.div
            className="mb-8"
            {...fadeInUp}
            initial="initial"
            animate="animate"
          >
            <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300 border-0 bg-white/80 backdrop-blur-sm">
              <CardContent className="p-8">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center text-3xl text-white font-bold shadow-lg">
                    {user?.fullName?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <div className="text-center md:text-left flex-1">
                    <h1 className="text-3xl font-bold text-green-800 mb-2">
                      {user?.fullName || "Unknown User"}
                    </h1>
                    <p className="text-gray-600 mb-2">
                      {user?.email || "No email provided"}
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                      <Badge variant="success" size="md">
                        {userStats?.rank || "New Member"}
                      </Badge>
                      <Badge variant="info" size="md">
                        Member since{" "}
                        {userStats?.memberSince ||
                          new Date(user?.createdAt).getFullYear() ||
                          "2024"}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="md">
                      Edit Profile
                    </Button>
                    <Button variant="outline" size="md" onClick={handleLogout}>
                      <i className="fa-solid fa-sign-out-alt mr-2"></i>
                      Logout
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            className="grid md:grid-cols-4 gap-6 mb-8"
            {...staggerContainer}
            initial="initial"
            animate="animate"
          >
            <motion.div {...scaleIn}>
              <Card className="text-center shadow-lg hover:shadow-xl transition-shadow duration-300 border-0 bg-white hover-lift">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <i className="fa-solid fa-file-alt text-green-600 text-xl"></i>
                  </div>
                  <div className="text-2xl font-bold text-green-700 mb-1">
                    {userStats?.reportsSubmitted || 0}
                  </div>
                  <div className="text-gray-600 text-sm">Reports Submitted</div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div {...scaleIn}>
              <Card className="text-center shadow-lg hover:shadow-xl transition-shadow duration-300 border-0 bg-white hover-lift">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <i className="fa-solid fa-check-circle text-emerald-600 text-xl"></i>
                  </div>
                  <div className="text-2xl font-bold text-emerald-600 mb-1">
                    {userStats?.issuesResolved || 0}
                  </div>
                  <div className="text-gray-600 text-sm">Issues Resolved</div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div {...scaleIn}>
              <Card className="text-center shadow-lg hover:shadow-xl transition-shadow duration-300 border-0 bg-white hover-lift">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <i className="fa-solid fa-star text-blue-600 text-xl"></i>
                  </div>
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {userStats?.contributionScore || 0}
                  </div>
                  <div className="text-gray-600 text-sm">
                    Contribution Score
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div {...scaleIn}>
              <Card className="text-center shadow-lg hover:shadow-xl transition-shadow duration-300 border-0 bg-white hover-lift">
                <CardContent className="p-6">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <i className="fa-solid fa-trophy text-yellow-600 text-xl"></i>
                  </div>
                  <div className="text-2xl font-bold text-yellow-600 mb-1">
                    #{userStats?.globalRank || "N/A"}
                  </div>
                  <div className="text-gray-600 text-sm">Global Rank</div>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* Tabs */}
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                {[
                  { id: "overview", label: "Overview", icon: "fa-chart-line" },
                  {
                    id: "activity",
                    label: "Recent Activity",
                    icon: "fa-clock",
                  },
                  {
                    id: "achievements",
                    label: "Achievements",
                    icon: "fa-trophy",
                  },
                  { id: "settings", label: "Settings", icon: "fa-cog" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`whitespace-nowrap border-b-2 py-4 px-1 text-sm font-medium transition-colors ${
                      activeTab === tab.id
                        ? "border-green-500 text-green-600"
                        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <i className={`fa-solid ${tab.icon} mr-2`}></i>
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Tab Content */}
          <motion.div
            key={activeTab}
            {...fadeInUp}
            initial="initial"
            animate="animate"
          >
            {activeTab === "overview" && (
              <div className="grid lg:grid-cols-2 gap-8">
                <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <i className="fa-solid fa-chart-pie text-green-600"></i>
                      Impact Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="text-gray-700">
                        Environmental Impact Score
                      </span>
                      <Badge variant="success">
                        {userStats?.impactLevel || "New"}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                      <span className="text-gray-700">
                        Community Engagement
                      </span>
                      <Badge variant="info">
                        {userStats?.engagementLevel || "Getting Started"}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                      <span className="text-gray-700">Response Rate</span>
                      <Badge variant="warning">
                        {userStats?.responseRate || "0"}%
                      </Badge>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <i className="fa-solid fa-target text-green-600"></i>
                      Goals & Progress
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Monthly Reports Target</span>
                        <span>
                          {userStats?.monthlyReports || 0}/
                          {userStats?.monthlyTarget || 10}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{
                            width: `${Math.min(
                              ((userStats?.monthlyReports || 0) /
                                (userStats?.monthlyTarget || 10)) *
                                100,
                              100
                            )}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Community Contributions</span>
                        <span>
                          {userStats?.communityContributions || 0}/
                          {userStats?.communityTarget || 20}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-emerald-600 h-2 rounded-full"
                          style={{
                            width: `${Math.min(
                              ((userStats?.communityContributions || 0) /
                                (userStats?.communityTarget || 20)) *
                                100,
                              100
                            )}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "activity" && (
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <i className="fa-solid fa-history text-green-600"></i>
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {recentActivity.length > 0 ? (
                    recentActivity.map((activity, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              activity.type === "resolved"
                                ? "bg-green-100 text-green-600"
                                : "bg-blue-100 text-blue-600"
                            }`}
                          >
                            <i
                              className={`fa-solid ${
                                activity.type === "resolved"
                                  ? "fa-check"
                                  : "fa-file-alt"
                              }`}
                            ></i>
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {activity.title}
                            </h4>
                            <p className="text-sm text-gray-600">
                              {new Date(
                                activity.createdAt
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={
                            activity.status === "Resolved"
                              ? "success"
                              : "default"
                          }
                        >
                          {activity.status}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-gray-500 py-8">
                      No recent activity found
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {activeTab === "achievements" && (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {achievements.length > 0 ? (
                  achievements.map((achievement, index) => (
                    <Card
                      key={index}
                      className={`shadow-lg border-0 transition-all duration-300 ${
                        achievement.earned
                          ? "bg-gradient-to-br from-green-50 to-emerald-50 hover:shadow-xl"
                          : "bg-gray-50 opacity-60"
                      }`}
                    >
                      <CardContent className="text-center p-6">
                        <div
                          className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
                            achievement.earned
                              ? "bg-green-100 text-green-600"
                              : "bg-gray-200 text-gray-400"
                          }`}
                        >
                          <i
                            className={`fa-solid ${achievement.icon} text-2xl`}
                          ></i>
                        </div>
                        <h3 className="font-semibold text-gray-900 mb-2">
                          {achievement.title}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {achievement.description}
                        </p>
                        {achievement.earned && (
                          <Badge variant="success" size="sm" className="mt-3">
                            Earned
                          </Badge>
                        )}
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="col-span-full text-center text-gray-500 py-8">
                    No achievements yet
                  </p>
                )}
              </div>
            )}

            {activeTab === "settings" && (
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <i className="fa-solid fa-cog text-green-600"></i>
                    Account Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">
                        Profile Information
                      </h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Full Name
                          </label>
                          <input
                            type="text"
                            value={user?.fullName || ""}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            readOnly
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Email
                          </label>
                          <input
                            type="email"
                            value={user?.email || ""}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                            readOnly
                          />
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">
                        Notification Settings
                      </h4>
                      <div className="space-y-3">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                            defaultChecked={user?.notifications?.email}
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            Email notifications
                          </span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                            defaultChecked={user?.notifications?.reportUpdates}
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            Report status updates
                          </span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                            defaultChecked={user?.notifications?.weeklySummary}
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            Weekly summary
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 border-t border-gray-200">
                    <Button
                      variant="default"
                      size="md"
                      onClick={() => {
                        const settings = {
                          email: document.querySelector(
                            'input[type="checkbox"]:nth-of-type(1)'
                          ).checked,
                          reportUpdates: document.querySelector(
                            'input[type="checkbox"]:nth-of-type(2)'
                          ).checked,
                          weeklySummary: document.querySelector(
                            'input[type="checkbox"]:nth-of-type(3)'
                          ).checked,
                        };
                        updateNotificationSettings(settings);
                      }}
                    >
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Profile;
