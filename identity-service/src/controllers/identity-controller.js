const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const generateTokens = require('../utils/generateToken');
const logger = require('../utils/logger');
const { validateRegistration, validatelogin } = require('../utils/validation');

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
      userInfo: {
        id: user._id,
        email: user.email,
        username: user.username
      },
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

// login user
const login = async (req, res) => {
  logger.info("Login endpoint hit...");
  try {
    const { error } = validatelogin(req.body);
    if (error) {
      logger.warn("Validation error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      logger.warn("Invalid user");
      return res.status(400).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    // user valid password or not
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      logger.warn("Invalid password");
      return res.status(400).json({
        success: false,
        message: "Invalid password",
      });
    }

    const { accessToken, refreshToken } = await generateTokens(user);

    res.json({
      accessToken,
      refreshToken,
      userId: user._id,
    });
  } catch (e) {
    logger.error("Login error occured", e);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

//refresh token
const refreshToken = async (req, res) => {
  logger.info("Refresh token endpoint hit...");
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.warn("Refresh token missing");
      return res.status(400).json({
        success: false,
        message: "Refresh token missing",
      });
    }

    const storedToken = await RefreshToken.findOne({ token: refreshToken });

    // const storedToken = await RefreshToken.deleteOne({ token: refreshToken });
    
    if (!storedToken) {
      logger.warn("Invalid refresh token provided");
      return res.status(400).json({
        success: false,
        message: "Invalid refresh token",
      });
    }

    if (!storedToken || storedToken.expiresAt < new Date()) {
      logger.warn("Invalid or expired refresh token");

      return res.status(401).json({
        success: false,
        message: `Invalid or expired refresh token`,
      });
    }

    const user = await User.findById(storedToken.user);

    if (!user) {
      logger.warn("User not found");

      return res.status(401).json({
        success: false,
        message: `User not found`,
      });
    }

    const { accessToken: newAccessToken, refreshToken: newRefreshToken } =
      await generateTokens(user);

    //delete the old refresh token
    await RefreshToken.deleteOne({ _id: storedToken._id });

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (e) {
    logger.error("Refresh token error occured", e);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// logout user
const logout = async (req, res) => {
  logger.info("Logout endpoint hit...");
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      logger.warn("Refresh token missing");
      return res.status(400).json({
        success: false,
        message: "Refresh token missing",
      });
    }

   const storedToken = await RefreshToken.findOneAndDelete({
      token: refreshToken,
    });
    if (!storedToken) {
      logger.warn("Invalid refresh token provided");
      return res.status(400).json({
        success: false,
        message: "Invalid refresh token",
      });
    }
    logger.info("Refresh token deleted for logout");

    res.json({
      success: true,
      message: "Logged out successfully!",
    });
  } catch (e) {
    logger.error("Error while logging out", e);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout
};