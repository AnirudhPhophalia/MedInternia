const { Worker } = require('bullmq');
const nodemailer = require('nodemailer');
const Redis = require('ioredis');

const connection = new Redis(process.env.REDIS_URL || {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
});

// Configure reusable Nodemailer transporter using SMTP environment variables
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT || process.env.EMAIL_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || process.env.EMAIL_USER,
    pass: process.env.SMTP_PASS || process.env.EMAIL_PASS,
  },
});

// Initialize BullMQ worker listening to 'Email-Queue'
const emailWorker = new Worker(
  'Email-Queue',
  async (job) => {
    const { email, code } = job.data;

    if (!email || !code) {
      throw new Error(`Invalid job payload for job ${job.id}: missing email or code.`);
    }

    const mailOptions = {
      from: `"MedInternia Security" <${process.env.SMTP_USER || process.env.EMAIL_USER || 'no-reply@medinternia.com'}>`,
      to: email,
      subject: 'MedInternia - Your Verification Code (OTP)',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #2b6cb0;">MedInternia Verification Code</h2>
          <p>Use the following 6-digit verification code to complete your request:</p>
          <div style="font-size: 24px; font-weight: bold; letter-spacing: 4px; background: #edf2f7; padding: 12px 24px; display: inline-block; border-radius: 6px; color: #2d3748;">
            ${code}
          </div>
          <p style="margin-top: 20px; font-size: 12px; color: #718096;">
            This code will expire shortly. If you did not request this code, please ignore this email.
          </p>
        </div>
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    return info.messageId;
  },
  { connection }
);

emailWorker.on('completed', (job, result) => {
  console.log(`[EmailWorker] Job ${job.id} completed successfully. MessageID: ${result}`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`[EmailWorker] Job ${job?.id} failed with error:`, err.message);
});

module.exports = emailWorker;
