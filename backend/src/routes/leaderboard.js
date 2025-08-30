import express from "express";
const router = express.Router();
import User from "../models/User.js";
import Report from "../models/Report.js";
import auth from "../middleware/auth.js";
// import logger from "../utils/logger.js";

// @route   GET /api/leaderboard
// @desc    Get leaderboard with top users
// @access  Private
router.get("/", auth, async (req, res) => {
  try {
    const {
      limit = 50,
      offset = 0,
      period = "all",
      category = "points",
    } = req.query;

    let dateFilter = {};

    // Apply time period filter
    if (period !== "all") {
      const now = new Date();
      switch (period) {
        case "week":
          dateFilter = {
            $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          };
          break;
        case "month":
          dateFilter = {
            $gte: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
          };
          break;
        case "year":
          dateFilter = {
            $gte: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
          };
          break;
      }
    }

    let sortField = "gamification.points";

    // Determine sort field based on category
    switch (category) {
      case "reports":
        sortField = "statistics.reportsSubmitted";
        break;
      case "accuracy":
        sortField = "statistics.validationAccuracy";
        break;
      case "streak":
        sortField = "gamification.streak.longest";
        break;
      default:
        sortField = "gamification.points";
    }

    let pipeline = [
      {
        $match: {
          isActive: true,
          isVerified: true,
        },
      },
    ];

    // Add period-specific filtering for reports
    if (period !== "all" && category === "reports") {
      pipeline.push({
        $lookup: {
          from: "reports",
          let: { userId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$reporter", "$$userId"] },
                createdAt: dateFilter,
              },
            },
          ],
          as: "periodReports",
        },
      });

      pipeline.push({
        $addFields: {
          periodReportCount: { $size: "$periodReports" },
        },
      });

      sortField = "periodReportCount";
    }

    pipeline.push(
      {
        $project: {
          username: 1,
          fullName: 1,
          gamification: 1,
          statistics: 1,
          periodReportCount: 1,
        },
      },
      {
        $sort: { [sortField]: -1 },
      },
      {
        $skip: parseInt(offset),
      },
      {
        $limit: parseInt(limit),
      }
    );

    const users = await User.aggregate(pipeline);

    // Get current user's position
    let currentUserPosition = null;
    if (req.user) {
      const currentUserIndex = users.findIndex(
        (user) => user._id.toString() === req.user.id
      );

      if (currentUserIndex !== -1) {
        currentUserPosition = parseInt(offset) + currentUserIndex + 1;
      } else {
        // User not in current page, find their actual position
        const usersBefore = await User.countDocuments({
          isActive: true,
          isVerified: true,
          [sortField]: {
            $gt: req.user[
              sortField.split(".").reduce((obj, key) => obj[key], req.user)
            ],
          },
        });
        currentUserPosition = usersBefore + 1;
      }
    }

    // Add ranking to users
    const rankedUsers = users.map((user, index) => ({
      ...user,
      rank: parseInt(offset) + index + 1,
    }));

    // Get total count for pagination
    const totalUsers = await User.countDocuments({
      isActive: true,
      isVerified: true,
    });

    res.json({
      success: true,
      data: {
        leaderboard: rankedUsers,
        currentUserPosition,
        pagination: {
          current: Math.floor(offset / limit) + 1,
          pages: Math.ceil(totalUsers / limit),
          total: totalUsers,
          hasNext: offset + limit < totalUsers,
          hasPrev: offset > 0,
        },
        filters: {
          period,
          category,
        },
      },
    });
  } catch (error) {
    console.error("Leaderboard error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching leaderboard",
    });
  }
});

// @route   GET /api/leaderboard/top-contributors
// @desc    Get top contributors across different categories
// @access  Private
router.get("/top-contributors", auth, async (req, res) => {
  try {
    // Top reporters
    const topReporters = await User.find({ isActive: true, isVerified: true })
      .sort({ "statistics.reportsSubmitted": -1 })
      .limit(10)
      .select(
        "username fullName statistics.reportsSubmitted gamification.points"
      );

    // Most accurate reporters
    const accurateReporters = await User.find({
      isActive: true,
      isVerified: true,
      "statistics.validationAccuracy": { $gt: 0 },
    })
      .sort({ "statistics.validationAccuracy": -1 })
      .limit(10)
      .select(
        "username fullName statistics.validationAccuracy statistics.reportsValidated"
      );

    // Longest streaks
    const streakLeaders = await User.find({ isActive: true, isVerified: true })
      .sort({ "gamification.streak.longest": -1 })
      .limit(10)
      .select("username fullName gamification.streak");

    // Top point earners
    const pointLeaders = await User.find({ isActive: true, isVerified: true })
      .sort({ "gamification.points": -1 })
      .limit(10)
      .select("username fullName gamification.points gamification.level");

    res.json({
      success: true,
      data: {
        topReporters,
        accurateReporters,
        streakLeaders,
        pointLeaders,
      },
    });
  } catch (error) {
    console.error("Top contributors error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching top contributors",
    });
  }
});

