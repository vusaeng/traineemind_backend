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
