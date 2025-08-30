import nodemailer from "nodemailer";
import dotenv from "dotenv";
// import logger from "../utils/logger.js";

// Load environment variables
dotenv.config();

class EmailService {
  constructor() {
    this.transporter = null;
    this.setupTransporter();
  }

  setupTransporter() {
    try {
      // Check if credentials are available
      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
        console.warn(
          "Email credentials not found. Email service will be disabled."
        );
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST || "smtp.gmail.com",
        port: parseInt(process.env.EMAIL_PORT) || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      // Verify connection configuration
      this.transporter.verify((error, success) => {
        if (error) {
          console.error("Email service configuration error:", error);
        } else {
          console.log("Email service is ready to send messages");
        }
      });
    } catch (error) {
      console.error("Failed to setup email transporter:", error);
    }
  }

  async sendEmail({ to, subject, text, html, attachments = [] }) {
    try {
      if (!this.transporter) {
        throw new Error("Email transporter not configured");
      }

      const mailOptions = {
        from: {
          name: "Mangrove Monitoring System",
          address: process.env.EMAIL_USER,
        },
        to,
        subject,
        text,
        html,
        attachments,
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log(`Email sent successfully to ${to}: ${result.messageId}`);
      return result;
    } catch (error) {
      console.error(`Failed to send email to ${to}:`, error);
      throw error;
    }
  }

  async sendWelcomeEmail(user) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center;">
          <h1>Welcome to Mangrove Monitoring System!</h1>
        </div>
        
        <div style="padding: 20px;">
          <h2>Hello ${user.fullName},</h2>
          
          <p>Thank you for joining our community of environmental protectors! Your participation helps us safeguard precious mangrove ecosystems around the world.</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>🌱 Get Started</h3>
            <ul>
              <li>Complete your profile to earn your first points</li>
              <li>Submit your first report when you spot environmental threats</li>
              <li>Engage with the community through comments and votes</li>
              <li>Track your progress on the leaderboard</li>
            </ul>
          </div>
          
          <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>🏆 Gamification Features</h3>
            <p>Earn points and badges by:</p>
            <ul>
              <li>Submitting accurate reports (+10 points)</li>
              <li>Having reports validated (+50 points)</li>
              <li>Maintaining reporting streaks (bonus points)</li>
              <li>Contributing to community discussions</li>
            </ul>
          </div>
          
          <p>Together, we can make a difference in protecting our mangrove forests!</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}" 
               style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              Start Exploring
            </a>
          </div>
        </div>
        
