"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const morgan_1 = __importDefault(require("morgan"));
const webhook_1 = require("./routes/webhook");
const health_1 = require("./routes/health");
const api_1 = require("./routes/api");
const rateLimit_1 = require("./middleware/rateLimit");
const errorHandler_1 = require("./middleware/errorHandler");
const logger_1 = require("./utils/logger");
const environment_1 = require("./config/environment");
const app = (0, express_1.default)();
app.use(express_1.default.json({ limit: '5mb' }));
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)());
app.use((0, morgan_1.default)('combined', {
    stream: {
        write: (message) => logger_1.Logger.info(message.trim()),
    },
}));
app.use(rateLimit_1.webhookRateLimiter);
app.use(health_1.healthRouter);
app.use(webhook_1.webhookRouter);
app.use(api_1.apiRouter);
app.use(errorHandler_1.errorHandler);
const port = environment_1.Env.port;
app.listen(port, () => {
    logger_1.Logger.info(`Router PSI escuchando en puerto ${port}`);
});
exports.default = app;
