require('dotenv').config();
const express = require("express");
const mongoose = require("mongoose");
const Redis = require("ioredis");
const cors = require("cors");
const helmet = require("helmet");
const postRoutes = require("./routes/post-routes");
const errorHandler = require("./middleware/errorHandler");
// const { RateLimiterRedis, } = require('rate-limiter-flexible');
const { rateLimit } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const logger = require("./utils/logger");

const app = express();
const PORT = process.env.PORT || 3002;

//connect to database
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  logger.info("Connected to MongoDB");
})
.catch((error) => {
  logger.error("MongoDB connection error:", error);
});

const redisClient = new Redis(process.env.REDIS_URL);

//using middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

app.use((err, req, res, next) => {
  logger.info(`Receive ${req.method} request for ${req.url}`);
  logger.info(`Request body: ${JSON.stringify(req.body)}`);
  next();
});

// rate limiting
const rateLimitOptions = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).send({
      success: false,
      message: "Too Many Requests"
    });
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  })
});

app.use(rateLimitOptions);

// DDOS protection and rate
// can test value for points and duration
// can use for other databases
// const rateLimiter = new RateLimiterRedis({
//   storeClient: redisClient,
//   keyPrefix: 'middleware',
//   points: 10, // 10 requests
//   duration: 1 // per second
// })

// app.use((req, res, next) => {
//   rateLimiter.consume(req.ip)
//     .then(() => {
//       next();
//     })
//     .catch(() => {
//       logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
//       res.status(429).send({
//         success: false,
//         message: "Too Many Requests"
//       });
//     });
// });

// IP based rate limiting for sensitive routes
const sensitiveEndpointLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).send({
      success: false,
      message: "Too Many Requests"
    });
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  })
});

app.use('/api/posts/create-post', sensitiveEndpointLimiter);

// using main url
//routes -> pass redisclient to routes
app.use(
  "/api/posts",
  (req, res, next) => {
    req.redisClient = redisClient;
    next();
  },
  postRoutes
);

// error handler
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});

// unhandled promise rejection
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
