import express from "express";
import emailService from "../services/emailService.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// @desc    Test email service
// @route   POST /api/email/test
// @access  Private (admin only)
router.post("/test", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin role required.",
      });
    }

    const { emailType, recipientEmail } = req.body;

    let result;
    const mockUser = {
      fullName: "Test User",
      email: recipientEmail || req.user.email,
      gamification: {
        points: 150,
        streak: { current: 5 },
      },
    };

    const mockReport = {
      _id: "test-report-id",
      title: "Test Mangrove Cutting Report",
      description: "This is a test report for email verification",
      incidentType: "illegal_cutting",
      severity: "medium",
      status: "pending",
      createdAt: new Date(),
      workflow: {},
    };

    const mockAction = {
      actionType: "investigation",
      actionDescription:
        "Field team dispatched to investigate the reported area",
      actionDate: new Date(),
    };

    const mockStats = {
      reportsSubmitted: 3,
      pointsEarned: 75,
      leaderboardPosition: 12,
      communityReports: 45,
      validatedReports: 38,
      actionsTaken: 15,
    };

    switch (emailType) {
      case "welcome":
        result = await emailService.sendWelcomeEmail(mockUser);
        break;

      case "report_approved":
        result = await emailService.sendReportValidationEmail(
          mockUser,
          mockReport,
          true
        );
        break;

      case "report_rejected":
        mockReport.workflow.rejectionReason = "Insufficient evidence provided";
        result = await emailService.sendReportValidationEmail(
          mockUser,
          mockReport,
          false
        );
        break;

      case "action_taken":
        result = await emailService.sendActionTakenEmail(
          mockUser,
          mockReport,
          mockAction
        );
        break;

      case "weekly_digest":
        result = await emailService.sendWeeklyDigest(
          mockUser,
          [mockReport],
          mockStats
        );
        break;

      default:
        return res.status(400).json({
          success: false,
          message:
            "Invalid email type. Use: welcome, report_approved, report_rejected, action_taken, weekly_digest",
        });
    }

    res.json({
      success: true,
      message: `${emailType} email sent successfully`,
      data: {
        messageId: result.messageId,
        recipient: mockUser.email,
        emailType,
      },
    });
  } catch (error) {
    console.error("Email test error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send test email",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// @desc    Send weekly digest to all users
// @route   POST /api/email/weekly-digest
// @access  Private (admin only)
router.post("/weekly-digest", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin role required.",
      });
    }

    const { User } = await import("../models/User.js");
    const { Report } = await import("../models/Report.js");

    // Get all users who want to receive weekly digests
    const users = await User.find({
      "preferences.emailNotifications": true,
      "preferences.weeklyDigest": { $ne: false },
    });

    const results = [];
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7); // Last 7 days

    for (const user of users) {
      try {
        // Get user's reports from last week
        const userReports = await Report.find({
          reporter: user._id,
          createdAt: { $gte: startDate },
        }).limit(5);

        // Calculate user stats
        const stats = {
          reportsSubmitted: userReports.length,
          pointsEarned: userReports.reduce((sum, report) => {
            let points = 10; // Base points for submission
            if (report.status === "approved") points += 50;
            if (report.status === "action_taken") points += 25;
            return sum + points;
          }, 0),
          leaderboardPosition: await calculateUserRank(user._id),
          communityReports: await Report.countDocuments({
            createdAt: { $gte: startDate },
          }),
          validatedReports: await Report.countDocuments({
            status: "approved",
            createdAt: { $gte: startDate },
          }),
          actionsTaken: await Report.countDocuments({
            status: "action_taken",
            createdAt: { $gte: startDate },
          }),
        };

        await emailService.sendWeeklyDigest(user, userReports, stats);
        results.push({ email: user.email, status: "sent" });
      } catch (error) {
        console.error(`Failed to send weekly digest to ${user.email}:`, error);
        results.push({
          email: user.email,
          status: "failed",
          error: error.message,
        });
      }
    }

    res.json({
      success: true,
      message: `Weekly digest sent to ${
        results.filter((r) => r.status === "sent").length
      } users`,
      data: { results },
    });
  } catch (error) {
    console.error("Weekly digest error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send weekly digest",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// Helper function to calculate user rank
async function calculateUserRank(userId) {
  const { User } = await import("../models/User.js");

  const users = await User.find({})
    .sort({ "gamification.points": -1 })
    .select("_id gamification.points");

  const userIndex = users.findIndex(
    (user) => user._id.toString() === userId.toString()
  );
  return userIndex + 1;
}

// @desc    Get email service status
// @route   GET /api/email/status
// @access  Private (admin only)
router.get("/status", auth, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin role required.",
      });
    }

    const status = {
      configured: !!(
        process.env.EMAIL_HOST &&
        process.env.EMAIL_USER &&
        process.env.EMAIL_PASS
      ),
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      user: process.env.EMAIL_USER
        ? process.env.EMAIL_USER.replace(/.{1,3}/, (match) =>
            "*".repeat(match.length)
          )
        : "Not configured",
      lastTest: null, // Could be stored in database
    };

    res.json({
      success: true,
      data: { status },
    });
  } catch (error) {
    console.error("Email status error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get email status",
    });
  }
});

export default router;
