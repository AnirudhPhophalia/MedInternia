import nodemailer from 'nodemailer';

// ── Startup validation ───────────────────────────────────────────────────────
// Fail fast with a clear error instead of a confusing SMTP auth failure
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  throw new Error(
    '\n[MedInternia] Email configuration missing!\n' +
    'Set EMAIL_USER and EMAIL_PASS in your backend/.env file.\n' +
    'EMAIL_PASS must be a Gmail App Password (16 chars, no spaces).\n' +
    'Generate one at: https://myaccount.google.com/apppasswords\n' +
    '(Requires 2-Step Verification to be enabled on your Google account)\n'
  );
}
// ─────────────────────────────────────────────────────────────────────────────

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.EMAIL_PORT) || 587,
  secure: false,    // true for port 465, false for 587 (uses STARTTLS)
  auth: {
    user: process.env.EMAIL_USER,
    // ⚠️ This must be a Gmail App Password — NOT your Gmail login password.
    // Google stopped accepting account passwords for SMTP in August 2024.
    // Generate at: myaccount.google.com/apppasswords
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: true,
    minVersion: 'TLSv1.2',
  },
});

// Verify connection on startup (optional but helps debug config issues)
transporter.verify((error) => {
  if (error) {
    console.error('[Email] SMTP connection failed:', error.message);
    console.error('[Email] Check EMAIL_USER and EMAIL_PASS in backend/.env');
  } else {
    console.log('[Email] SMTP connection verified successfully');
  }
});

export default transporter;