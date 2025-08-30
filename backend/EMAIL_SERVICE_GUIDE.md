# 📧 Email Service Integration Guide

## 🎯 Email Service Configuration

Your email service is now **fully integrated** into the mangrove monitoring system! Here's where and how emails are used:

### 📝 Environment Configuration (.env)

```bash
# Email Service Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=0mittulmovaliya@gmail.com
EMAIL_PASS=wviz fdbk zhry pcte
FRONTEND_URL=http://localhost:3000
```

## 🚀 Email Triggers & Locations

### 1. **Welcome Email** 📨

- **Trigger**: New user registration
- **Location**: `src/controllers/authController.js` → `register()` function
- **Template**: Professional welcome with getting started guide

```javascript
// Automatically sent when user registers
await emailService.sendWelcomeEmail(user);
```

### 2. **Report Validation Emails** ✅❌

- **Trigger**: Authority approves/rejects report
- **Location**: `src/controllers/reportController.js` → `validateReport()` function
- **Templates**:
  - Approval email (with 50 points reward)
  - Rejection email (with feedback)

```javascript
// Sent when report is approved
await emailService.sendReportValidationEmail(reporter, report, true);

// Sent when report is rejected
await emailService.sendReportValidationEmail(reporter, report, false);
```

### 3. **Action Taken Email** 🚀

- **Trigger**: Authority takes action on approved report
- **Location**: `src/controllers/reportController.js` → `takeAction()` function
- **Template**: Action details with 25 bonus points

```javascript
// Sent when action is taken on report
await emailService.sendActionTakenEmail(reporter, report, actionDetails);
```

### 4. **Weekly Digest Email** 📊

- **Trigger**: Admin-triggered or scheduled
- **Location**: `src/routes/email.js` → `/weekly-digest` endpoint
- **Template**: Personal stats, recent reports, community impact

## 🔧 Email Testing & Management

### Test Email Service

```bash
# Test all email types
POST /api/email/test
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "emailType": "welcome",           // welcome, report_approved, report_rejected, action_taken, weekly_digest
  "recipientEmail": "test@example.com"  // Optional, defaults to your email
}
```

### Check Email Service Status

```bash
# Get email configuration status
GET /api/email/status
Authorization: Bearer <admin-token>
```

### Send Weekly Digest

```bash
# Send to all users who opted in
POST /api/email/weekly-digest
Authorization: Bearer <admin-token>
```

## 📧 Email Templates Overview

### 1. Welcome Email Features:

- ✅ Professional branding
- ✅ Getting started guide
- ✅ Gamification explanation
- ✅ Point system overview
- ✅ Call-to-action button

### 2. Report Validation Features:

- ✅ Approval/rejection status
- ✅ Points earned notification
- ✅ Report details summary
- ✅ Feedback for rejections
- ✅ Direct link to report

### 3. Action Taken Features:

- ✅ Action type and description
- ✅ Impact acknowledgment
- ✅ Bonus points notification
- ✅ Community contribution message

### 4. Weekly Digest Features:

- ✅ Personal statistics
- ✅ Recent reports summary
- ✅ Leaderboard position
- ✅ Community impact metrics
- ✅ Unsubscribe option

## 🎨 Email Design Features

All emails include:

- **Responsive HTML design**
- **Mangrove green branding (#4CAF50)**
- **Professional typography**
- **Clear call-to-action buttons**
- **Mobile-friendly layout**
- **Personalized content**

## 🔍 Real-World Usage Examples

### 1. User Journey with Emails:

```javascript
// 1. User registers → Welcome email sent
const newUser = await User.create(userData);
await emailService.sendWelcomeEmail(newUser);

// 2. User submits report → No email (just confirmation)
const report = await Report.create(reportData);

// 3. Authority approves report → Approval email sent
await report.updateStatus("approved");
await emailService.sendReportValidationEmail(reporter, report, true);

// 4. Authority takes action → Action email sent
await report.updateStatus("action_taken");
await emailService.sendActionTakenEmail(reporter, report, actionDetails);

// 5. Weekly → Digest email sent to all users
await emailService.sendWeeklyDigest(user, weeklyReports, stats);
```

### 2. Frontend Integration:

```javascript
// Test email functionality from admin panel
const testEmail = async () => {
  const response = await api.post("/email/test", {
    emailType: "welcome",
    recipientEmail: "admin@example.com",
  });

  if (response.data.success) {
    showNotification("Test email sent successfully!");
  }
};

// Check email service status
const checkEmailStatus = async () => {
  const response = await api.get("/email/status");
  setEmailStatus(response.data.status);
};
```

## 📋 Email Service Troubleshooting

### Common Issues:

1. **Gmail App Password Setup**:

   ```bash
   # Use app-specific password, not your regular Gmail password
   EMAIL_PASS=your-16-digit-app-password
   ```

2. **Email Delivery Failures**:

   ```javascript
   // All email functions include error handling
   try {
     await emailService.sendWelcomeEmail(user);
   } catch (emailError) {
     console.error("Email failed, but registration continues");
     // Registration/validation still succeeds
   }
   ```

3. **Testing Email Templates**:
   ```bash
   # Use the test endpoint to verify templates
   curl -X POST http://localhost:5000/api/email/test \
     -H "Authorization: Bearer your-admin-token" \
     -H "Content-Type: application/json" \
     -d '{"emailType": "welcome", "recipientEmail": "test@example.com"}'
   ```

## 🎯 Production Deployment

### Security Checklist:

- ✅ Use app-specific password for Gmail
- ✅ Store credentials in environment variables
- ✅ Enable 2FA on email account
- ✅ Monitor email delivery rates
- ✅ Set up email bounce handling

### Scaling Considerations:

- **Free Gmail limit**: 500 emails/day
- **Upgrade options**: SendGrid, Mailgun, AWS SES
- **Queue system**: Add Redis for large volumes
- **Monitoring**: Track delivery rates and bounces

## 🚀 Next Steps

Your email service is ready for:

1. **User Registration** → Welcome emails
2. **Report Validation** → Approval/rejection notifications
3. **Action Taken** → Impact notifications
4. **Weekly Engagement** → Digest emails
5. **Admin Management** → Testing and monitoring

All email functionality is **non-blocking** - if emails fail, the core operations (registration, validation, etc.) continue successfully! 📧✨
