const Post = require("../models/Post");
const logger = require("../utils/logger");
const { validateCreatePost } = require("../utils/validation");

const createPost = async (req, res) => {
  logger.info("Create post endpoint hit");
  try {
    //validate the schema
    const { error } = validateCreatePost(req.body);
    if (error) {
      logger.warn("Validation error", error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }
    const { content, mediaIds } = req.body;
    const newlyCreatedPost = new Post({
      user: req.user.userId,
      content,
      mediaIds: mediaIds || [],
    });

    await newlyCreatedPost.save();

    // await publishEvent("post.created", {
    //   postId: newlyCreatedPost._id.toString(),
    //   userId: newlyCreatedPost.user.toString(),
    //   content: newlyCreatedPost.content,
    //   createdAt: newlyCreatedPost.createdAt,
    // });

    // await invalidatePostCache(req, newlyCreatedPost._id.toString());
    logger.info("Post created successfully", newlyCreatedPost);
    res.status(201).json({
      success: true,
      message: "Post created successfully",
    });
  } catch (e) {
    logger.error("Error creating post", e);
    res.status(500).json({
      success: false,
      message: "Error creating post",
    });
  }
};

const getAllPosts = async (req, res) => {
  logger.info("Fetching all posts endpoint hit");
  try {

  } catch (e) {
    logger.error("Error fetching posts", e);
    res.status(500).json({
      success: false,
      message: "Error fetching posts",
    });
  }
};

const getPost = async (req, res) => {
  logger.info("Fetching post endpoint hit");
  try {

  } catch (e) {
    logger.error("Error fetching post", e);
    res.status(500).json({
      success: false,
      message: "Error fetching post",
    });
  }
};

const deletePost = async (req, res) => {
  logger.info("Deleting post endpoint hit");
  try {

  } catch (e) {
    logger.error("Error deleting post", e);
    res.status(500).json({
      success: false,
      message: "Error deleting post",
    });
  }
};

module.exports = { createPost, getAllPosts, getPost, deletePost };