const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const RefreshToken = require('../models/RefreshToken'); // Assuming you have a model for refresh tokens

const generateTokens = async (user) => {
  const accessToken = jwt.sign({ 
    userId: user._id,
    username: user.username
  }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });
  const refreshToken = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // Refresh token valid for 30 days
  await RefreshToken.create({
    token: refreshToken,
    userId: user._id,
    expiresAt: expiresAt
  })
  return { accessToken, refreshToken };
};

module.exports = generateTokens;