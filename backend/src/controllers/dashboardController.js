import Report from "../models/Report.js";
import User from "../models/User.js";

// @desc    Get dashboard overview statistics
// @route   GET /api/dashboard/overview
// @access  Private (Authority/Admin)
const getDashboardOverview = async (req, res) => {
  try {
    if (!["authority", "ngo", "admin"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Authority role required.",
      });
    }

    // Get total counts
    const totalReports = await Report.countDocuments();
    const totalUsers = await User.countDocuments({ isActive: true });
    
    // Get status distribution
    const statusStats = await Report.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Get incident type distribution
    const incidentStats = await Report.aggregate([
      {
        $group: {
          _id: "$incidentType",
          count: { $sum: 1 },
        },
      },
    ]);

    // Get severity distribution
    const severityStats = await Report.aggregate([
      {
        $group: {
          _id: "$severity",
          count: { $sum: 1 },
        },
      },
    ]);

    // Get recent activity (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentReports = await Report.countDocuments({
      createdAt: { $gte: weekAgo },
    });

    // Get monthly trends (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyTrends = await Report.aggregate([
      {
        $match: {
          createdAt: { $gte: sixMonthsAgo },
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
      {
        $sort: { "_id.year": 1, "_id.month": 1 },
      },
    ]);

    // Get urgent reports count
    const urgentReports = await Report.countDocuments({
      isUrgent: true,
      status: { $in: ["pending", "ai_processing"] },
    });

    // Get top reporters
    const topReporters = await User.aggregate([
      {
        $match: { isActive: true },
      },
      {
        $sort: { "statistics.reportsSubmitted": -1 },
      },
      {
        $limit: 5,
      },
      {
        $project: {
          username: 1,
          fullName: 1,
          "statistics.reportsSubmitted": 1,
          "gamification.points": 1,
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        overview: {
          totalReports,
          totalUsers,
          recentReports,
          urgentReports,
        },
        distributions: {
          status: statusStats,
          incidentType: incidentStats,
          severity: severityStats,
        },
        trends: {
          monthly: monthlyTrends,
        },
        topReporters,
      },
    });
  } catch (error) {
    console.error("Dashboard overview error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching dashboard overview",
    });
  }
};

// @desc    Get pending reports for validation
// @route   GET /api/dashboard/pending
// @access  Private (Authority/Admin)
const getPendingReports = async (req, res) => {
  try {
    if (!["authority", "ngo", "admin"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Authority role required.",
      });
    }

    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const pendingReports = await Report.find({
      status: { $in: ["pending", "ai_processing"] },
    })
      .populate("reporter", "username fullName")
      .sort({ priority: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Report.countDocuments({
      status: { $in: ["pending", "ai_processing"] },
    });

    res.json({
      success: true,
      data: {
        reports: pendingReports,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
        },
      },
    });
  } catch (error) {
    console.error("Get pending reports error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching pending reports",
    });
  }
};

// @desc    Get activity feed
// @route   GET /api/dashboard/activity
// @access  Private (Authority/Admin)
const getActivityFeed = async (req, res) => {
  try {
    if (!["authority", "ngo", "admin"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Authority role required.",
      });
    }

    const { limit = 50 } = req.query;

    // Get recent reports with their updates
    const recentActivity = await Report.find({})
      .populate("reporter", "username fullName")
      .populate("validation.humanReviewer", "username fullName")
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit))
      .select(
        "title status reporter validation.humanReviewer createdAt updatedAt workflow"
      );

    // Format activity items
    const activityItems = [];

    recentActivity.forEach((report) => {
      // Report submission
      activityItems.push({
        id: `${report._id}_submitted`,
        type: "report_submitted",
        title: `New report: ${report.title}`,
        user: report.reporter,
        timestamp: report.createdAt,
        reportId: report._id,
      });

      // Status changes
      if (report.status !== "pending" && report.validation?.humanReviewer) {
        activityItems.push({
          id: `${report._id}_${report.status}`,
          type: `report_${report.status}`,
          title: `Report ${report.status}: ${report.title}`,
          user: report.validation.humanReviewer,
          timestamp: report.updatedAt,
          reportId: report._id,
        });
      }
    });

    // Sort by timestamp and limit
    activityItems.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    const limitedActivity = activityItems.slice(0, parseInt(limit));

    res.json({
      success: true,
      data: {
        activities: limitedActivity,
      },
    });
  } catch (error) {
    console.error("Get activity feed error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching activity feed",
    });
  }
};

// @desc    Get location-based statistics
// @route   GET /api/dashboard/locations
// @access  Private (Authority/Admin)
const getLocationStats = async (req, res) => {
  try {
    if (!["authority", "ngo", "admin"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Authority role required.",
      });
    }

    // Get reports with location data for mapping
    const locationData = await Report.aggregate([
      {
        $match: {
          "location.coordinates": { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: {
            lat: { $round: [{ $arrayElemAt: ["$location.coordinates", 1] }, 2] },
            lng: { $round: [{ $arrayElemAt: ["$location.coordinates", 0] }, 2] },
          },
          count: { $sum: 1 },
          reports: {
            $push: {
              id: "$_id",
              title: "$title",
              status: "$status",
              incidentType: "$incidentType",
              severity: "$severity",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          coordinates: ["$_id.lng", "$_id.lat"],
          count: 1,
          reports: { $slice: ["$reports", 5] }, // Limit to 5 reports per location cluster
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        locations: locationData,
      },
    });
  } catch (error) {
    console.error("Get location stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching location statistics",
    });
  }
};

export default {
  getDashboardOverview,
  getPendingReports,
  getActivityFeed,
  getLocationStats,
};