        <div style="background-color: #f0f0f0; padding: 15px; text-align: center; font-size: 12px;">
          <p>Best regards,<br>The Mangrove Monitoring Team</p>
          <p>If you have any questions, reply to this email or contact our support team.</p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: user.email,
      subject: "🌱 Welcome to Mangrove Monitoring System!",
      html,
    });
  }

  async sendReportValidationEmail(user, report, isApproved) {
    const status = isApproved ? "approved" : "rejected";
    const statusColor = isApproved ? "#4CAF50" : "#f44336";
    const statusEmoji = isApproved ? "✅" : "❌";

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: ${statusColor}; color: white; padding: 20px; text-align: center;">
          <h1>${statusEmoji} Report ${
      status.charAt(0).toUpperCase() + status.slice(1)
    }</h1>
        </div>
        
        <div style="padding: 20px;">
          <h2>Hello ${user.fullName},</h2>
          
          <p>Your report "<strong>${
            report.title
          }</strong>" has been ${status} by our validation team.</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Report Details</h3>
            <p><strong>Incident Type:</strong> ${report.incidentType}</p>
            <p><strong>Severity:</strong> ${report.severity}</p>
            <p><strong>Submitted:</strong> ${new Date(
              report.createdAt
            ).toLocaleDateString()}</p>
          </div>
          
          ${
            isApproved
              ? `
            <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3>🎉 Congratulations!</h3>
              <p>You've earned <strong>50 points</strong> for this validated report. Keep up the great work protecting our mangrove forests!</p>
            </div>
          `
              : `
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3>📝 Feedback</h3>
              <p>While this report wasn't approved, every submission helps us learn. Please review our guidelines and continue reporting environmental threats.</p>
              ${
                report.workflow.rejectionReason
                  ? `<p><strong>Reason:</strong> ${report.workflow.rejectionReason}</p>`
                  : ""
              }
            </div>
          `
          }
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/reports/${report._id}" 
               style="background-color: ${statusColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View Report
            </a>
          </div>
        </div>
        
        <div style="background-color: #f0f0f0; padding: 15px; text-align: center; font-size: 12px;">
          <p>Best regards,<br>The Mangrove Monitoring Team</p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: user.email,
      subject: `${statusEmoji} Your report has been ${status}`,
      html,
    });
  }

  async sendActionTakenEmail(user, report, action) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #2196F3; color: white; padding: 20px; text-align: center;">
          <h1>🚀 Action Taken on Your Report</h1>
        </div>
        
        <div style="padding: 20px;">
          <h2>Hello ${user.fullName},</h2>
          
          <p>Great news! Authorities have taken action on your report "<strong>${
            report.title
          }</strong>".</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Action Details</h3>
            <p><strong>Action Type:</strong> ${action.actionType}</p>
            <p><strong>Description:</strong> ${action.actionDescription}</p>
            <p><strong>Date:</strong> ${new Date(
              action.actionDate
            ).toLocaleDateString()}</p>
          </div>
          
          <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>🎯 Impact</h3>
            <p>Your vigilance has made a real difference! You've earned an additional <strong>25 points</strong> for this impactful report.</p>
          </div>
          
          <p>Thank you for being an active guardian of our mangrove ecosystems. Your contribution helps preserve these vital habitats for future generations.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/reports/${report._id}" 
               style="background-color: #2196F3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View Report & Action
            </a>
          </div>
        </div>
        
        <div style="background-color: #f0f0f0; padding: 15px; text-align: center; font-size: 12px;">
          <p>Best regards,<br>The Mangrove Monitoring Team</p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: user.email,
      subject: "🚀 Action taken on your report!",
      html,
    });
  }

  async sendWeeklyDigest(user, reports, stats) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #4CAF50; color: white; padding: 20px; text-align: center;">
          <h1>📊 Your Weekly Digest</h1>
        </div>
        
        <div style="padding: 20px;">
          <h2>Hello ${user.fullName},</h2>
          
          <p>Here's your weekly summary of activities in the Mangrove Monitoring System:</p>
          
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>📈 Your Stats This Week</h3>
            <ul>
              <li><strong>Reports Submitted:</strong> ${
                stats.reportsSubmitted
              }</li>
              <li><strong>Points Earned:</strong> ${stats.pointsEarned}</li>
              <li><strong>Current Streak:</strong> ${
                user.gamification.streak.current
              } days</li>
              <li><strong>Leaderboard Position:</strong> #${
                stats.leaderboardPosition
              }</li>
            </ul>
          </div>
          
          ${
            reports.length > 0
              ? `
            <div style="background-color: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3>📋 Your Recent Reports</h3>
              ${reports
                .map(
                  (report) => `
                <div style="border-left: 3px solid #4CAF50; padding-left: 10px; margin: 10px 0;">
                  <strong>${report.title}</strong><br>
                  <small>Status: ${report.status} | ${new Date(
                    report.createdAt
                  ).toLocaleDateString()}</small>
                </div>
              `
                )
                .join("")}
            </div>
          `
              : ""
          }
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>🌍 Community Impact</h3>
            <p>This week, our community:</p>
            <ul>
              <li>Submitted ${stats.communityReports} new reports</li>
              <li>Validated ${stats.validatedReports} incidents</li>
              <li>Resulted in ${stats.actionsTaken} conservation actions</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL}/dashboard" 
               style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
              View Dashboard
            </a>
          </div>
        </div>
        
        <div style="background-color: #f0f0f0; padding: 15px; text-align: center; font-size: 12px;">
          <p>Best regards,<br>The Mangrove Monitoring Team</p>
          <p><a href="${
            process.env.FRONTEND_URL
          }/unsubscribe">Unsubscribe</a> from weekly digests</p>
        </div>
      </div>
    `;

    return this.sendEmail({
      to: user.email,
      subject: "📊 Your Weekly Mangrove Monitoring Digest",
      html,
    });
  }
}

// Create singleton instance
const emailService = new EmailService();

export default emailService;
