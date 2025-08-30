import express from "express";
const router = express.Router();
import User from "../models/User.js";
import Report from "../models/Report.js";
import auth from "../middleware/auth.js";
// import logger from "../utils/logger.js";

// @route   GET /api/users/:id
// @desc    Get user profile
// @access  Private
router.get("/:id", auth, async (req, res) => {
  try {
    const userId = req.params.id;

    // Check if user can access this profile
    if (
      req.user.id !== userId &&
      !["authority", "admin"].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const user = await User.findById(userId).select(
      "-password -verificationToken -passwordResetToken"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get user's report statistics
    const reportStats = await Report.aggregate([
      { $match: { reporter: user._id } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const totalReports = await Report.countDocuments({ reporter: user._id });

    res.json({
      success: true,
      data: {
        user,
        reportStats,
        totalReports,
      },
    });
  } catch (error) {
    console.error("Get user profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching user profile",
    });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user profile
// @access  Private
router.put("/:id", auth, async (req, res) => {
  try {
    const userId = req.params.id;

    // Check if user can update this profile
    if (req.user.id !== userId && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const { fullName, phone, location, preferences } = req.body;

    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (phone) updateData.phone = phone;
    if (location) updateData.location = location;
    if (preferences) updateData.preferences = preferences;

    const user = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    console.log(`User profile updated: ${user.email}`);

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: { user },
    });
  } catch (error) {
    console.error("Update user profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating profile",
    });
  }
});

// @route   GET /api/users/:id/reports
// @desc    Get user's reports
// @access  Private
router.get("/:id/reports", auth, async (req, res) => {
  try {
    const userId = req.params.id;
    const { page = 1, limit = 20, status } = req.query;

    // Check if user can access these reports
    if (
      req.user.id !== userId &&
      !["authority", "admin"].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const query = { reporter: userId };
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const reports = await Report.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("reporter", "username fullName");

    const total = await Report.countDocuments(query);

    res.json({
      success: true,
      data: {
        reports,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
        },
      },
    });
  } catch (error) {
    console.error("Get user reports error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching user reports",
    });
  }
});

// @route   GET /api/users/:id/statistics
// @desc    Get user's detailed statistics
// @access  Private
router.get("/:id/statistics", auth, async (req, res) => {
  try {
    const userId = req.params.id;

    // Check if user can access these statistics
    if (
      req.user.id !== userId &&
      !["authority", "admin"].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get detailed report statistics
    const reportStats = await Report.aggregate([
      { $match: { reporter: user._id } },
      {
        $group: {
          _id: null,
          totalReports: { $sum: 1 },
          approvedReports: {
            $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] },
          },
          rejectedReports: {
            $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] },
          },
          pendingReports: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          averageAIScore: { $avg: "$aiAnalysis.overallScore" },
        },
      },
    ]);

    // Get reports by incident type
    const incidentTypeStats = await Report.aggregate([
      { $match: { reporter: user._id } },
      {
        $group: {
          _id: "$incidentType",
          count: { $sum: 1 },
        },
      },
    ]);

    // Get monthly report activity (last 12 months)
    const monthlyActivity = await Report.aggregate([
      {
        $match: {
          reporter: user._id,
          createdAt: {
            $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    res.json({
      success: true,
      data: {
        user: {
          gamification: user.gamification,
          statistics: user.statistics,
        },
        reportStats: reportStats[0] || {},
        incidentTypeStats,
        monthlyActivity,
      },
    });
  } catch (error) {
    console.error("Get user statistics error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching user statistics",
    });
  }
});

// @route   POST /api/users/:id/deactivate
// @desc    Deactivate user account
// @access  Private (Admin only)
router.post("/:id/deactivate", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin role required.",
      });
    }

    const userId = req.params.id;
    const { reason } = req.body;

    const user = await User.findByIdAndUpdate(
      userId,
      { isActive: false },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    console.log(
      `User deactivated: ${user.email} by ${req.user.email}. Reason: ${reason}`
    );

    res.json({
      success: true,
      message: "User account deactivated successfully",
      data: { user },
    });
  } catch (error) {
    console.error("Deactivate user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error deactivating user",
    });
  }
});

// @route   POST /api/users/:id/activate
// @desc    Activate user account
// @access  Private (Admin only)
router.post("/:id/activate", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin role required.",
      });
    }

    const userId = req.params.id;

    const user = await User.findByIdAndUpdate(
      userId,
      { isActive: true },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    console.log(`User activated: ${user.email} by ${req.user.email}`);

    res.json({
      success: true,
      message: "User account activated successfully",
      data: { user },
    });
  } catch (error) {
    console.error("Activate user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error activating user",
    });
  }
});

export default router;
