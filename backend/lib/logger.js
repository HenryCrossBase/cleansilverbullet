const fs = require("fs/promises");
const path = require("path");
const { LOG_LEVEL } = require("../env");
const pino = require("pino");

const WEBHOOK_LOG = path.join(__dirname, "..", "webhook_success.log");

const logger = pino({
    level: LOG_LEVEL,
    base: undefined,
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
        level(label) {
            return { level: label };
        },
    },
});

function withMessagePrefix(childLogger, msgPrefix) {
    if (!msgPrefix) return childLogger;

    for (const level of ["fatal", "error", "warn", "info", "debug", "trace"]) {
        const original = childLogger[level].bind(childLogger);
        childLogger[level] = (...args) => {
            if (typeof args[0] === "string") {
                args[0] = `${msgPrefix}${args[0]}`;
            } else if (typeof args[1] === "string") {
                args[1] = `${msgPrefix}${args[1]}`;
            }
            return original(...args);
        };
    }

    return childLogger;
}

function getLogger(name, options = {}) {
    const { msgPrefix, ...bindings } = options;
    const childLogger = logger.child({
        name,
        ...bindings,
    });

    return withMessagePrefix(childLogger, msgPrefix);
}

function appendWebhookLog(line) {
    const content = line.endsWith("\n") ? line : `${line}\n`;
    fs.appendFile(WEBHOOK_LOG, content, "utf8").catch((err) => {
        logger.error({ err }, "Failed to append webhook log");
    });
}

module.exports = {
    logger,
    getLogger,
    createLogger: (bindings = {}) => logger.child(bindings),
    appendWebhookLog,
};
