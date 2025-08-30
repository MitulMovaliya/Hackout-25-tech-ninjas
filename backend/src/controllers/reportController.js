import Report from "../models/Report.js";
import User from "../models/User.js";
// import logger from "../utils/logger.js";
import aiService from "../services/aiService.js";
import satelliteService from "../services/satelliteService.js";
import emailService from "../services/emailService.js";
import path from "path";

// @desc    Create new report
// @route   POST /api/reports
// @access  Private
const createReport = async (req, res) => {
  try {
    const {
      title,
      description,
      incidentType,
      severity,
      location,
      isUrgent,
      tags,
    } = req.body;

    // Process uploaded images
    const images = req.files
      ? req.files.map((file) => ({
          filename: file.filename,
          originalName: file.originalname,
          path: file.path,
          size: file.size,
          mimeType: file.mimetype,
        }))
      : [];

    // Create new report
    const report = new Report({
      reporter: req.user.id,
      title,
      description,
      incidentType,
      severity,
      location: {
        type: "Point",
        coordinates: [location.longitude, location.latitude],
        address: location.address,
        landmark: location.landmark,
        accuracy: location.accuracy,
      },
      media: { images },
      isUrgent,
      tags: tags ? tags.split(",").map((tag) => tag.trim()) : [],
      metadata: {
        deviceInfo: {
          userAgent: req.get("User-Agent"),
          platform: req.get("X-Platform") || "unknown",
        },
        reportingMethod: "web_portal",
      },
    });

    await report.save();

    // Update user statistics
    const user = await User.findById(req.user.id);
    user.statistics.reportsSubmitted += 1;
    await user.updateStreak();
    await user.addPoints(10); // Base points for submitting report

    // Calculate initial priority
    await report.calculatePriority();

    // Start AI processing in background
    if (images.length > 0) {
      setImmediate(async () => {
        try {
          await processReportWithAI(report._id);
        } catch (error) {
          console.error("Background AI processing failed:", error);
        }
      });
    }

    // Populate reporter info for response
    await report.populate("reporter", "username fullName");

    console.log(`New report created: ${report._id} by ${user.email}`);

    res.status(201).json({
      success: true,
      message: "Report created successfully",
      data: { report },
    });
  } catch (error) {
    console.error("Create report error:", error);
    res.status(500).json({
      success: false,
      message: "Server error creating report",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

// @desc    Get all reports with filtering and pagination
// @route   GET /api/reports
// @access  Private
const getReports = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      incidentType,
      severity,
      sortBy = "createdAt",
      sortOrder = "desc",
      search,
      location,
      radius = 10,
    } = req.query;

    // Build query
    let query = {};

    // Filter by status
    if (status) {
      query.status = status;
    }

    // Filter by incident type
    if (incidentType) {
      query.incidentType = incidentType;
    }

    // Filter by severity
    if (severity) {
      query.severity = severity;
    }

    // Text search
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
      ];
    }

    // Location-based filtering
    if (location) {
      const [longitude, latitude] = location.split(",").map(Number);
      query["location.coordinates"] = {
        $geoWithin: {
          $centerSphere: [[longitude, latitude], radius / 6378.1],
        },
      };
    }

    // Role-based filtering
    if (req.user.role === "community") {
      // Community users can only see public reports and their own
      query.$or = [{ isPublic: true }, { reporter: req.user.id }];
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === "desc" ? -1 : 1;

    const reports = await Report.find(query)
      .populate("reporter", "username fullName role")
      .populate("validation.humanReviewer", "username fullName")
      .sort(sortOptions)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Report.countDocuments(query);

    res.json({
      success: true,
      data: {
        reports,
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
    console.error("Get reports error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching reports",
    });
  }
};

// @desc    Get single report by ID
// @route   GET /api/reports/:id
// @access  Private
const getReportById = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id)
      .populate("reporter", "username fullName role gamification.level")
      .populate("validation.humanReviewer", "username fullName role")
      .populate("actionTaken.authority", "username fullName role")
      .populate("engagement.comments.user", "username fullName")
      .populate("engagement.votes.voters.user", "username");

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    // Check access permissions
    if (
      req.user.role === "community" &&
      !report.isPublic &&
      report.reporter._id.toString() !== req.user.id
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    // Increment view count
    report.engagement.views += 1;
    await report.save();

    res.json({
      success: true,
      data: { report },
    });
  } catch (error) {
    console.error("Get report by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching report",
    });
  }
};

