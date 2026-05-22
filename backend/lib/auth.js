const jwt = require("jsonwebtoken");
const prisma = require("./prisma");
const redis = require("./redis");
const {
    JWT_SECRET,
    NODE_ENV,
    JWT_EXPIRES_IN,
    AUTH_CACHE_TTL_MS,
} = require("../env");

if (!JWT_SECRET) {
    throw new Error("FATAL: JWT_SECRET environment variable is required.");
}
if (NODE_ENV === "production" && JWT_SECRET === "change_me_for_local_dev") {
    throw new Error(
        "FATAL: JWT_SECRET must be changed before production startup.",
    );
}
const authCache = new Map();
const AUTH_REDIS_TTL_SECONDS = Math.max(
    10,
    Math.floor(AUTH_CACHE_TTL_MS / 1000),
);

const ROLE_PERMISSIONS = {
    0: [
        "view_telemetry",
        "view_users",
        "edit_user_info",
        "change_username",
        "change_email",
        "change_password",
        "ban_user",
        "unban_user",
        "manage_credits",
        "change_rank",
        "change_split",
        "set_admin_roles",
        "create_admin",
        "assign_badges",
        "view_disputes",
        "resolve_disputes",
        "view_tickets",
        "reply_tickets",
        "close_tickets",
        "view_ads",
        "delete_ads",
        "view_withdrawals",
        "approve_withdrawals",
        "approve_requests",
        "upload_config",
        "view_audit",
    ],
    1: [
        "view_telemetry",
        "view_users",
        "edit_user_info",
        "change_username",
        "change_email",
        "change_password",
        "ban_user",
        "unban_user",
        "manage_credits",
        "change_rank",
        "change_split",
        "set_admin_roles",
        "assign_badges",
        "view_disputes",
        "resolve_disputes",
        "view_tickets",
        "reply_tickets",
        "close_tickets",
        "view_ads",
        "delete_ads",
        "view_withdrawals",
        "approve_withdrawals",
        "approve_requests",
        "upload_config",
        "view_audit",
    ],
    2: [
        "view_users",
        "ban_user",
        "unban_user",
        "assign_badges",
        "view_disputes",
        "view_tickets",
        "reply_tickets",
        "close_tickets",
        "view_ads",
        "approve_requests",
        "view_audit",
    ],
    3: [
        "view_users",
        "view_tickets",
        "reply_tickets",
        "close_tickets",
        "view_disputes",
        "view_audit",
    ],
};

function parseAdminRoles(adminRoles) {
    return (adminRoles || "")
        .split(",")
        .map((r) => parseInt(r.trim(), 10))
        .filter((r) => !Number.isNaN(r));
}

function isValidCachedAuthState(user) {
    return Boolean(
        user &&
        typeof user.id === "string" &&
        typeof user.username === "string" &&
        typeof user.rank === "string",
    );
}

function computePermissions(rank, adminRoles) {
    if (rank !== "ADMIN") return [];
    const roles = parseAdminRoles(adminRoles);
    if (roles.length === 0) {
        return [];
    }
    const permissions = new Set();

    for (const role of roles) {
        const rolePermissions = ROLE_PERMISSIONS[role] || [];
        for (const permission of rolePermissions) {
            permissions.add(permission);
        }
    }

    return [...permissions];
}

function signAuthToken(user) {
    const permissions = computePermissions(user.rank, user.adminRoles);
    return jwt.sign(
        {
            id: user.id,
            username: user.username,
            rank: user.rank,
            adminRoles: user.adminRoles || null,
            permissions,
        },
        JWT_SECRET,
        {
            expiresIn: JWT_EXPIRES_IN,
            algorithm: "HS256",
        },
    );
}

async function loadUserAuthState(userId) {
    return prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            username: true,
            rank: true,
            adminRoles: true,
            bannedUntil: true,
            banReason: true,
            passwordChangedAt: true,
        },
    });
}

