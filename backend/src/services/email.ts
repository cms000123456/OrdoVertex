import nodemailer from 'nodemailer';
import { getEmailSettings } from '../routes/system';
import logger from '../utils/logger';
import { getErrorMessage } from '../utils/error-helper';

/**
 * Email Service for OrdoVertex
 *
 * Handles sending emails for:
 * - Email verification
 * - Password reset
 * - Test emails
 * - Alert notifications
 */

/** Escape HTML special characters to prevent email HTML injection */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Transporter cache
let transporter: nodemailer.Transporter | null = null;
let lastSettingsHash: string = '';

/**
 * Get or create nodemailer transporter
 */
function getTransporter(): nodemailer.Transporter | null {
  const settings = getEmailSettings();
  
  if (!settings.enabled || !settings.smtpHost || !settings.smtpUser) {
    return null;
  }

  // Create a hash of current settings to detect changes
  const settingsHash = `${settings.smtpHost}:${settings.smtpPort}:${settings.smtpUser}:${settings.smtpPassword}:${settings.smtpSecure}`;
  
  // Return cached transporter if settings haven't changed
  if (transporter && lastSettingsHash === settingsHash) {
    return transporter;
  }

  // Create new transporter
  transporter = nodemailer.createTransport({
    host: settings.smtpHost,
    port: settings.smtpPort,
    secure: settings.smtpSecure, // true for 465, false for other ports
    auth: {
      user: settings.smtpUser,
      pass: settings.smtpPassword,
    },
    tls: {
      // Do not fail on invalid certs
      rejectUnauthorized: false,
    },
  });

  lastSettingsHash = settingsHash;
  return transporter;
}

/**
 * Verify email configuration
 */
export async function verifyEmailConfig(): Promise<{ valid: boolean; error?: string }> {
  const transport = getTransporter();
  
  if (!transport) {
    return { valid: false, error: 'Email is not configured or disabled' };
  }

  try {
    await transport.verify();
    return { valid: true };
  } catch (error: unknown) {
    return { valid: false, error: getErrorMessage(error) };
  }
}

/**
 * Send a test email
 */
