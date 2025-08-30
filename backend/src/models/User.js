import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ["community", "authority", "ngo", "admin"],
      default: "community",
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
      },
      address: String,
      city: String,
      state: String,
      country: String,
    },
    gamification: {
      points: {
        type: Number,
        default: 0,
      },
      level: {
        type: Number,
        default: 1,
      },
      badges: [
        {
          name: String,
          description: String,
          earnedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
      streak: {
        current: {
          type: Number,
          default: 0,
        },
        longest: {
          type: Number,
          default: 0,
        },
        lastReportDate: Date,
      },
    },
    statistics: {
      reportsSubmitted: {
        type: Number,
        default: 0,
      },
      reportsValidated: {
        type: Number,
        default: 0,
      },
      reportsRejected: {
        type: Number,
        default: 0,
      },
      validationAccuracy: {
        type: Number,
        default: 0,
      },
    },
    preferences: {
      notifications: {
        email: {
          type: Boolean,
          default: true,
        },
        push: {
          type: Boolean,
          default: true,
        },
      },
      language: {
        type: String,
        default: "en",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: Date,
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: Date,
  },
  {
    timestamps: true,
  }
);

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ "location.coordinates": "2dsphere" });
userSchema.index({ "gamification.points": -1 });

// Virtual for account locked
userSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to increment login attempts
userSchema.methods.incLoginAttempts = function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }

  return this.updateOne(updates);
};

// Method to add points and update level
userSchema.methods.addPoints = function (points) {
  this.gamification.points += points;

  // Level calculation (every 100 points = 1 level)
  const newLevel = Math.floor(this.gamification.points / 100) + 1;
  if (newLevel > this.gamification.level) {
    this.gamification.level = newLevel;
  }

  return this.save();
};

// Method to update streak
userSchema.methods.updateStreak = function () {
  const today = new Date();
  const lastReport = this.gamification.streak.lastReportDate;

  if (!lastReport) {
    this.gamification.streak.current = 1;
    this.gamification.streak.lastReportDate = today;
  } else {
    const daysDiff = Math.floor((today - lastReport) / (1000 * 60 * 60 * 24));

    if (daysDiff === 1) {
      // Consecutive day
      this.gamification.streak.current += 1;
      if (this.gamification.streak.current > this.gamification.streak.longest) {
        this.gamification.streak.longest = this.gamification.streak.current;
      }
    } else if (daysDiff > 1) {
      // Streak broken
      this.gamification.streak.current = 1;
    }
    // Same day - no change

    this.gamification.streak.lastReportDate = today;
  }

  return this.save();
};

// Static method to get leaderboard
userSchema.statics.getLeaderboard = function (limit = 10, offset = 0) {
  return this.find({ isActive: true })
    .select(
      "username fullName gamification.points gamification.level statistics"
    )
    .sort({ "gamification.points": -1 })
    .skip(offset)
    .limit(limit);
};

const User = mongoose.model("User", userSchema);

export default User;
