require('dotenv').config();
const express = require('express');
const cors = require('cors');
const redis = require('ioredis');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');
const logger = require('./utils/logger');
const proxy = require('express-http-proxy');
const errorHandler = require('../../identity-service/src/middleware/errorHandler');


const app = express();
const PORT = process.env.PORT || 3000;

const redisClient = new redis(process.env.REDIS_URL);

app.use(helmet());
app.use(cors());
app.use(express.json());

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

app.use((err, req, res, next) => {
  logger.info(`Receive ${req.method} request for ${req.url}`);
  logger.info(`Request body: ${JSON.stringify(req.body)}`);
  next();
});

// create proxy options
const proxyOptions = {
  proxyReqPathResolver: (req) => {
    return req.originalUrl.replace(/^\/v1/, "/api");
  },
  proxyErrorHandler: (err, res, next) => {
    logger.error(`Proxy error: ${err.message}`);
    res.status(500).json({
      message: `Internal server error`,
      error: err.message,
    });
  },
};


// setting up proxy for identity-service
app.use('/v1/auth', proxy(process.env.IDENTITY_SERVICE_URL, {
  ...proxyOptions,
  proxyReqOptDecorator: (proxyReqOpts, srcReq) => {
    proxyReqOpts.headers["Content-Type"] = "application/json";
    return proxyReqOpts;
  },
  userResDecorator: (proxyRes, proxyResData, userReq, userRes) => {
    logger.info(
      `Response received from Identity service: ${proxyRes.statusCode}`
    );

    return proxyResData;
  },
}));

app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`API Gateway listening on port ${PORT}`);
  logger.info(`Identity service is running on ${process.env.IDENTITY_SERVICE_URL}`);
  logger.info(`Redis is connected at ${process.env.REDIS_URL}`);
});
