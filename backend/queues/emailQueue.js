const { Queue } = require('bullmq');
const Redis = require('ioredis');

const connection = new Redis(process.env.REDIS_URL || {
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
});

const emailQueue = new Queue('Email-Queue', { connection });

/**
 * Enqueue an OTP dispatch job into the BullMQ Email Queue with automatic retries.
 * @param {string} email - Recipient email address
 * @param {string} code - Generated OTP verification code
 * @returns {Promise<Object>} Added BullMQ job instance
 */
const enqueueOTP = async (email, code) => {
  return await emailQueue.add(
    'sendOTP',
    { email, code },
    {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    }
  );
};

module.exports = {
  emailQueue,
  enqueueOTP,
};
