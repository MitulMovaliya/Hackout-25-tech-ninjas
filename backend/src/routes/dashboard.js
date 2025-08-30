import express from "express";
const router = express.Router();
import Report from "../models/Report.js";
import User from "../models/User.js";
import auth from "../middleware/auth.js";
import { authorize } from "../middleware/auth.js";
// import logger from "../utils/logger.js";

// @route   GET /api/dashboard/overview
// @desc    Get dashboard overview statistics
// @access  Private (Authority/Admin)
router.get(
  "/overview",
  auth,
  authorize("authority", "admin", "ngo"),
  async (req, res) => {
    try {
      // Get basic statistics
      const totalReports = await Report.countDocuments();
      const pendingReports = await Report.countDocuments({ status: "pending" });
      const validatedReports = await Report.countDocuments({
        status: { $in: ["approved", "ai_validated"] },
      });
      const activeUsers = await User.countDocuments({ isActive: true });

      // Get reports from last 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentReports = await Report.countDocuments({
        createdAt: { $gte: thirtyDaysAgo },
      });

      // Get status distribution
      const statusDistribution = await Report.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ]);

      // Get incident type distribution
      const incidentDistribution = await Report.aggregate([
        {
          $group: {
            _id: "$incidentType",
            count: { $sum: 1 },
          },
        },
      ]);

      // Get severity distribution
      const severityDistribution = await Report.aggregate([
        {
          $group: {
            _id: "$severity",
            count: { $sum: 1 },
          },
        },
      ]);

      // Get daily report counts for the last 30 days
      const dailyReports = await Report.aggregate([
        {
          $match: {
            createdAt: { $gte: thirtyDaysAgo },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$createdAt",
              },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);

      res.json({
        success: true,
        data: {
          overview: {
            totalReports,
            pendingReports,
            validatedReports,
            activeUsers,
            recentReports,
          },
          distributions: {
            status: statusDistribution,
            incidentType: incidentDistribution,
            severity: severityDistribution,
          },
          trends: {
            daily: dailyReports,
          },
        },
      });
    } catch (error) {
      console.error("Dashboard overview error:", error);
      res.status(500).json({
        success: false,
        message: "Server error fetching dashboard overview",
      });
    }
  }
);

// @route   GET /api/dashboard/map-data
// @desc    Get map data for dashboard
// @access  Private (Authority/Admin)
router.get(
  "/map-data",
  auth,
  authorize("authority", "admin", "ngo"),
  async (req, res) => {
    try {
      const { bounds, filters } = req.query;

      let query = {};

      // Apply filters
      if (filters) {
        const filterObj = JSON.parse(filters);
        if (filterObj.status) query.status = filterObj.status;
        if (filterObj.incidentType) query.incidentType = filterObj.incidentType;
        if (filterObj.severity) query.severity = filterObj.severity;
        if (filterObj.dateFrom || filterObj.dateTo) {
          query.createdAt = {};
          if (filterObj.dateFrom)
            query.createdAt.$gte = new Date(filterObj.dateFrom);
          if (filterObj.dateTo)
            query.createdAt.$lte = new Date(filterObj.dateTo);
        }
      }

      // Apply geographical bounds if provided
      if (bounds) {
        const boundsObj = JSON.parse(bounds);
        query["location.coordinates"] = {
          $geoWithin: {
            $box: [
              [boundsObj.southwest.lng, boundsObj.southwest.lat],
              [boundsObj.northeast.lng, boundsObj.northeast.lat],
            ],
          },
        };
      }

      const reports = await Report.find(query)
        .select(
          "title incidentType severity location status createdAt aiAnalysis.overallScore priority"
        )
        .populate("reporter", "username fullName")
        .limit(1000); // Limit for performance

      // Get heatmap data
      const heatmapData = reports.map((report) => ({
        lat: report.location.coordinates[1],
        lng: report.location.coordinates[0],
        intensity:
          report.severity === "critical"
            ? 1
            : report.severity === "high"
            ? 0.8
            : report.severity === "medium"
            ? 0.6
            : 0.4,
      }));

      res.json({
        success: true,
        data: {
          reports,
          heatmapData,
          total: reports.length,
        },
      });
    } catch (error) {
      console.error("Dashboard map data error:", error);
      res.status(500).json({
        success: false,
        message: "Server error fetching map data",
      });
    }
  }
);

