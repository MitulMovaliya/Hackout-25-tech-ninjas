import User from "../models/User.js";
import Report from "../models/Report.js";

// @desc    Get user profile by ID
// @route   GET /api/users/:id
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id)
      .select("-password -loginAttempts -lockUntil")
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Check if user can view this profile
    if (req.user.id !== id && !["authority", "admin"].includes(req.user.role)) {
      // Return limited public info
      return res.json({
        success: true,
        data: {
          user: {
            _id: user._id,
            username: user.username,
            fullName: user.fullName,
            role: user.role,
            gamification: {
              points: user.gamification.points,
              level: user.gamification.level,
              badges: user.gamification.badges,
            },
            statistics: user.statistics,
            createdAt: user.createdAt,
          },
        },
      });
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error("Get user profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching user profile",
    });
  }
};

// @desc    Get user statistics
// @route   GET /api/users/:id/stats
// @access  Private
const getUserStats = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select("statistics gamification");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get additional statistics
    const reportsSubmitted = await Report.countDocuments({ reporter: id });
    const reportsApproved = await Report.countDocuments({
      reporter: id,
      status: "approved",
    });
    const reportsRejected = await Report.countDocuments({
      reporter: id,
      status: "rejected",
    });

    // Calculate this month's reports
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const monthlyReports = await Report.countDocuments({
      reporter: id,
      createdAt: { $gte: thisMonth },
    });

    // Get user's rank
    const rank = await User.countDocuments({
      "gamification.points": { $gt: user.gamification.points },
      isActive: true,
    });

    const stats = {
      reportsSubmitted,
      reportsApproved,
      reportsRejected,
      monthlyReports,
      monthlyTarget: 10,
      communityContributions: user.statistics.reportsValidated || 0,
      communityTarget: 20,
      accuracyRate: reportsSubmitted > 0 ? Math.round((reportsApproved / reportsSubmitted) * 100) : 0,
      rank: rank + 1,
      memberSince: new Date(user.createdAt).getFullYear(),
      impactLevel: calculateImpactLevel(user.gamification.points),
      engagementLevel: calculateEngagementLevel(user.statistics),
      responseRate: calculateResponseRate(reportsApproved, reportsSubmitted),
    };

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Get user stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching user statistics",
    });
  }
};

// @desc    Get user activity
// @route   GET /api/users/:id/activity
// @access  Private
const getUserActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 20 } = req.query;

    // Check if user can view this activity
    if (req.user.id !== id && !["authority", "admin"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const activities = await Report.find({ reporter: id })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .select("title incidentType status createdAt")
      .lean();

    // Format activities
    const formattedActivities = activities.map(activity => ({
      id: activity._id,
      title: activity.title,
      type: activity.status === "approved" ? "resolved" : "submitted",
      status: formatStatus(activity.status),
      createdAt: activity.createdAt,
    }));

    res.json({
      success: true,
      data: formattedActivities,
    });
  } catch (error) {
    console.error("Get user activity error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching user activity",
    });
  }
};

// @desc    Get user achievements
// @route   GET /api/users/:id/achievements
// @access  Private
const getUserAchievements = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select("statistics gamification createdAt");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const achievements = calculateUserAchievements(user);

    res.json({
      success: true,
      data: achievements,
    });
  } catch (error) {
    console.error("Get user achievements error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching user achievements",
    });
  }
};

// @desc    Update notification settings
// @route   PUT /api/users/:id/notifications
// @access  Private
const updateNotificationSettings = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user can update these settings
    if (req.user.id !== id) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const { email, reportUpdates, weeklySummary, push } = req.body;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update notification preferences
    user.preferences = {
      ...user.preferences,
      notifications: {
        email: email !== undefined ? email : user.preferences.notifications?.email,
        push: push !== undefined ? push : user.preferences.notifications?.push,
        reportUpdates: reportUpdates !== undefined ? reportUpdates : user.preferences.notifications?.reportUpdates,
        weeklySummary: weeklySummary !== undefined ? weeklySummary : user.preferences.notifications?.weeklySummary,
      },
    };

    await user.save();

    res.json({
      success: true,
      message: "Notification settings updated successfully",
      data: {
        notifications: user.preferences.notifications,
      },
    });
  } catch (error) {
    console.error("Update notification settings error:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating notification settings",
    });
  }
};

