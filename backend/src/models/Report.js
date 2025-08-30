import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    incidentType: {
      type: String,
      enum: [
        "cutting",
        "dumping",
        "pollution",
        "encroachment",
        "fire",
        "other",
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "medium",
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
      address: String,
      landmark: String,
      accuracy: Number, // GPS accuracy in meters
    },
    media: {
      images: [
        {
          filename: String,
          originalName: String,
          path: String,
          size: Number,
          mimeType: String,
          uploadedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      videos: [
        {
          filename: String,
          originalName: String,
          path: String,
          size: Number,
          mimeType: String,
          duration: Number,
          uploadedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
    },
    aiAnalysis: {
      imageClassification: {
        predictions: [
          {
            class: String, // 'mangrove', 'cutting', 'dumping', 'invalid'
            confidence: Number,
            model: String,
            timestamp: {
              type: Date,
              default: Date.now,
            },
          },
        ],
        averageConfidence: Number,
        primaryClass: String,
        isValid: Boolean,
      },
      satelliteValidation: {
        ndviAnalysis: {
          beforeNDVI: Number,
          afterNDVI: Number,
          difference: Number,
          changeDetected: Boolean,
          satelliteSource: String, // 'sentinel', 'nasa', 'landsat'
          analysisDate: Date,
        },
        vegetationLoss: {
          percentage: Number,
          area: Number, // in square meters
          confirmed: Boolean,
        },
      },
      anomalyDetection: {
        score: Number,
        flags: [
          {
            type: String, // 'duplicate_location', 'frequent_reporter', 'suspicious_timing'
            severity: String,
            description: String,
          },
        ],
        isSuspicious: Boolean,
      },
      overallScore: Number, // Combined AI confidence score
      validatedAt: Date,
    },
    status: {
      type: String,
      enum: [
        "pending",
        "ai_processing",
        "ai_validated",
        "human_review",
        "approved",
        "rejected",
        "action_taken",
        "resolved",
      ],
      default: "pending",
    },
    workflow: {
      submittedAt: {
        type: Date,
        default: Date.now,
      },
      aiProcessedAt: Date,
      humanReviewedAt: Date,
      approvedAt: Date,
      actionTakenAt: Date,
      resolvedAt: Date,
      rejectedAt: Date,
      rejectionReason: String,
    },
    validation: {
      humanReviewer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      reviewNotes: String,
      validationScore: Number,
      evidenceQuality: {
        type: String,
        enum: ["poor", "fair", "good", "excellent"],
      },
    },
    actionTaken: {
      authority: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
      actionType: String,
      actionDescription: String,
      actionDate: Date,
      followUpRequired: Boolean,
      followUpDate: Date,
    },
    engagement: {
      views: {
        type: Number,
        default: 0,
      },
      votes: {
        upvotes: {
          type: Number,
          default: 0,
        },
        downvotes: {
          type: Number,
          default: 0,
        },
        voters: [
          {
            user: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "User",
            },
            vote: {
              type: String,
              enum: ["up", "down"],
            },
            votedAt: {
              type: Date,
              default: Date.now,
            },
          },
        ],
      },
      comments: [
        {
          user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
          },
          content: String,
          createdAt: {
            type: Date,
            default: Date.now,
          },
          isPublic: {
            type: Boolean,
            default: true,
          },
        },
      ],
    },
    metadata: {
      deviceInfo: {
        userAgent: String,
        platform: String,
        appVersion: String,
      },
      weatherConditions: {
        temperature: Number,
        humidity: Number,
        windSpeed: Number,
        visibility: String,
      },
      reportingMethod: {
        type: String,
        enum: ["mobile_app", "web_portal", "api"],
        default: "mobile_app",
      },
    },
    priority: {
      type: Number,
      default: 5, // 1-10 scale
      min: 1,
      max: 10,
    },
    tags: [String],
    isPublic: {
      type: Boolean,
      default: true,
    },
    isUrgent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
reportSchema.index({ "location.coordinates": "2dsphere" });
reportSchema.index({ status: 1 });
reportSchema.index({ incidentType: 1 });
reportSchema.index({ severity: 1 });
reportSchema.index({ reporter: 1 });
reportSchema.index({ createdAt: -1 });
reportSchema.index({ priority: -1 });
reportSchema.index({ "aiAnalysis.overallScore": -1 });

// Compound indexes
reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ incidentType: 1, severity: 1 });
reportSchema.index({ reporter: 1, status: 1 });

// Virtual for calculating age of report
reportSchema.virtual("age").get(function () {
  return Date.now() - this.createdAt;
});

// Virtual for determining if report is stale (older than 30 days)
reportSchema.virtual("isStale").get(function () {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return this.createdAt < thirtyDaysAgo;
});

// Method to update status with timestamp
reportSchema.methods.updateStatus = function (newStatus, reason = null) {
  this.status = newStatus;

  const timestamp = new Date();
  switch (newStatus) {
    case "ai_processing":
      this.workflow.aiProcessedAt = timestamp;
      break;
    case "ai_validated":
      this.workflow.aiProcessedAt = timestamp;
      break;
    case "human_review":
      this.workflow.humanReviewedAt = timestamp;
      break;
    case "approved":
      this.workflow.approvedAt = timestamp;
      break;
    case "rejected":
      this.workflow.rejectedAt = timestamp;
      if (reason) this.workflow.rejectionReason = reason;
      break;
    case "action_taken":
      this.workflow.actionTakenAt = timestamp;
      break;
    case "resolved":
      this.workflow.resolvedAt = timestamp;
      break;
  }

  return this.save();
};

// Method to add AI analysis results
reportSchema.methods.addAIAnalysis = function (analysisData) {
  this.aiAnalysis = { ...this.aiAnalysis.toObject(), ...analysisData };
  this.aiAnalysis.validatedAt = new Date();

  // Calculate overall score based on different AI components
  let overallScore = 0;
  let components = 0;

  if (this.aiAnalysis.imageClassification?.averageConfidence) {
    overallScore += this.aiAnalysis.imageClassification.averageConfidence;
    components++;
  }

  if (this.aiAnalysis.satelliteValidation?.ndviAnalysis?.changeDetected) {
    overallScore += 0.8; // High confidence for satellite validation
    components++;
  }

  if (this.aiAnalysis.anomalyDetection?.score) {
    overallScore += 1 - this.aiAnalysis.anomalyDetection.score; // Invert anomaly score
    components++;
  }

  this.aiAnalysis.overallScore = components > 0 ? overallScore / components : 0;

  return this.save();
};

// Method to calculate priority score
reportSchema.methods.calculatePriority = function () {
  let priority = 5; // Base priority

  // Severity adjustment
  const severityMultiplier = {
    low: 0.8,
    medium: 1.0,
    high: 1.3,
    critical: 1.6,
  };
  priority *= severityMultiplier[this.severity] || 1.0;

  // AI confidence adjustment
  if (this.aiAnalysis?.overallScore) {
    priority *= 0.5 + this.aiAnalysis.overallScore;
  }

  // Urgency adjustment
  if (this.isUrgent) {
    priority *= 1.5;
  }

  // Location-based adjustment (can be enhanced with protected area data)
  // For now, just ensure it's within reasonable bounds
  this.priority = Math.min(Math.max(Math.round(priority), 1), 10);

  return this.save();
};

// Static method to get reports by location
reportSchema.statics.getReportsByLocation = function (
  longitude,
  latitude,
  radiusInKm = 10
) {
  return this.find({
    "location.coordinates": {
      $geoWithin: {
        $centerSphere: [[longitude, latitude], radiusInKm / 6378.1], // Earth radius in km
      },
    },
  });
};

// Static method to get recent reports
reportSchema.statics.getRecentReports = function (days = 7, limit = 50) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return this.find({ createdAt: { $gte: since } })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("reporter", "username fullName")
    .populate("validation.humanReviewer", "username fullName");
};

// Static method to get dashboard statistics
reportSchema.statics.getDashboardStats = function () {
  return this.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
  ]);
};

const Report = mongoose.model("Report", reportSchema);

export default Report;