// @desc    Update report
// @route   PUT /api/reports/:id
// @access  Private
const updateReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    // Check if user can update this report
    if (
      report.reporter.toString() !== req.user.id &&
      !["authority", "admin"].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this report",
      });
    }

    // Only allow updates if report is still pending or in early stages
    if (!["pending", "ai_processing"].includes(report.status)) {
      return res.status(400).json({
        success: false,
        message: "Report cannot be updated in current status",
      });
    }

    const { title, description, severity, isUrgent, tags } = req.body;

    if (title) report.title = title;
    if (description) report.description = description;
    if (severity) report.severity = severity;
    if (typeof isUrgent === "boolean") report.isUrgent = isUrgent;
    if (tags) report.tags = tags.split(",").map((tag) => tag.trim());

    // Recalculate priority if relevant fields changed
    if (severity || isUrgent) {
      await report.calculatePriority();
    }

    await report.save();

    console.log(`Report updated: ${report._id} by ${req.user.email}`);

    res.json({
      success: true,
      message: "Report updated successfully",
      data: { report },
    });
  } catch (error) {
    console.error("Update report error:", error);
    res.status(500).json({
      success: false,
      message: "Server error updating report",
    });
  }
};

// @desc    Delete report
// @route   DELETE /api/reports/:id
// @access  Private
const deleteReport = async (req, res) => {
  try {
    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    // Check if user can delete this report
    if (
      report.reporter.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this report",
      });
    }

    // Only allow deletion if report is pending
    if (report.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: "Cannot delete report that has been processed",
      });
    }

    await Report.findByIdAndDelete(req.params.id);

    // Update user statistics
    const user = await User.findById(req.user.id);
    user.statistics.reportsSubmitted = Math.max(
      0,
      user.statistics.reportsSubmitted - 1
    );
    await user.save();

    console.log(`Report deleted: ${req.params.id} by ${req.user.email}`);

    res.json({
      success: true,
      message: "Report deleted successfully",
    });
  } catch (error) {
    console.error("Delete report error:", error);
    res.status(500).json({
      success: false,
      message: "Server error deleting report",
    });
  }
};

// @desc    Validate report (authority/admin only)
// @route   POST /api/reports/:id/validate
// @access  Private
const validateReport = async (req, res) => {
  try {
    if (!["authority", "ngo", "admin"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Authority role required.",
      });
    }

    const { action, reviewNotes, evidenceQuality, validationScore } = req.body;

    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    // Update validation information
    report.validation = {
      humanReviewer: req.user.id,
      reviewNotes,
      evidenceQuality,
      validationScore,
    };

    // Update status based on action
    if (action === "approve") {
      await report.updateStatus("approved");

      // Award points to reporter for validated report
      const reporter = await User.findById(report.reporter);
      await reporter.addPoints(50);
      reporter.statistics.reportsValidated += 1;
      await reporter.save();

      // Send approval email notification
      try {
        await emailService.sendReportValidationEmail(reporter, report, true);
        console.log(`Approval email sent to: ${reporter.email}`);
      } catch (emailError) {
        console.error(
          `Failed to send approval email to ${reporter.email}:`,
          emailError
        );
      }
    } else if (action === "reject") {
      await report.updateStatus("rejected", reviewNotes);

      // Update reporter statistics
      const reporter = await User.findById(report.reporter);
      reporter.statistics.reportsRejected += 1;
      await reporter.save();

      // Send rejection email notification
      try {
        await emailService.sendReportValidationEmail(reporter, report, false);
        console.log(`Rejection email sent to: ${reporter.email}`);
      } catch (emailError) {
        console.error(
          `Failed to send rejection email to ${reporter.email}:`,
          emailError
        );
      }
    }

    await report.save();

    console.log(`Report ${action}d: ${report._id} by ${req.user.email}`);

    res.json({
      success: true,
      message: `Report ${action}d successfully`,
      data: { report },
    });
  } catch (error) {
    console.error("Validate report error:", error);
    res.status(500).json({
      success: false,
      message: "Server error validating report",
    });
  }
};