// @desc    Get all users (admin only)
// @route   GET /api/users
// @access  Private (Admin)
const getUsers = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin role required.",
      });
    }

    const {
      page = 1,
      limit = 20,
      role,
      active,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = req.query;

    // Build query
    let query = {};

    if (role) {
      query.role = role;
    }

    if (active !== undefined) {
      query.isActive = active === "true";
    }

    if (search) {
      query.$or = [
        { username: { $regex: search, $options: "i" } },
        { fullName: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    const users = await User.find(query)
      .select("-password -loginAttempts -lockUntil")
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching users",
    });
  }
};

// @desc    Update user role (admin only)
// @route   PUT /api/users/:id/role
// @access  Private (Admin)
const updateUserRole = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin role required.",
      });
    }

    const { id } = req.params;
    const { role } = req.body;

    if (!["community", "authority", "ngo", "admin"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.role = role;
    await user.save();

    res.json({
      success: true,
      message: "User role updated successfully",
      data: {
        user: {
          _id: user._id,
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    console.error("Update user role error:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating user role",
    });
  }
};

// Helper functions
const calculateImpactLevel = (points) => {
  if (points >= 1000) return "Expert";
  if (points >= 500) return "Advanced";
  if (points >= 100) return "Intermediate";
  if (points >= 10) return "Beginner";
  return "New";
};

const calculateEngagementLevel = (statistics) => {
  const totalActivity = (statistics.reportsSubmitted || 0) + (statistics.reportsValidated || 0);
  if (totalActivity >= 50) return "Highly Active";
  if (totalActivity >= 20) return "Active";
  if (totalActivity >= 5) return "Moderate";
  return "Getting Started";
};

const calculateResponseRate = (approved, total) => {
  if (total === 0) return 0;
  return Math.round((approved / total) * 100);
};

const formatStatus = (status) => {
  const statusMap = {
    pending: "Pending",
    approved: "Resolved",
    rejected: "Rejected",
    action_taken: "Action Taken",
    ai_processing: "Processing",
  };
  return statusMap[status] || status;
};

const calculateUserAchievements = (user) => {
  const achievements = [
    {
      id: "first_report",
      title: "First Steps",
      description: "Submit your first environmental report",
      icon: "fa-seedling",
      earned: (user.statistics.reportsSubmitted || 0) >= 1,
    },
    {
      id: "reporter",
      title: "Active Reporter",
      description: "Submit 10 environmental reports",
      icon: "fa-file-alt",
      earned: (user.statistics.reportsSubmitted || 0) >= 10,
    },
    {
      id: "guardian",
      title: "Environmental Guardian",
      description: "Submit 50 environmental reports",
      icon: "fa-shield-alt",
      earned: (user.statistics.reportsSubmitted || 0) >= 50,
    },
    {
      id: "champion",
      title: "Conservation Champion",
      description: "Submit 100 environmental reports",
      icon: "fa-trophy",
      earned: (user.statistics.reportsSubmitted || 0) >= 100,
    },
    {
      id: "streak_7",
      title: "Week Warrior",
      description: "Maintain a 7-day reporting streak",
      icon: "fa-fire",
      earned: (user.gamification.streak?.longest || 0) >= 7,
    },
    {
      id: "streak_30",
      title: "Monthly Master",
      description: "Maintain a 30-day reporting streak",
      icon: "fa-calendar-check",
      earned: (user.gamification.streak?.longest || 0) >= 30,
    },
    {
      id: "points_100",
      title: "Point Collector",
      description: "Earn 100 contribution points",
      icon: "fa-star",
      earned: (user.gamification.points || 0) >= 100,
    },
    {
      id: "points_500",
      title: "Point Master",
      description: "Earn 500 contribution points",
      icon: "fa-star-and-crescent",
      earned: (user.gamification.points || 0) >= 500,
    },
    {
      id: "validator",
      title: "Quality Validator",
      description: "Have 5 reports validated by experts",
      icon: "fa-check-circle",
      earned: (user.statistics.reportsValidated || 0) >= 5,
    },
    {
      id: "accurate",
      title: "Accuracy Expert",
      description: "Maintain 80% validation accuracy",
      icon: "fa-bullseye",
      earned: (user.statistics.validationAccuracy || 0) >= 80,
    },
  ];

  return achievements;
};

export default {
  getUserProfile,
  getUserStats,
  getUserActivity,
  getUserAchievements,
  updateNotificationSettings,
  getUsers,
  updateUserRole,
};
