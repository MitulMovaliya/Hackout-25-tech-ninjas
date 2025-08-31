import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import auth from "../middleware/auth.js";

const router = express.Router();

// Ensure upload directories exist
const uploadDir = "uploads";
const reportsDir = path.join(uploadDir, "reports");
const profilesDir = path.join(uploadDir, "profiles");

[uploadDir, reportsDir, profilesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Configure storage for report images
const reportStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, reportsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// Configure storage for profile images
const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profilesDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `profile-${uniqueSuffix}${ext}`);
  },
});

// File filter function
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only JPEG, JPG, and PNG images are allowed."), false);
  }
};

// Configure multer for reports
const uploadReportImages = multer({
  storage: reportStorage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 5, // Maximum 5 files
  },
  fileFilter: fileFilter,
});

// Configure multer for profiles
const uploadProfileImage = multer({
  storage: profileStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1, // Single file
  },
  fileFilter: fileFilter,
});

// @route   POST /api/uploads/report-images
// @desc    Upload images for reports
// @access  Private
router.post("/report-images", auth, uploadReportImages.array("images", 5), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No files uploaded",
      });
    }

    const uploadedFiles = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      size: file.size,
      mimeType: file.mimetype,
      url: `/uploads/reports/${file.filename}`,
    }));

    res.json({
      success: true,
      message: "Files uploaded successfully",
      data: {
        files: uploadedFiles,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during upload",
    });
  }
});

// @route   POST /api/uploads/profile-image
// @desc    Upload profile image
// @access  Private
router.post("/profile-image", auth, uploadProfileImage.single("image"), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const uploadedFile = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      mimeType: req.file.mimetype,
      url: `/uploads/profiles/${req.file.filename}`,
    };

    res.json({
      success: true,
      message: "Profile image uploaded successfully",
      data: {
        file: uploadedFile,
      },
    });
  } catch (error) {
    console.error("Profile upload error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during profile upload",
    });
  }
});

// @route   DELETE /api/uploads/:type/:filename
// @desc    Delete uploaded file
// @access  Private
router.delete("/:type/:filename", auth, (req, res) => {
  try {
    const { type, filename } = req.params;
    
    // Validate type
    if (!["reports", "profiles"].includes(type)) {
      return res.status(400).json({
        success: false,
        message: "Invalid file type",
      });
    }

    const filePath = path.join(uploadDir, type, filename);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: "File not found",
      });
    }

    // Delete file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: "File deleted successfully",
    });
  } catch (error) {
    console.error("Delete file error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during file deletion",
    });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File too large",
      });
    }
    
    if (error.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        success: false,
        message: "Too many files",
      });
    }
  }
  
  if (error.message.includes("Invalid file type")) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }
  
  next(error);
});

export default router;