// @desc    Take action on report (authority/admin only)
// @route   POST /api/reports/:id/action
// @access  Private
const takeAction = async (req, res) => {
  try {
    if (!["authority", "admin"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Authority role required.",
      });
    }

    const { actionType, actionDescription, followUpRequired, followUpDate } =
      req.body;

    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    // Update action information
    report.actionTaken = {
      authority: req.user.id,
      actionType,
      actionDescription,
      actionDate: new Date(),
      followUpRequired,
      followUpDate: followUpRequired ? new Date(followUpDate) : undefined,
    };

    await report.updateStatus("action_taken");

    // Award additional points to reporter for action taken
    const reporter = await User.findById(report.reporter);
    await reporter.addPoints(25);

    // Send action taken email notification
    try {
      await emailService.sendActionTakenEmail(
        reporter,
        report,
        report.actionTaken
      );
      console.log(`Action taken email sent to: ${reporter.email}`);
    } catch (emailError) {
      console.error(
        `Failed to send action taken email to ${reporter.email}:`,
        emailError
      );
    }

    console.log(`Action taken on report: ${report._id} by ${req.user.email}`);

    res.json({
      success: true,
      message: "Action recorded successfully",
      data: { report },
    });
  } catch (error) {
    console.error("Take action error:", error);
    res.status(500).json({
      success: false,
      message: "Server error recording action",
    });
  }
};

// @desc    Vote on report (upvote/downvote)
// @route   POST /api/reports/:id/vote
// @access  Private
const voteOnReport = async (req, res) => {
  try {
    const { vote } = req.body; // 'up' or 'down'

    if (!["up", "down"].includes(vote)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vote type",
      });
    }

    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    // Check if user already voted
    const existingVoteIndex = report.engagement.votes.voters.findIndex(
      (voter) => voter.user.toString() === req.user.id
    );

    if (existingVoteIndex > -1) {
      const existingVote = report.engagement.votes.voters[existingVoteIndex];

      // Remove old vote counts
      if (existingVote.vote === "up") {
        report.engagement.votes.upvotes -= 1;
      } else {
        report.engagement.votes.downvotes -= 1;
      }

      // Update vote
      existingVote.vote = vote;
      existingVote.votedAt = new Date();
    } else {
      // Add new vote
      report.engagement.votes.voters.push({
        user: req.user.id,
        vote,
        votedAt: new Date(),
      });
    }

    // Update vote counts
    if (vote === "up") {
      report.engagement.votes.upvotes += 1;
    } else {
      report.engagement.votes.downvotes += 1;
    }

    await report.save();

    res.json({
      success: true,
      message: "Vote recorded successfully",
      data: {
        upvotes: report.engagement.votes.upvotes,
        downvotes: report.engagement.votes.downvotes,
      },
    });
  } catch (error) {
    console.error("Vote on report error:", error);
    res.status(500).json({
      success: false,
      message: "Server error recording vote",
    });
  }
};

// @desc    Add comment to report
// @route   POST /api/reports/:id/comment
// @access  Private
const addComment = async (req, res) => {
  try {
    const { content, isPublic = true } = req.body;

    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    // Add comment
    report.engagement.comments.push({
      user: req.user.id,
      content,
      isPublic,
      createdAt: new Date(),
    });

    await report.save();

    // Populate the new comment for response
    await report.populate("engagement.comments.user", "username fullName");

    const newComment =
      report.engagement.comments[report.engagement.comments.length - 1];

    res.json({
      success: true,
      message: "Comment added successfully",
      data: { comment: newComment },
    });
  } catch (error) {
    console.error("Add comment error:", error);
    res.status(500).json({
      success: false,
      message: "Server error adding comment",
    });
  }
};

