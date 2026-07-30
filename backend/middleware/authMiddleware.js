const jwt = require('jsonwebtoken');
const redis = require('../config/redis');
const { ACCESS_TOKEN_SECRET } = require('../utils/tokenUtils');

/**
 * Express middleware to verify Authorization header and check Redis token blacklist.
 */
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required in Authorization header',
      });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token missing',
      });
    }

    // Check if access token is blacklisted in Redis
    try {
      const isBlacklisted = await redis.get(`blacklist:${token}`);
      if (isBlacklisted) {
        return res.status(401).json({
          success: false,
          message: 'Token has been revoked or blacklisted',
        });
      }
    } catch (redisError) {
      console.error('[AuthMiddleware] Redis lookup error:', redisError.message);
    }

    // Verify access token validity and signature
    jwt.verify(token, ACCESS_TOKEN_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired access token',
        });
      }

      // Check if jti (if present) is blacklisted in Redis
      if (decoded && decoded.jti) {
        try {
          const isJtiBlacklisted = await redis.get(`blacklist:${decoded.jti}`);
          if (isJtiBlacklisted) {
            return res.status(401).json({
              success: false,
              message: 'Token session has been revoked',
            });
          }
        } catch (redisError) {
          console.error('[AuthMiddleware] Redis JTI lookup error:', redisError.message);
        }
      }

      req.user = decoded;
      next();
    });
  } catch (error) {
    console.error('[AuthMiddleware Error]:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during authentication',
    });
  }
};

module.exports = authMiddleware;