// @route   GET /api/dashboard/analytics
// @desc    Get advanced analytics
// @access  Private (Authority/Admin)
router.get(
  "/analytics",
  auth,
  authorize("authority", "admin", "ngo"),
  async (req, res) => {
    try {
      // AI validation accuracy
      const aiAccuracy = await Report.aggregate([
        {
          $match: {
            "aiAnalysis.overallScore": { $exists: true },
            status: { $in: ["approved", "rejected"] },
          },
        },
        {
          $group: {
            _id: null,
            totalAIProcessed: { $sum: 1 },
            correctPredictions: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $gte: ["$aiAnalysis.overallScore", 0.7] },
                      { $eq: ["$status", "approved"] },
                    ],
                  },
                  1,
                  {
                    $cond: [
                      {
                        $and: [
                          { $lt: ["$aiAnalysis.overallScore", 0.7] },
                          { $eq: ["$status", "rejected"] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                ],
              },
            },
          },
        },
        {
          $project: {
            accuracy: {
              $cond: [
                { $gt: ["$totalAIProcessed", 0] },
                { $divide: ["$correctPredictions", "$totalAIProcessed"] },
                0,
              ],
            },
            totalProcessed: "$totalAIProcessed",
          },
        },
      ]);

      // User engagement metrics
      const userEngagement = await User.aggregate([
        {
          $group: {
            _id: null,
            totalUsers: { $sum: 1 },
            activeUsers: {
              $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] },
            },
            verifiedUsers: {
              $sum: { $cond: [{ $eq: ["$isVerified", true] }, 1, 0] },
            },
            avgPointsPerUser: { $avg: "$gamification.points" },
            avgReportsPerUser: { $avg: "$statistics.reportsSubmitted" },
          },
        },
      ]);

      // Response time analytics
      const responseTime = await Report.aggregate([
        {
          $match: {
            "workflow.approvedAt": { $exists: true },
            "workflow.submittedAt": { $exists: true },
          },
        },
        {
          $project: {
            responseTimeHours: {
              $divide: [
                {
                  $subtract: ["$workflow.approvedAt", "$workflow.submittedAt"],
                },
                1000 * 60 * 60,
              ],
            },
          },
        },
        {
          $group: {
            _id: null,
            avgResponseTime: { $avg: "$responseTimeHours" },
            minResponseTime: { $min: "$responseTimeHours" },
            maxResponseTime: { $max: "$responseTimeHours" },
          },
        },
      ]);

      // Geographic distribution
      const geographicDistribution = await Report.aggregate([
        {
          $group: {
            _id: {
              lat: {
                $round: [{ $arrayElemAt: ["$location.coordinates", 1] }, 1],
              },
              lng: {
                $round: [{ $arrayElemAt: ["$location.coordinates", 0] }, 1],
              },
            },
            count: { $sum: 1 },
            severityBreakdown: {
              $push: "$severity",
            },
          },
        },
        {
          $project: {
            location: "$_id",
            count: 1,
            severityDistribution: {
              $reduce: {
                input: "$severityBreakdown",
                initialValue: { low: 0, medium: 0, high: 0, critical: 0 },
                in: {
                  low: {
                    $cond: [
                      { $eq: ["$$this", "low"] },
                      { $add: ["$$value.low", 1] },
                      "$$value.low",
                    ],
                  },
                  medium: {
                    $cond: [
                      { $eq: ["$$this", "medium"] },
                      { $add: ["$$value.medium", 1] },
                      "$$value.medium",
                    ],
                  },
                  high: {
                    $cond: [
                      { $eq: ["$$this", "high"] },
                      { $add: ["$$value.high", 1] },
                      "$$value.high",
                    ],
                  },
                  critical: {
                    $cond: [
                      { $eq: ["$$this", "critical"] },
                      { $add: ["$$value.critical", 1] },
                      "$$value.critical",
                    ],
                  },
                },
              },
            },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]);

      res.json({
        success: true,
        data: {
          aiAccuracy: aiAccuracy[0] || { accuracy: 0, totalProcessed: 0 },
          userEngagement: userEngagement[0] || {},
          responseTime: responseTime[0] || {},
          geographicDistribution,
        },
      });
    } catch (error) {
      console.error("Dashboard analytics error:", error);
      res.status(500).json({
        success: false,
        message: "Server error fetching analytics",
      });
    }
  }
);

