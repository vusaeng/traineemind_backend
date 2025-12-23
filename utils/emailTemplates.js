// Utility functions for HTML email templates

export function resetPasswordTemplate(resetUrl) {
  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="UTF-8" />
      <title>Password Reset</title>
    </head>
    <body style="font-family: Arial, sans-serif; background-color: #f9fafb; padding: 40px;">
      <table width="100%" style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
        <tr>
          <td style="background: #1e3a8a; padding: 20px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0;">TraineeMind</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 30px;">
            <h2 style="color: #111827;">Reset Your Password</h2>
            <p style="color: #374151; font-size: 16px;">
              You requested to reset your password. Click the button below to set a new one:
            </p>
            <p style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: #1e3a8a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                Reset Password
              </a>
            </p>
            <p style="color: #6b7280; font-size: 14px;">
              If you didn’t request this, you can safely ignore this email.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
            &copy; ${new Date().getFullYear()} TraineeMind. All rights reserved.
          </td>
        </tr>
      </table>
    </body>
  </html>
  `;
}

// Welcome Email Template
export function welcomeTemplate(name) {
  return `
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; background-color: #f9fafb; padding: 40px;">
        <table width="100%" style="max-width: 600px; margin: auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          <tr>
            <td style="background: #1e3a8a; padding: 20px; text-align: center; color: #ffffff;">
              <h1 style="margin: 0;">Welcome to TraineeMind</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px;">
              <h2 style="color: #111827;">Hi ${name},</h2>
              <p style="color: #374151; font-size: 16px;">
                We’re excited to have you join our community of learners and engineers. 
                Explore tutorials, articles, and projects designed to help you master electronics step by step.
              </p>
              <p style="text-align: center; margin: 30px 0;">
                <a href="${process.env.FRONTEND_URL}/login" style="background: #1e3a8a; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                  Start Learning
                </a>
              </p>
              <p style="color: #6b7280; font-size: 14px;">
                Need help? Visit our support page or reply to this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background: #f3f4f6; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
              &copy; ${new Date().getFullYear()} TraineeMind. All rights reserved.
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

// utils/emailTemplates.js

export const passwordResetEmailTemplate = (email, newPassword) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4f46e5; color: white; padding: 20px; text-align: center; }
        .content { background: #f9fafb; padding: 30px; border-radius: 8px; margin: 20px 0; }
        .password-box { 
            background: #fff; 
            border: 2px dashed #4f46e5; 
            padding: 15px; 
            text-align: center; 
            font-size: 20px; 
            font-weight: bold; 
            margin: 20px 0;
            font-family: monospace;
        }
        .warning { color: #dc2626; background: #fee2e2; padding: 10px; border-radius: 4px; margin: 15px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Password Reset Request</h1>
        </div>
        
        <div class="content">
            <p>Hello,</p>
            
            <p>Your password has been reset by an administrator. Here is your new temporary password:</p>
            
            <div class="password-box">
                ${newPassword}
            </div>
            
            <div class="warning">
                ⚠️ <strong>Important:</strong> Please change this password immediately after logging in.
            </div>
            
            <p>To log in:</p>
            <ol>
                <li>Go to ${process.env.FRONTEND_URL}/login</li>
                <li>Enter your email: <strong>${email}</strong></li>
                <li>Use the temporary password above</li>
                <li>You will be prompted to set a new password</li>
            </ol>
            
            <p>If you didn't request this password reset, please contact our support team immediately.</p>
            
            <p>Best regards,<br>The Admin Team</p>
        </div>
        
        <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>© ${new Date().getFullYear()} Your Company. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`;

export const passwordResetLinkEmailTemplate = (email, resetUrl) => `
<!DOCTYPE html>
<html>
<head>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4f46e5; color: white; padding: 20px; text-align: center; }
        .content { background: #f9fafb; padding: 30px; border-radius: 8px; margin: 20px 0; }
        .button { 
            display: inline-block; 
            background: #4f46e5; 
            color: white; 
            padding: 12px 30px; 
            text-decoration: none; 
            border-radius: 5px; 
            font-weight: bold; 
            margin: 20px 0;
        }
        .warning { color: #dc2626; background: #fee2e2; padding: 10px; border-radius: 4px; margin: 15px 0; }
        .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }
        .link { word-break: break-all; color: #2563eb; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Password Reset Request</h1>
        </div>
        
        <div class="content">
            <p>Hello,</p>
            
            <p>An administrator has requested a password reset for your account. Click the button below to set a new password:</p>
            
            <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Your Password</a>
            </div>
            
            <p>Or copy and paste this link in your browser:</p>
            <p class="link">${resetUrl}</p>
            
            <div class="warning">
                ⚠️ <strong>Important:</strong> This link will expire in 1 hour. If you don't reset your password within this time, you'll need to request a new reset link.
            </div>
            
            <p>If you didn't request this password reset, please ignore this email or contact our support team.</p>
            
            <p>Best regards,<br>The Admin Team</p>
        </div>
        
        <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>© ${new Date().getFullYear()} Your Company. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`;
