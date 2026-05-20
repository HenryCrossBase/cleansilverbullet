const rateLimit = require("express-rate-limit");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const argon2 = require("argon2");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const {
    NODE_ENV,
    ADMIN_CHAT_ID,
    ADMIN_BOT_TOKEN,
    VENDOR_BOT_TOKEN,
    VENDOR_DASHBOARD_URL,
    HCAPTCHA_SECRET_KEY,
    CF_SECRET_KEY_PRODUCTION,
    TELEGRAM_CHANNEL_BOT_TOKEN,
    TELEGRAM_CHANNEL_ID,
} = require("../env");
const prisma = require("../lib/prisma");
const {
    authenticateToken,
    signAuthToken,
    invalidateAuthState,
} = require("../lib/auth");
const { getPublicKey, decryptBase64Payload } = require("../lib/cryptoKeys");
const { appendWebhookLog, getLogger } = require("../lib/logger");


const LAST_ONLINE_SYNC_MS = 5 * 60 * 1000;
const lastOnlineTouch = new Map();
const logger = getLogger("shared");

const UPLOAD_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR);
}

const authRateLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 25,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: "Too many authentication attempts. Please try again later.",
    },
});

const publicSubmitLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many submissions. Please slow down." },
});

function isSafeHttpUrl(value) {
    if (typeof value !== "string" || !value.trim()) return false;
    try {
        const parsed = new URL(value);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch (_err) {
        return false;
    }
}

async function sendAdminTelegramAlert(text, replyMarkup) {
    if (!ADMIN_BOT_TOKEN || !ADMIN_CHAT_ID) return false;
    try {
        const payload = {
            chat_id: ADMIN_CHAT_ID,
            text,
            parse_mode: "HTML",
        };
        if (replyMarkup) {
            payload.reply_markup = replyMarkup;
        }
        const tgRes = await fetch(
            `https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            },
        );
        return tgRes.ok;
    } catch (_err) {
        return false;
    }
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, `config-${uniqueSuffix}.espk`);
    },
});

const fileFilter = (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() !== ".espk") {
        return cb(
            new Error(
                "Strict Rule: Only .espk Silverbullet configs are allowed.",
            ),
            false,
        );
    }
    cb(null, true);
};

const upload = multer({
    storage,
    fileFilter,
    limits: { files: 1, fileSize: 10 * 1024 * 1024 },
}).single("configFile");

async function verifyHcaptcha(token) {
    const isProduction = NODE_ENV === "production";
    const secret = isProduction
        ? CF_SECRET_KEY_PRODUCTION || HCAPTCHA_SECRET_KEY
        : HCAPTCHA_SECRET_KEY;
    if (!token) return false;

    if (!secret) return !isProduction;

    try {
        const form = new URLSearchParams({
            secret,
            response: token,
        });

        const response = await fetch(
            "https://api.hcaptcha.com/siteverify",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: form.toString(),
            },
        );

        if (!response.ok) return false;

        const data = await response.json();
        return Boolean(data.success);
    } catch (_err) {
        return false;
    }
}

const sendVendorTelegramAlert = async (chatId, message) => {
    if (!chatId || !VENDOR_BOT_TOKEN) return;
    try {
        const tgRes = await fetch(
            `https://api.telegram.org/bot${VENDOR_BOT_TOKEN}/sendMessage`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: message,
                    parse_mode: "HTML",
                }),
            },
        );
        const tgo = await tgRes.text();
        appendWebhookLog(
            `[VENDOR PUSH] Chat: ${chatId} - Status: ${tgRes.status} - Output: ${tgo}`,
        );
    } catch (error) {
        logger.error("Telegram Webhook Error", error);
    }
};

const sendChannelTelegramAlert = async (message) => {
    if (!TELEGRAM_CHANNEL_BOT_TOKEN || !TELEGRAM_CHANNEL_ID) return;
    try {
        const tgRes = await fetch(
            `https://api.telegram.org/bot${TELEGRAM_CHANNEL_BOT_TOKEN}/sendMessage`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    chat_id: TELEGRAM_CHANNEL_ID,
                    text: message,
                    parse_mode: "HTML",
                }),
            },
        );
        const tgo = await tgRes.text();
        appendWebhookLog(
            `[CHANNEL PUSH] Channel: ${TELEGRAM_CHANNEL_ID} - Status: ${tgRes.status} - Output: ${tgo}`,
        );
    } catch (error) {
        logger.error("Telegram Channel Webhook Error", error);
    }
};

const maskUsername = (username, req) => {
    if (req?.user?.rank === "ADMIN") return username;
    const showLen = Math.ceil(username.length / 2);
    return username.substring(0, showLen) + "***";
};

const avatarStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        cb(
            null,
            `avatar-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`,
        );
    },
});

const avatarUpload = multer({
    storage: avatarStorage,
    limits: { fileSize: 2 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith("image/")) {
            return cb(new Error("Only image files are allowed."));
        }
        cb(null, true);
    },
}).single("avatar");

module.exports = {
    ADMIN_CHAT_ID,
    ADMIN_BOT_TOKEN,
    LAST_ONLINE_SYNC_MS,
    UPLOAD_DIR,
    VENDOR_DASHBOARD_URL,
    appendWebhookLog,
    authRateLimiter,
    authenticateToken,
    avatarUpload,
    bcrypt,
    argon2,
    crypto,
    decryptBase64Payload,
    getPublicKey,
    invalidateAuthState,
    isSafeHttpUrl,
    jwt,
    lastOnlineTouch,
    maskUsername,
    prisma,
    publicSubmitLimiter,
    sendAdminTelegramAlert,
    sendVendorTelegramAlert,
    sendChannelTelegramAlert,
    signAuthToken,
    upload,
    verifyHcaptcha,
};
