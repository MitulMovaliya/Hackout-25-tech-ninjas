import express from "express";
const router = express.Router();
import reportController from "../controllers/reportController.js";
import auth from "../middleware/auth.js";
import upload from "../middleware/upload.js";
import { validateReport } from "../middleware/validation.js";

// @route   POST /api/reports
// @desc    Create new report
// @access  Private
router.post(
  "/",
  auth,
  upload.array("images", 5), // Allow up to 5 images
  validateReport,
  reportController.createReport
);

// @route   GET /api/reports
// @desc    Get all reports with filtering and pagination
// @access  Private
router.get("/", auth, reportController.getReports);

// @route   GET /api/reports/:id
// @desc    Get single report by ID
// @access  Private
router.get("/:id", auth, reportController.getReportById);

// @route   PUT /api/reports/:id
// @desc    Update report
// @access  Private
router.put("/:id", auth, reportController.updateReport);

// @route   DELETE /api/reports/:id
// @desc    Delete report
// @access  Private
router.delete("/:id", auth, reportController.deleteReport);

// @route   POST /api/reports/:id/validate
// @desc    Validate report (authority/admin only)
// @access  Private
router.post("/:id/validate", auth, reportController.validateReport);

// @route   POST /api/reports/:id/action
// @desc    Take action on report (authority/admin only)
// @access  Private
router.post("/:id/action", auth, reportController.takeAction);

// @route   POST /api/reports/:id/vote
// @desc    Vote on report (upvote/downvote)
// @access  Private
router.post("/:id/vote", auth, reportController.voteOnReport);

// @route   POST /api/reports/:id/comment
// @desc    Add comment to report
// @access  Private
router.post("/:id/comment", auth, reportController.addComment);

// @route   GET /api/reports/location/:longitude/:latitude
// @desc    Get reports by location
// @access  Private
router.get(
  "/location/:longitude/:latitude",
  auth,
  reportController.getReportsByLocation
);

// @route   GET /api/reports/user/:userId
// @desc    Get reports by user
// @access  Private
router.get("/user/:userId", auth, reportController.getReportsByUser);

// @route   GET /api/reports/analytics/stats
// @desc    Get report analytics and statistics
// @access  Private
router.get("/analytics/stats", auth, reportController.getReportStats);

// @route   POST /api/reports/:id/process-ai
// @desc    Process report with AI analysis
// @access  Private (Admin/System)
router.post("/:id/process-ai", auth, reportController.processWithAI);

export default router;