export async function sendTestEmail(to: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const settings = getEmailSettings();
  
  if (!settings.enabled) {
    return { success: false, error: 'Email is not enabled' };
  }

  const transport = getTransporter();
  if (!transport) {
    return { success: false, error: 'Email is not properly configured' };
  }

  try {
    const info = await transport.sendMail({
      from: `"${settings.fromName}" <${settings.fromEmail || settings.smtpUser}>`,
      to,
      subject: 'OrdoVertex - Test Email',
      text: `This is a test email from your OrdoVertex instance.

If you received this email, your SMTP configuration is working correctly!

Configuration used:
- SMTP Host: ${settings.smtpHost}
- SMTP Port: ${settings.smtpPort}
- From: ${settings.fromName} <${settings.fromEmail || settings.smtpUser}>

Time: ${new Date().toISOString()}
`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 20px; border-radius: 0 0 8px 8px; }
    .success { color: #059669; font-weight: bold; }
    .footer { margin-top: 20px; font-size: 12px; color: #6b7280; }
    code { background: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-family: monospace; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✉️ Test Email</h1>
    </div>
    <div class="content">
      <p class="success">✅ Your OrdoVertex email configuration is working!</p>
      
      <p>This is a test email from your OrdoVertex instance.</p>
      
      <h3>Configuration Used:</h3>
      <ul>
        <li><strong>SMTP Host:</strong> <code>${settings.smtpHost}</code></li>
        <li><strong>SMTP Port:</strong> <code>${settings.smtpPort}</code></li>
        <li><strong>From:</strong> ${settings.fromName} &lt;${settings.fromEmail || settings.smtpUser}&gt;</li>
      </ul>
      
      <p>You can now use email features like:</p>
      <ul>
        <li>Email verification for new users</li>
        <li>Password reset emails</li>
        <li>Workflow alerts and notifications</li>
      </ul>
      
      <div class="footer">
        <p>Sent at: ${new Date().toLocaleString()}</p>
        <p>OrdoVertex - Workflow Automation Platform</p>
      </div>
    </div>
  </div>
</body>
</html>
      `,
    });

    logger.info(`[Email] Test email sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error: unknown) {
    logger.error('[Email] Failed to send test email:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail(
  to: string,
  name: string,
  verificationToken: string,
  baseUrl: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const settings = getEmailSettings();
  
  if (!settings.enabled) {
    return { success: false, error: 'Email is not enabled' };
  }

  const transport = getTransporter();
  if (!transport) {
    return { success: false, error: 'Email is not properly configured' };
  }

  const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`;

  try {
    const info = await transport.sendMail({
      from: `"${settings.fromName}" <${settings.fromEmail || settings.smtpUser}>`,
      to,
      subject: 'Verify your email - OrdoVertex',
      text: `Hello ${name},

Thank you for signing up for OrdoVertex!

Please verify your email address by clicking the link below:
${verificationUrl}

This link will expire in 24 hours.

If you didn't create an account, you can safely ignore this email.

Best regards,
The OrdoVertex Team
`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #4f46e5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { margin-top: 30px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px; }
    .link { color: #4f46e5; word-break: break-all; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 Welcome to OrdoVertex!</h1>
    </div>
    <div class="content">
      <p>Hello <strong>${escapeHtml(name)}</strong>,</p>

      <p>Thank you for signing up! Please verify your email address to activate your account.</p>

      <div style="text-align: center;">
        <a href="${verificationUrl}" class="button">Verify Email Address</a>
      </div>
      
      <p>Or copy and paste this link into your browser:</p>
      <p class="link">${verificationUrl}</p>
      
      <p><small>This link will expire in 24 hours.</small></p>
      
      <div class="footer">
        <p>If you didn't create an account, you can safely ignore this email.</p>
        <p>OrdoVertex - Workflow Automation Platform</p>
      </div>
    </div>
  </div>
</body>
</html>
      `,
    });

    logger.info(`[Email] Verification email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error: unknown) {
    logger.error('[Email] Failed to send verification email:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetToken: string,
  baseUrl: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const settings = getEmailSettings();
  
  if (!settings.enabled) {
    return { success: false, error: 'Email is not enabled' };
  }

  const transport = getTransporter();
  if (!transport) {
    return { success: false, error: 'Email is not properly configured' };
  }

  const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;

  try {
    const info = await transport.sendMail({
      from: `"${settings.fromName}" <${settings.fromEmail || settings.smtpUser}>`,
      to,
      subject: 'Password Reset - OrdoVertex',
      text: `Hello ${name},

We received a request to reset your OrdoVertex password.

Click the link below to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.

Best regards,
The OrdoVertex Team
`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { margin-top: 30px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px; }
    .warning { color: #dc2626; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔐 Password Reset Request</h1>
    </div>
    <div class="content">
      <p>Hello <strong>${escapeHtml(name)}</strong>,</p>

      <p>We received a request to reset your OrdoVertex password.</p>
      
      <div style="text-align: center;">
        <a href="${resetUrl}" class="button">Reset Password</a>
      </div>
      
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #4f46e5;">${resetUrl}</p>
      
      <p><small>This link will expire in 1 hour.</small></p>
      
      <p class="warning">If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
      
      <div class="footer">
        <p>OrdoVertex - Workflow Automation Platform</p>
      </div>
    </div>
  </div>
</body>
</html>
      `,
    });

    logger.info(`[Email] Password reset email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error: unknown) {
    logger.error('[Email] Failed to send password reset email:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

/**
 * Send workflow alert email
 */
export async function sendAlertEmail(
  to: string,
  alertName: string,
  workflowName: string,
  executionStatus: string,
  executionId: string,
  errorMessage?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const settings = getEmailSettings();
  
  if (!settings.enabled) {
    return { success: false, error: 'Email is not enabled' };
  }

  const transport = getTransporter();
  if (!transport) {
    return { success: false, error: 'Email is not properly configured' };
  }

  const isError = executionStatus === 'failed';
  const statusEmoji = isError ? '❌' : '✅';
  const statusColor = isError ? '#dc2626' : '#059669';

  try {
    const info = await transport.sendMail({
      from: `"${settings.fromName}" <${settings.fromEmail || settings.smtpUser}>`,
      to,
      subject: `${statusEmoji} Workflow Alert: ${alertName}`,
      text: `Workflow Alert: ${alertName}

Workflow: ${workflowName}
Status: ${executionStatus.toUpperCase()}
Execution ID: ${executionId}
Time: ${new Date().toLocaleString()}

${errorMessage ? `Error: ${errorMessage}` : ''}

View execution details in OrdoVertex.
`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${statusColor}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .status { font-size: 24px; font-weight: bold; color: ${statusColor}; }
    .detail { margin: 10px 0; }
    .detail-label { font-weight: bold; color: #6b7280; }
    .error { background: #fee2e2; color: #dc2626; padding: 15px; border-radius: 6px; margin: 15px 0; }
    .footer { margin-top: 30px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${statusEmoji} Workflow Alert</h1>
      <p>${escapeHtml(alertName)}</p>
    </div>
    <div class="content">
      <div class="status">${executionStatus.toUpperCase()}</div>

      <div class="detail">
        <span class="detail-label">Workflow:</span> ${escapeHtml(workflowName)}
      </div>

      <div class="detail">
        <span class="detail-label">Execution ID:</span> ${escapeHtml(executionId)}
      </div>

      <div class="detail">
        <span class="detail-label">Time:</span> ${new Date().toLocaleString()}
      </div>

      ${errorMessage ? `<div class="error"><strong>Error:</strong> ${escapeHtml(errorMessage)}</div>` : ''}

      <div class="footer">
        <p>This is an automated alert from OrdoVertex.</p>
        <p>View execution details in your OrdoVertex dashboard.</p>
      </div>
    </div>
  </div>
</body>
</html>
      `,
    });

    logger.info(`[Email] Alert email sent to ${to}: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error: unknown) {
    logger.error('[Email] Failed to send alert email:', error);
    return { success: false, error: getErrorMessage(error) };
  }
}

/**
 * Clear transporter cache (call when settings change)
 */
export function clearEmailTransporter(): void {
  transporter = null;
  lastSettingsHash = '';
  logger.info('[Email] Transporter cache cleared');
}