// @route   GET /api/leaderboard/achievements
// @desc    Get user achievements and badges
// @access  Private
router.get("/achievements", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select(
      "gamification statistics username fullName"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Calculate potential achievements
    const achievements = calculateAchievements(user);

    // Get recent reports for progress tracking
    const recentReports = await Report.find({ reporter: userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("title incidentType status createdAt");

    res.json({
      success: true,
      data: {
        user: {
          username: user.username,
          fullName: user.fullName,
          gamification: user.gamification,
          statistics: user.statistics,
        },
        achievements,
        recentReports,
        progress: calculateProgress(user),
      },
    });
  } catch (error) {
    console.error("Achievements error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching achievements",
    });
  }
});

// @route   GET /api/leaderboard/stats
// @desc    Get overall leaderboard statistics
// @access  Private
router.get("/stats", auth, async (req, res) => {
  try {
    // Overall statistics
    const totalUsers = await User.countDocuments({ isActive: true });
    const totalReports = await Report.countDocuments();
    const totalPoints = await User.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: null, total: { $sum: "$gamification.points" } } },
    ]);

    // Distribution by level
    const levelDistribution = await User.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: "$gamification.level",
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Activity this month
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const monthlyStats = await Report.aggregate([
      { $match: { createdAt: { $gte: thisMonth } } },
      {
        $group: {
          _id: { $dayOfMonth: "$createdAt" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          totalReports,
          totalPoints: totalPoints[0]?.total || 0,
        },
        levelDistribution,
        monthlyActivity: monthlyStats,
      },
    });
  } catch (error) {
    console.error("Leaderboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching leaderboard stats",
    });
  }
});

// Helper function to calculate achievements
function calculateAchievements(user) {
  const achievements = [];

  // Report-based achievements
  if (user.statistics.reportsSubmitted >= 1) {
    achievements.push({
      id: "first_report",
      name: "First Reporter",
      description: "Submitted your first report",
      icon: "🌱",
      earned: true,
      earnedAt: user.createdAt,
    });
  }

  if (user.statistics.reportsSubmitted >= 10) {
    achievements.push({
      id: "dedicated_reporter",
      name: "Dedicated Reporter",
      description: "Submitted 10 reports",
      icon: "🌿",
      earned: true,
    });
  }

  if (user.statistics.reportsSubmitted >= 50) {
    achievements.push({
      id: "forest_guardian",
      name: "Forest Guardian",
      description: "Submitted 50 reports",
      icon: "🌳",
      earned: true,
    });
  }

  if (user.statistics.reportsSubmitted >= 100) {
    achievements.push({
      id: "mangrove_protector",
      name: "Mangrove Protector",
      description: "Submitted 100 reports",
      icon: "🏆",
      earned: true,
    });
  }

  // Accuracy-based achievements
  if (
    user.statistics.validationAccuracy >= 0.8 &&
    user.statistics.reportsValidated >= 5
  ) {
    achievements.push({
      id: "accurate_reporter",
      name: "Accurate Reporter",
      description: "80% accuracy with 5+ validated reports",
      icon: "🎯",
      earned: true,
    });
  }

  // Streak-based achievements
  if (user.gamification.streak.longest >= 7) {
    achievements.push({
      id: "week_warrior",
      name: "Week Warrior",
      description: "7-day reporting streak",
      icon: "🔥",
      earned: true,
    });
  }

  if (user.gamification.streak.longest >= 30) {
    achievements.push({
      id: "month_master",
      name: "Month Master",
      description: "30-day reporting streak",
      icon: "💪",
      earned: true,
    });
  }

  // Points-based achievements
  if (user.gamification.points >= 100) {
    achievements.push({
      id: "point_collector",
      name: "Point Collector",
      description: "Earned 100 points",
      icon: "⭐",
      earned: true,
    });
  }

  if (user.gamification.points >= 1000) {
    achievements.push({
      id: "point_master",
      name: "Point Master",
      description: "Earned 1000 points",
      icon: "🌟",
      earned: true,
    });
  }

  return achievements;
}

// Helper function to calculate progress towards next achievements
function calculateProgress(user) {
  const progress = [];

  // Next report milestone
  const nextReportMilestone = getNextMilestone(
    user.statistics.reportsSubmitted,
    [1, 10, 25, 50, 100]
  );
  if (nextReportMilestone) {
    progress.push({
      type: "reports",
      current: user.statistics.reportsSubmitted,
      target: nextReportMilestone,
      percentage: Math.round(
        (user.statistics.reportsSubmitted / nextReportMilestone) * 100
      ),
    });
  }

  // Next point milestone
  const nextPointMilestone = getNextMilestone(
    user.gamification.points,
    [100, 500, 1000, 2500, 5000]
  );
  if (nextPointMilestone) {
    progress.push({
      type: "points",
      current: user.gamification.points,
      target: nextPointMilestone,
      percentage: Math.round(
        (user.gamification.points / nextPointMilestone) * 100
      ),
    });
  }

  // Next level
  const pointsForNextLevel = user.gamification.level * 100;
  progress.push({
    type: "level",
    current: user.gamification.points % 100,
    target: 100,
    percentage: Math.round(user.gamification.points % 100),
  });

  return progress;
}

// Helper function to get next milestone
function getNextMilestone(current, milestones) {
  return milestones.find((milestone) => milestone > current);
}

export default router;