async function getCachedAuthState(userId) {
    const local = authCache.get(userId);
    const now = Date.now();
    if (local && local.expiresAt > now) {
        return local.data;
    }

    const redisKey = redis.getAuthCacheKey(userId);
    const redisState = await redis.getJson(redisKey);
    if (isValidCachedAuthState(redisState)) {
        authCache.set(userId, {
            data: redisState,
            expiresAt: now + AUTH_CACHE_TTL_MS,
        });
        return redisState;
    }

    return null;
}

async function setCachedAuthState(user) {
    if (!user?.id) return false;
    const cachedUser = {
        id: user.id,
        username: user.username,
        rank: user.rank,
        adminRoles: user.adminRoles || null,
        bannedUntil: user.bannedUntil || null,
        banReason: user.banReason || null,
        passwordChangedAt: user.passwordChangedAt || null,
    };

    authCache.set(user.id, {
        data: cachedUser,
        expiresAt: Date.now() + AUTH_CACHE_TTL_MS,
    });
    await redis.setJson(
        redis.getAuthCacheKey(user.id),
        cachedUser,
        AUTH_REDIS_TTL_SECONDS,
    );
    return true;
}

async function invalidateAuthState(userId) {
    if (!userId) return false;
    authCache.delete(userId);
    await redis.invalidateUser(userId);
    return true;
}

async function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
        return res.status(401).json({ error: "Missing bearer token." });
    }

    let decoded;
    try {
        decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
    } catch (err) {
        return res.status(403).json({ error: "Invalid or expired token." });
    }

    if (!decoded?.id) {
        return res.status(403).json({ error: "Token payload is invalid." });
    }

    try {
        let dbUser = await getCachedAuthState(decoded.id);
        if (!dbUser) {
            dbUser = await loadUserAuthState(decoded.id);
            if (!dbUser) {
                authCache.delete(decoded.id);
                return res.status(401).json({ error: "Session invalid." });
            }
            await setCachedAuthState(dbUser);
        }

        if (dbUser.bannedUntil && new Date(dbUser.bannedUntil) > new Date()) {
            return res
                .status(403)
                .json({
                    error: "BANNED",
                    reason: dbUser.banReason || "Policy enforcement",
                });
        }

        if (dbUser.passwordChangedAt && typeof decoded.iat === "number") {
            const passwordChangedAtSec = Math.floor(
                new Date(dbUser.passwordChangedAt).getTime() / 1000,
            );
            // 1s leeway for clock skew on the issue->verify race
            if (decoded.iat + 1 < passwordChangedAtSec) {
                return res.status(401).json({
                    error: "Session invalidated. Please log in again.",
                });
            }
        }

        req.user = {
            id: dbUser.id,
            username: dbUser.username,
            rank: dbUser.rank,
            adminRoles: dbUser.adminRoles,
            permissions: computePermissions(dbUser.rank, dbUser.adminRoles),
        };

        return next();
    } catch (_err) {
        return res
            .status(500)
            .json({ error: "Authentication subsystem error." });
    }
}

function requireAdmin(req, res, next) {
    if (req.user?.rank !== "ADMIN") {
        return res
            .status(403)
            .json({ error: "FORBIDDEN: Admin clearance required." });
    }
    return next();
}

function requirePermission(permission) {
    return (req, res, next) => {
        if (req.user?.rank !== "ADMIN") {
            return res
                .status(403)
                .json({ error: "FORBIDDEN: Admin clearance required." });
        }

        if (!req.user.permissions?.includes(permission)) {
            return res
                .status(403)
                .json({
                    error: `FORBIDDEN: Missing permission '${permission}'.`,
                });
        }

        return next();
    };
}

module.exports = {
    authenticateToken,
    computePermissions,
    invalidateAuthState,
    parseAdminRoles,
    requireAdmin,
    requirePermission,
    setCachedAuthState,
    signAuthToken,
};
