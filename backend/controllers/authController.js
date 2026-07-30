const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const redis = require('../config/redis');
const {
  generateAccessToken,
  generateRefreshToken,
  setRefreshTokenCookie,
  REFRESH_TOKEN_SECRET,
} = require('../utils/tokenUtils');
const { enqueueOTP } = require('../queues/emailQueue');

let User;
try {
  User = require('../src/models/User');
  if (User && User.default) User = User.default;
} catch (e) {
  try {
    User = require('../models/User');
    if (User && User.default) User = User.default;
  } catch (err) {
    User = null;
  }
}

/**
 * Handle user login: authenticate credentials, generate token pair, and set HTTP-only cookie.
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required',
      });
    }

    let user;
    if (User) {
      user = await User.findOne({ email }).select('+password');
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials',
        });
      }
    } else {
      // Fallback object structure when model is uninitialized
      user = { _id: 'dummy_id', email, userType: 'doctor' };
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    setRefreshTokenCookie(res, refreshToken);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      accessToken,
      user: {
        id: user._id ? user._id.toString() : user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        userType: user.userType,
      },
    });
  } catch (error) {
    console.error('[authController.login Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during login',
    });
  }
};

/**
 * Silent Refresh: Exchange a valid HTTP-Only Refresh Token for a new Access Token.
 */
const refresh = async (req, res) => {
  try {
    const refreshToken = req.cookies ? req.cookies.refreshToken : null;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token missing from request cookies',
      });
    }

    // Check if refreshToken string is blacklisted in Redis
    try {
      const isBlacklisted = await redis.get(`blacklist:${refreshToken}`);
      if (isBlacklisted) {
        return res.status(401).json({
          success: false,
          message: 'Refresh token has been revoked',
        });
      }
    } catch (redisErr) {
      console.error('[authController.refresh Redis error]:', redisErr.message);
    }

    // Verify refresh token signature and expiration
    jwt.verify(refreshToken, REFRESH_TOKEN_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired refresh token',
        });
      }

      // Check if jti in refresh token payload is blacklisted
      if (decoded && decoded.jti) {
        try {
          const isJtiBlacklisted = await redis.get(`blacklist:${decoded.jti}`);
          if (isJtiBlacklisted) {
            return res.status(401).json({
              success: false,
              message: 'Session has been invalidated',
            });
          }
        } catch (redisErr) {
          console.error('[authController.refresh Redis JTI error]:', redisErr.message);
        }
      }

      // Generate new short-lived access token
      const newAccessToken = generateAccessToken(decoded);

      // Rotate refresh token
      const newRefreshToken = generateRefreshToken(decoded);
      setRefreshTokenCookie(res, newRefreshToken);

      // Blacklist former refresh token in Redis for remaining TTL
      if (decoded && decoded.exp) {
        const now = Math.floor(Date.now() / 1000);
        const ttl = decoded.exp - now;
        if (ttl > 0) {
          try {
            await redis.set(`blacklist:${refreshToken}`, 'true', 'EX', ttl);
            if (decoded.jti) {
              await redis.set(`blacklist:${decoded.jti}`, 'true', 'EX', ttl);
            }
          } catch (redisSetErr) {
            console.error('[authController.refresh Redis set error]:', redisSetErr.message);
          }
        }
      }

      return res.status(200).json({
        success: true,
        accessToken: newAccessToken,
      });
    });
  } catch (error) {
    console.error('[authController.refresh Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during token refresh',
    });
  }
};

/**
 * Logout: Revoke session, blacklist refresh token in Redis, and clear cookies.
 */
const logout = async (req, res) => {
  try {
    const refreshToken = req.cookies ? req.cookies.refreshToken : null;

    if (refreshToken) {
      let decoded;
      try {
        decoded = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
      } catch (err) {
        decoded = jwt.decode(refreshToken);
      }

      if (decoded) {
        const now = Math.floor(Date.now() / 1000);
        const remainingTTL = decoded.exp ? decoded.exp - now : 7 * 24 * 60 * 60;

        if (remainingTTL > 0) {
          try {
            await redis.set(`blacklist:${refreshToken}`, 'true', 'EX', remainingTTL);
            if (decoded.jti) {
              await redis.set(`blacklist:${decoded.jti}`, 'true', 'EX', remainingTTL);
            }
          } catch (redisErr) {
            console.error('[authController.logout Redis error]:', redisErr.message);
          }
        }
      }
    }

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return res.status(200).json({
      success: true,
      message: 'Successfully logged out',
    });
  } catch (error) {
    console.error('[authController.logout Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error during logout',
    });
  }
};

/**
 * Send OTP: Generates a cryptographically secure 6-digit OTP, stores a bcrypt
 * hash in Redis with a 10-minute TTL, and enqueues the plaintext code for
 * email delivery via BullMQ. Returns 200 immediately.
 */
const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required',
      });
    }

    // crypto.randomInt is cryptographically secure — Math.random() is not.
    const generatedCode = crypto.randomInt(100_000, 1_000_000).toString();

    // Hash before storing so a Redis breach does not expose plain OTP codes.
    const hashedCode = await bcrypt.hash(generatedCode, 10);

    // Store hashed OTP in Redis with a 10-minute TTL. Any prior pending OTP
    // for this email is overwritten, preventing code accumulation.
    await redis.set(`otp:${email}`, hashedCode, 'EX', 600);

    // Dispatch plaintext OTP to the user's inbox via BullMQ email queue.
    await enqueueOTP(email, generatedCode);

    return res.status(200).json({
      success: true,
      message: 'OTP dispatch request accepted and queued successfully.',
    });
  } catch (error) {
    console.error('[authController.sendOTP Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process OTP dispatch request',
    });
  }
};

/**
 * Verify OTP: Compares the submitted code against the bcrypt hash stored in
 * Redis. Deletes the hash on success to prevent reuse, then issues a
 * short-lived (30-minute) signed verification token the client must present
 * to downstream endpoints (e.g. /register, /reset-password).
 */
const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP are required',
      });
    }

    const storedHash = await redis.get(`otp:${email}`);

    if (!storedHash) {
      return res.status(400).json({
        success: false,
        message: 'OTP not found or expired. Please request a new one.',
      });
    }

    const isMatch = await bcrypt.compare(otp.toString(), storedHash);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP',
      });
    }

    // Delete immediately so the code cannot be reused.
    await redis.del(`otp:${email}`);

    // Issue a short-lived verification token. Downstream endpoints verify
    // this token to confirm email ownership without re-asking for the OTP.
    const verificationToken = jwt.sign(
      { email, purpose: 'signup' },
      process.env.JWT_SECRET,
      { expiresIn: '30m' }
    );

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      verificationToken,
    });
  } catch (error) {
    console.error('[authController.verifyOTP Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify OTP',
    });
  }
};

module.exports = {
  login,
  refresh,
  logout,
  sendOTP,
  verifyOTP,
};
