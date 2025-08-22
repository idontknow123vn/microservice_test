const User = require('../models/User');
const generateTokens = require('../utils/generateToken');
const logger = require('../utils/logger');
const { validateRegistration } = require('../utils/validation');

//register
const register = async (req, res) => {
  logger.info("Register endpoint hit...");
  try {
    // validate the schema
    const { error } = validateRegistration(req.body);
    if (error) {
      logger.warn("Validation error:", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message 
      });
    }
    const { email, password, username } = req.body;
    let user = await User.findOne({ $or: [{email}, {username}]})
    if (user) {
      logger.warn("User already exists with email or username");
      return res.status(400).json({
        success: false,
        message: "User already exists with email or username"
      });
    }
    user = new User({
      email,
      password,
      username
    });
    await user.save();
    logger.info("User registered successfully:", user._id);
    // const { accessToken, refreshToken } = await generateTokens(user);
    res.status(201).json({
      success: true,
      message: "User registered successfully, happy new year",
      userInfo: user,
      // accessToken: accessToken,
      // refreshToken: refreshToken
    });
  } catch (error) {
    logger.error("Error occurred during registration:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      // error: error.message
    });
  }
};

module.exports = {
  register
};