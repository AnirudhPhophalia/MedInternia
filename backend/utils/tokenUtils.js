const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'access_token_secret_key';
const REFRESH_TOKEN_SECRET = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'refresh_token_secret_key';

/**
 * Generate a short-lived (15-minute) Access Token.
 * @param {Object} user - User object containing user details.
 * @returns {string} Signed 15-minute JWT.
 */
const generateAccessToken = (user) => {
  const payload = {
    userId: user._id ? user._id.toString() : (user.userId || user.id),
    email: user.email,
    userType: user.userType || user.role,
  };

  return jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: '15m' });
};

/**
 * Generate a long-lived (7-day) Refresh Token with a unique jti.
 * @param {Object} user - User object containing user details.
 * @returns {string} Signed 7-day JWT with unique jti.
 */
const generateRefreshToken = (user) => {
  const jti = crypto.randomUUID();
  const payload = {
    userId: user._id ? user._id.toString() : (user.userId || user.id),
    email: user.email,
    jti,
  };

  return jwt.sign(payload, REFRESH_TOKEN_SECRET, { expiresIn: '7d' });
};

/**
 * Set an HTTP-Only, Secure, SameSite cookie with the Refresh Token.
 * @param {Object} res - Express response object.
 * @param {string} refreshToken - The signed refresh token string.
 */
const setRefreshTokenCookie = (res, refreshToken) => {
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  });
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  setRefreshTokenCookie,
  ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET,
};