// @route   GET /api/dashboard/recent-activity
// @desc    Get recent activity feed
// @access  Private (Authority/Admin)
router.get(
  "/recent-activity",
  auth,
  authorize("authority", "admin", "ngo"),
  async (req, res) => {
    try {
      const { limit = 20 } = req.query;

      // Get recent reports
      const recentReports = await Report.find()
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .populate("reporter", "username fullName")
        .populate("validation.humanReviewer", "username fullName")
        .select("title incidentType severity status createdAt workflow");

      // Get recent user registrations
      const recentUsers = await User.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("username fullName role createdAt");

      // Format activity feed
      const activities = [];

      recentReports.forEach((report) => {
        activities.push({
          type: "report_created",
          timestamp: report.createdAt,
          data: {
            reportId: report._id,
            title: report.title,
            incidentType: report.incidentType,
            severity: report.severity,
            reporter: report.reporter,
          },
        });

        if (report.workflow.approvedAt) {
          activities.push({
            type: "report_approved",
            timestamp: report.workflow.approvedAt,
            data: {
              reportId: report._id,
              title: report.title,
              reviewer: report.validation.humanReviewer,
            },
          });
        }
      });

      recentUsers.forEach((user) => {
        activities.push({
          type: "user_registered",
          timestamp: user.createdAt,
          data: {
            userId: user._id,
            username: user.username,
            fullName: user.fullName,
            role: user.role,
          },
        });
      });

      // Sort by timestamp
      activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      res.json({
        success: true,
        data: {
          activities: activities.slice(0, parseInt(limit)),
        },
      });
    } catch (error) {
      console.error("Dashboard recent activity error:", error);
      res.status(500).json({
        success: false,
        message: "Server error fetching recent activity",
      });
    }
  }
);

// @route   GET /api/dashboard/export
// @desc    Export dashboard data
// @access  Private (Admin only)
router.get("/export", auth, authorize("admin"), async (req, res) => {
  try {
    const { format = "json", dateFrom, dateTo } = req.query;

    let query = {};
    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    const reports = await Report.find(query)
      .populate("reporter", "username fullName email")
      .populate("validation.humanReviewer", "username fullName")
      .populate("actionTaken.authority", "username fullName");

    if (format === "csv") {
      // Convert to CSV format
      const csv = convertToCSV(reports);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="reports-export.csv"'
      );
      res.send(csv);
    } else {
      res.json({
        success: true,
        data: { reports },
        exportedAt: new Date(),
        totalRecords: reports.length,
      });
    }
  } catch (error) {
    console.error("Dashboard export error:", error);
    res.status(500).json({
      success: false,
      message: "Server error exporting data",
    });
  }
});

// Helper function to convert data to CSV
function convertToCSV(reports) {
  const headers = [
    "ID",
    "Title",
    "Incident Type",
    "Severity",
    "Status",
    "Reporter",
    "Location (Lat)",
    "Location (Lng)",
    "Created At",
    "AI Score",
  ];

  const rows = reports.map((report) => [
    report._id,
    report.title,
    report.incidentType,
    report.severity,
    report.status,
    report.reporter?.fullName || "Unknown",
    report.location.coordinates[1],
    report.location.coordinates[0],
    report.createdAt.toISOString(),
    report.aiAnalysis?.overallScore || "N/A",
  ]);

  return [headers, ...rows]
    .map((row) => row.map((cell) => `"${cell}"`).join(","))
    .join("\\n");
}

export default router;