// @desc    Get reports by location
// @route   GET /api/reports/location/:longitude/:latitude
// @access  Private
const getReportsByLocation = async (req, res) => {
  try {
    const { longitude, latitude } = req.params;
    const { radius = 10 } = req.query;

    const reports = await Report.getReportsByLocation(
      parseFloat(longitude),
      parseFloat(latitude),
      parseFloat(radius)
    ).populate("reporter", "username fullName");

    res.json({
      success: true,
      data: { reports },
    });
  } catch (error) {
    console.error("Get reports by location error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching reports by location",
    });
  }
};

// @desc    Get reports by user
// @route   GET /api/reports/user/:userId
// @access  Private
const getReportsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

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

    const skip = (page - 1) * limit;

    const reports = await Report.find({ reporter: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("reporter", "username fullName");

    const total = await Report.countDocuments({ reporter: userId });

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
    console.error("Get reports by user error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching user reports",
    });
  }
};

// @desc    Get report analytics and statistics
// @route   GET /api/reports/analytics/stats
// @access  Private
const getReportStats = async (req, res) => {
  try {
    if (!["authority", "ngo", "admin"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const stats = await Report.getDashboardStats();

    // Additional analytics
    const totalReports = await Report.countDocuments();
    const recentReports = await Report.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    });

    const incidentTypeStats = await Report.aggregate([
      {
        $group: {
          _id: "$incidentType",
          count: { $sum: 1 },
        },
      },
    ]);

    const severityStats = await Report.aggregate([
      {
        $group: {
          _id: "$severity",
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      success: true,
      data: {
        total: totalReports,
        recentReports,
        statusDistribution: stats,
        incidentTypeDistribution: incidentTypeStats,
        severityDistribution: severityStats,
      },
    });
  } catch (error) {
    console.error("Get report stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching report statistics",
    });
  }
};

// @desc    Process report with AI analysis
// @route   POST /api/reports/:id/process-ai
// @access  Private (Admin/System)
const processWithAI = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    const report = await Report.findById(req.params.id);

    if (!report) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    await processReportWithAI(report._id);

    res.json({
      success: true,
      message: "AI processing completed",
      data: { report },
    });
  } catch (error) {
    console.error("Process with AI error:", error);
    res.status(500).json({
      success: false,
      message: "Server error processing with AI",
    });
  }
};

// Helper function to process report with AI
const processReportWithAI = async (reportId) => {
  try {
    const report = await Report.findById(reportId);

    if (!report) {
      throw new Error("Report not found");
    }

    await report.updateStatus("ai_processing");

    const aiAnalysis = {};

    // Image classification
    if (report.media.images.length > 0) {
      const imageClassification = await aiService.classifyImages(
        report.media.images.map((img) => img.path)
      );
      aiAnalysis.imageClassification = imageClassification;
    }

    // Satellite validation
    const satelliteValidation = await satelliteService.analyzeSatelliteData(
      report.location.coordinates[0],
      report.location.coordinates[1]
    );
    aiAnalysis.satelliteValidation = satelliteValidation;

    // Anomaly detection
    const anomalyDetection = await aiService.detectAnomalies(
      report.reporter,
      report.location.coordinates
    );
    aiAnalysis.anomalyDetection = anomalyDetection;

    // Add AI analysis to report
    await report.addAIAnalysis(aiAnalysis);

    // Update status based on AI confidence
    if (aiAnalysis.overallScore > 0.7) {
      await report.updateStatus("ai_validated");
    } else {
      await report.updateStatus("human_review");
    }

    console.log(`AI processing completed for report: ${reportId}`);
  } catch (error) {
    console.error(`AI processing failed for report ${reportId}:`, error);

    // Update report status to indicate AI processing failed
    const report = await Report.findById(reportId);
    if (report) {
      await report.updateStatus("human_review");
    }
  }
};

export default {
  createReport,
  getReports,
  getReportById,
  updateReport,
  deleteReport,
  validateReport,
  takeAction,
  voteOnReport,
  addComment,
  getReportsByLocation,
  getReportsByUser,
  getReportStats,
  processWithAI,
};
