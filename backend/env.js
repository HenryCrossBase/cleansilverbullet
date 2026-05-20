require("dotenv").config();

const NODE_ENV = process.env.NODE_ENV || "development";
const PORT = Number(process.env.PORT || 3001);
const DOCS = process.env.DOCS === "true" || false;

const CORS_ALLOWED_ORIGINS = (
    process.env.CORS_ALLOWED_ORIGINS ||
    "http://localhost:3000,http://127.0.0.1:3000"
)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID
    ? Number(process.env.ADMIN_CHAT_ID)
    : null;
const ADMIN_USER_IDS = process.env.ADMIN_USER_IDS
    ? process.env.ADMIN_USER_IDS.split(",")
          .map(Number)
          .filter((id) => !Number.isNaN(id))
    : [];

const ADMIN_BOT_TOKEN = process.env.ADMIN_BOT_TOKEN || "";
const VENDOR_BOT_TOKEN = process.env.VENDOR_BOT_TOKEN || "";

const APP_BASE_URL = process.env.APP_BASE_URL || "https://silverbullet.to";
const VENDOR_DASHBOARD_URL =
    process.env.VENDOR_DASHBOARD_URL || `${APP_BASE_URL}/vendor/dashboard`;

const HCAPTCHA_SECRET_KEY = process.env.HCAPTCHA_SECRET_KEY || "";
const CF_SECRET_KEY_PRODUCTION = process.env.CF_SECRET_KEY_PRODUCTION || "";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "8h";
const AUTH_CACHE_TTL_MS = Number(process.env.AUTH_CACHE_TTL_MS || 60000);

const AUTH_CACHE_KEY_PREFIX =
    process.env.AUTH_CACHE_KEY_PREFIX || "sb:auth:user:";
const REDIS_URL = process.env.REDIS_URL || "";

const OXAPAY_API_KEY = process.env.OXAPAY_API_KEY || "";
const OXAPAY_CHECKOUT_URL = process.env.OXAPAY_CHECKOUT_URL || "";
const OXAPAY_PAYLINK_BASE = process.env.OXAPAY_PAYLINK_BASE || "";

const RESEND_API_KEY = process.env.RESEND_API_KEY || "";

const ALLOW_LEGACY_OWNER = process.env.ALLOW_LEGACY_OWNER === "true";

const LOG_LEVEL =
    process.env.LOG_LEVEL || (NODE_ENV === "production" ? "info" : "debug");

module.exports = {
    NODE_ENV,
    PORT,
    DOCS,
    CORS_ALLOWED_ORIGINS,
    ADMIN_CHAT_ID,
    ADMIN_USER_IDS,
    ADMIN_BOT_TOKEN,
    VENDOR_BOT_TOKEN,
    APP_BASE_URL,
    VENDOR_DASHBOARD_URL,
    HCAPTCHA_SECRET_KEY,
    CF_SECRET_KEY_PRODUCTION,
    JWT_SECRET,
    JWT_EXPIRES_IN,
    AUTH_CACHE_TTL_MS,
    AUTH_CACHE_KEY_PREFIX,
    REDIS_URL,
    OXAPAY_API_KEY,
    OXAPAY_CHECKOUT_URL,
    OXAPAY_PAYLINK_BASE,
    RESEND_API_KEY,
    ALLOW_LEGACY_OWNER,
    LOG_LEVEL,
};
