const { getTransporter } = require('../config/email');
const logger = require('../utils/logger');

const PLATFORM_NAME = process.env.PLATFORM_NAME || 'AnyMentor';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const EMAIL_FROM = process.env.EMAIL_FROM || `${PLATFORM_NAME} <noreply@anymentor.com>`;

const baseTemplate = (content, title) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&display=swap');
    body { margin: 0; padding: 0; font-family: 'Rajdhani', sans-serif; background-color: #f5f0e8; }
    .wrapper { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #1a3c6e, #800020); padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { color: #d4a017; font-size: 28px; margin: 0; letter-spacing: 2px; }
    .body { background: white; padding: 40px; border-left: 1px solid #e0d8cc; border-right: 1px solid #e0d8cc; }
    .footer { background: #1a3c6e; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; }
    .footer p { color: #f5f0e8; font-size: 12px; margin: 0; }
    .btn { display: inline-block; background: #d4a017; color: white; padding: 14px 32px; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 16px; margin: 20px 0; letter-spacing: 1px; }
    .btn:hover { background: #b8891a; }
    h2 { color: #1a3c6e; }
    p { color: #333; line-height: 1.6; }
    .highlight { background: #f5f0e8; padding: 15px; border-left: 4px solid #d4a017; margin: 20px 0; border-radius: 0 4px 4px 0; }
    .code { font-size: 24px; letter-spacing: 6px; color: #1a3c6e; font-weight: bold; text-align: center; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>${PLATFORM_NAME}</h1>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${PLATFORM_NAME}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
`;

const sendEmail = async ({ to, subject, html }) => {
  const transporter = getTransporter();
  await transporter.sendMail({ from: EMAIL_FROM, to, subject, html });
  logger.info(`Email sent to ${to}: ${subject}`);
};

const sendVerificationEmail = async (user, token) => {
  const verifyUrl = `${FRONTEND_URL}/auth/verify-email/${token}`;

  const content = `
    <h2>Welcome to ${PLATFORM_NAME}, ${user.firstName}!</h2>
    <p>Thank you for registering. Please verify your email address to activate your account.</p>
    <div style="text-align: center;">
      <a href="${verifyUrl}" class="btn">Verify Email Address</a>
    </div>
    <div class="highlight">
      <p style="margin:0; font-size: 13px;">If the button doesn't work, copy and paste this link:</p>
      <p style="margin:5px 0 0; word-break: break-all; font-size: 12px; color: #1a3c6e;">${verifyUrl}</p>
    </div>
    <p><strong>This link expires in 24 hours.</strong></p>
  `;

  await sendEmail({
    to: user.email,
    subject: `Verify your email - ${PLATFORM_NAME}`,
    html: baseTemplate(content, 'Verify Email'),
  });
};

const sendPasswordResetEmail = async (user, token) => {
  const resetUrl = `${FRONTEND_URL}/auth/reset-password/${token}`;

  const content = `
    <h2>Password Reset Request</h2>
    <p>Hello ${user.firstName},</p>
    <p>We received a request to reset your password. Click the button below to create a new password.</p>
    <div style="text-align: center;">
      <a href="${resetUrl}" class="btn">Reset Password</a>
    </div>
    <div class="highlight">
      <p style="margin:0; font-size: 13px;">If the button doesn't work, copy and paste this link:</p>
      <p style="margin:5px 0 0; word-break: break-all; font-size: 12px; color: #1a3c6e;">${resetUrl}</p>
    </div>
    <p><strong>This link expires in 1 hour.</strong></p>
    <p>If you didn't request a password reset, you can safely ignore this email.</p>
  `;

  await sendEmail({
    to: user.email,
    subject: `Reset your password - ${PLATFORM_NAME}`,
    html: baseTemplate(content, 'Reset Password'),
  });
};

const sendWelcomeEmail = async (user, company) => {
  const content = `
    <h2>Welcome to ${company?.name || PLATFORM_NAME}!</h2>
    <p>Hello ${user.firstName},</p>
    <p>Your account has been created successfully. You now have access to all the features of ${company?.name || PLATFORM_NAME}.</p>
    <div style="text-align: center;">
      <a href="${FRONTEND_URL}/dashboard" class="btn">Go to Dashboard</a>
    </div>
  `;

  await sendEmail({
    to: user.email,
    subject: `Welcome to ${company?.name || PLATFORM_NAME}!`,
    html: baseTemplate(content, 'Welcome'),
  });
};

const sendOrderConfirmationEmail = async (user, order) => {
  const itemsHtml = order.items.map(item =>
    `<tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₹${item.price.toFixed(2)}</td>
    </tr>`
  ).join('');

  const content = `
    <h2>Order Confirmed!</h2>
    <p>Hello ${user.firstName},</p>
    <p>Your order <strong>#${order.orderNumber}</strong> has been confirmed.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <thead>
        <tr style="background: #f5f0e8;">
          <th style="padding: 10px; text-align: left;">Item</th>
          <th style="padding: 10px; text-align: center;">Qty</th>
          <th style="padding: 10px; text-align: right;">Price</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
      <tfoot>
        <tr>
          <td colspan="2" style="padding: 10px; text-align: right; font-weight: bold;">Total:</td>
          <td style="padding: 10px; text-align: right; font-weight: bold; color: #1a3c6e;">₹${order.total.toFixed(2)}</td>
        </tr>
      </tfoot>
    </table>
    <div style="text-align: center;">
      <a href="${FRONTEND_URL}/orders/${order.id}" class="btn">View Order</a>
    </div>
  `;

  await sendEmail({
    to: user.email,
    subject: `Order Confirmed - #${order.orderNumber}`,
    html: baseTemplate(content, 'Order Confirmation'),
  });
};

const sendTicketReplyEmail = async (user, ticket, message) => {
  const content = `
    <h2>New Reply on Your Support Ticket</h2>
    <p>Hello ${user.firstName},</p>
    <p>You have a new reply on ticket <strong>#${ticket.id.slice(-8).toUpperCase()}</strong>: ${ticket.subject}</p>
    <div class="highlight">
      <p>${message}</p>
    </div>
    <div style="text-align: center;">
      <a href="${FRONTEND_URL}/support/tickets/${ticket.id}" class="btn">View Ticket</a>
    </div>
  `;

  await sendEmail({
    to: user.email,
    subject: `Reply on your ticket: ${ticket.subject}`,
    html: baseTemplate(content, 'Support Reply'),
  });
};

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendWelcomeEmail,
  sendOrderConfirmationEmail,
  sendTicketReplyEmail,
};
