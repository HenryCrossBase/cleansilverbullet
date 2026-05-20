const express = require("express");
const { randomUUID } = require("crypto");
const cors = require("cors");
const helmet = require("helmet");
const { PORT, CORS_ALLOWED_ORIGINS } = require("./env");
const { initKeyPair } = require("./lib/cryptoKeys");
const { getLogger } = require("./lib/logger");
const { setupSwagger } = require("./lib/swagger");
const mainRouter = require("./routes");

const logger = getLogger("server", { msgPrefix: "[server] " });

const corsOptions = {
    origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (CORS_ALLOWED_ORIGINS.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error("Strict CORS Policy Violation: Origin not allowed"), false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: false,
    maxAge: 86400,
};

function createApp() {
    const app = express();
    app.set('trust proxy', 1);

    app.use(cors(corsOptions));
    app.options("*", cors(corsOptions));
    app.use(helmet({ 
        crossOriginResourcePolicy: false,
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
        }
    }));
    app.use(express.json());
    app.use((req, res, next) => {
        const start = process.hrtime.bigint();
        const requestId = req.headers["x-request-id"] || randomUUID();
        res.setHeader("x-request-id", requestId);

        const getDurationMs = () => {
            const elapsedNs = process.hrtime.bigint() - start;
            const durationMs = Number(elapsedNs) / 1e6;
            return Number(durationMs.toFixed(2));
        };

        let responseTimeHeaderSet = false;
        const setResponseTimeHeader = () => {
            if (responseTimeHeaderSet || res.headersSent) return;
            responseTimeHeaderSet = true;
            res.setHeader("x-response-time-ms", String(getDurationMs()));
        };

        const originalWriteHead = res.writeHead;
        res.writeHead = function writeHeadProxy(...args) {
            setResponseTimeHeader();
            return originalWriteHead.apply(this, args);
        };

        const originalFlushHeaders = res.flushHeaders;
        res.flushHeaders = function flushHeadersProxy() {
            setResponseTimeHeader();
            return originalFlushHeaders.call(this);
        };

        res.on("finish", () => {
            const timeTookMs = getDurationMs();
            const logPayload = {
                requestId,
                method: req.method,
                path: req.originalUrl,
                statusCode: res.statusCode,
                durationMs: timeTookMs,
                timeTookMs,
                ip: req.ip,
                userAgent: req.get("user-agent"),
            };

            if (res.statusCode >= 500) {
                logger.error(logPayload, "HTTP request completed");
                return;
            }
            if (res.statusCode >= 400) {
                logger.warn(logPayload, "HTTP request completed");
                return;
            }
            logger.info(logPayload, "HTTP request completed");
        });

        next();
    });
    app.disable("x-powered-by");

    app.use("/api", (req, res, next) => {
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        res.setHeader("Surrogate-Control", "no-store");
        next();
    });

    app.use(mainRouter);
    setupSwagger(app);

    return app;
}

const app = createApp();

async function start() {
    await initKeyPair();
    app.listen(PORT, () => {
        logger.info(`Internal engine booted on port ${PORT}`);
        logger.info("Strict .espk filesystem validator active");
    });
}

if (require.main === module) {
    start().catch((err) => {
        logger.error({ err }, "Failed to initialize RSA key infrastructure.");
        process.exit(1);
    });
}

module.exports = app;
module.exports.createApp = createApp;
module.exports.start = start;
