/**
 * admin.routes.js — Silverbullet Admin REST API
 * ──────────────────────────────────────────────
 * Drop-in Express router. Mount in server.js with:
 *   const adminRoutes = require('./admin.routes');
 *   app.use('/api/admin', adminRoutes);
 *
 * Every feature maps 1-to-1 with admin_bot.js capabilities.
 * All mutations are logged to the audit_log table.
 */

const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");

const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { error: "Too many admin requests. Please try again later." },
});
router.use(adminLimiter);

const bcrypt = require("bcryptjs");
const prisma = require("./lib/prisma");
const {
    authenticateToken,
    requireAdmin,
    requirePermission,
    parseAdminRoles,
    computePermissions,
    invalidateAuthState,
} = require("./lib/auth");
const { logAdminAudit, getAuditLogs } = require("./lib/audit");
const { ALLOW_LEGACY_OWNER, VENDOR_BOT_TOKEN } = require("./env");
const { getLogger } = require("./lib/logger");

const logger = getLogger("admin.routes", { msgPrefix: "[ADMIN ROUTES]" });

function isValidEmail(email) {
    return (
        typeof email === "string" &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
        email.length <= 254
    );
}

function isStrongPassword(password) {
    return (
        typeof password === "string" &&
        password.length >= 12 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /\d/.test(password) &&
        /[^A-Za-z0-9]/.test(password)
    );
}

// ─────────────────────────────────────────────────
// Audit Logger (shared utility)
// ─────────────────────────────────────────────────
const logAudit = (adminId, adminUsername, action, target, details = {}) =>
    logAdminAudit({
        prisma,
        adminId,
        adminUsername,
        action,
        target,
        details,
        source: "ADMIN_API",
    });

// Apply auth + admin middleware to ALL routes in this router
router.use(authenticateToken);
router.use(requireAdmin);

// ═══════════════════════════════════════════════════
// 1. GLOBAL TELEMETRY  (Bot: ACTION_STATUS)
// ═══════════════════════════════════════════════════
/**
 * @swagger
 * /api/admin/telemetry:
 *   get:
 *     tags: [admin]
 *     summary: Global platform telemetry (counts, revenue, 7-day chart, queues).
 *     description: Requires the "view_telemetry" admin permission.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Telemetry payload. }
 *       500: { description: Telemetry engine failed. }
 */
router.get(
    "/telemetry",
    requirePermission("view_telemetry"),
    async (req, res) => {
        try {
            const [adminCount, userCount, vendorCount] = await Promise.all([
                prisma.user.count({ where: { rank: "ADMIN" } }),
                prisma.user.count(),
                prisma.shop.count(),
            ]);
            const buyerCount = userCount - vendorCount;

            const midnight = new Date();
            midnight.setHours(0, 0, 0, 0);

            const [deposits, purchases] = await Promise.all([
                prisma.cryptoDeposit.aggregate({
                    where: {
                        status: "COMPLETED",
                        createdAt: { gte: midnight },
                    },
                    _sum: { amountUsd: true },
                }),
                prisma.order.findMany({
                    where: { createdAt: { gte: midnight } },
                    select: { productId: true, pricePaid: true },
                }),
            ]);
            const dailyGross = deposits._sum.amountUsd || 0;

            let platformProfit = 0;
            let totalVolume = 0;

            const productIds = [...new Set(purchases.map((p) => p.productId))];
            const products = await prisma.product.findMany({
                where: { id: { in: productIds } },
                select: {
                    id: true,
                    shop: {
                        select: {
                            owner: {
                                select: { rank: true, customSplit: true },
                            },
                        },
                    },
                },
            });
            const productMap = products.reduce((acc, p) => {
                acc[p.id] = p;
                return acc;
            }, {});

            for (const order of purchases) {
                totalVolume += order.pricePaid;
                const product = productMap[order.productId];
                if (product?.shop?.owner) {
                    const ev = product.shop.owner;
                    let split = 0.5;
                    if (ev.customSplit !== null) split = ev.customSplit;
                    else if (ev.rank === "ENTERPRISE" || ev.rank === "ADMIN") split = 0.75;
                    else if (["PREMIUM"].includes(ev.rank))
                        split = 0.6;
                    platformProfit += order.pricePaid * (1 - split);
                } else {
                    platformProfit += order.pricePaid;
                }
            }

            // 7-day daily revenue chart
            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const revenueRaw = await prisma.cryptoDeposit.findMany({
                where: {
                    status: "COMPLETED",
                    createdAt: { gte: sevenDaysAgo },
                },
                select: { amountUsd: true, createdAt: true },
            });

            const revenueByDay = {};
            for (let i = 6; i >= 0; i--) {
                const d = new Date();
                d.setDate(d.getDate() - i);
                revenueByDay[
                    d.toLocaleDateString("en-US", { weekday: "short" })
                ] = 0;
            }
            revenueRaw.forEach((dep) => {
                const label = new Date(dep.createdAt).toLocaleDateString(
                    "en-US",
                    { weekday: "short" },
                );
                if (revenueByDay[label] !== undefined)
                    revenueByDay[label] += dep.amountUsd;
            });

            const [
                openDisputes,
                pendingTickets,
                pendingWithdraw,
                pendingRequests,
            ] = await Promise.all([
                prisma.dispute.count({ where: { status: "OPEN" } }),
                prisma.supportTicket.count({ where: { status: "PENDING" } }),
                prisma.withdrawal.count({ where: { status: "PENDING" } }),
                prisma.customRequest.count({ where: { status: "PENDING" } }),
            ]);

            res.json({
                success: true,
                stats: {
                    userCount,
                    vendorCount,
                    buyerCount,
                    adminCount,
                    dailyGross: dailyGross.toFixed(2),
                    platformProfit: platformProfit.toFixed(2),
                    totalVolume: totalVolume.toFixed(2),
                    openDisputes,
                    pendingTickets,
                    pendingWithdraw,
                    pendingRequests,
                },
                revenueChart: Object.entries(revenueByDay).map(
                    ([day, amount]) => ({ day, amount }),
                ),
            });
        } catch (err) {
            res.status(500).json({ error: "Telemetry engine failed." });
        }
    },
);

// ═══════════════════════════════════════════════════
// 2. USER DATABASE  (Bot: PAGE_USERS + VIEW_USER)
// ═══════════════════════════════════════════════════
/**
 * @swagger
 * /api/admin/users:
 *   get:
 *     tags: [admin]
 *     summary: Paginated user directory with search and rank filter.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 0 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: rank
 *         schema: { type: string }
 *     responses:
 *       200: { description: User list and total. }
 */
router.get("/users", requirePermission("view_users"), async (req, res) => {
    const page = parseInt(req.query.page) || 0;
    let pageSize = parseInt(req.query.limit) || 20;
    if (pageSize > 100) pageSize = 100;
    const search = req.query.search || "";
    const rankFilter = req.query.rank;

    try {
        const where = search
            ? {
                  OR: [
                      { username: { contains: search, mode: "insensitive" } },
                      { email: { contains: search, mode: "insensitive" } },
                  ],
              }
            : {};

        if (rankFilter) {
            where.rank = rankFilter;
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip: page * pageSize,
                take: pageSize,
                select: {
                    id: true,
                    username: true,
                    email: true,
                    rank: true,
                    credits: true,
                    vendorBalance: true,
                    createdAt: true,
                    lastOnline: true,
                    bannedUntil: true,
                    banReason: true,
                    adminRoles: true,
                    adminLevel: true,
                    customSplit: true,
                    hasBlueBadge: true,
                    customBadges: true,
                },
            }),
            prisma.user.count({ where }),
        ]);

        res.json({
            success: true,
            users,
            total,
            pages: Math.ceil(total / pageSize),
        });
    } catch (err) {
        res.status(500).json({ error: "User index failed." });
    }
});

// Bot: AWAITING_INFO_USERNAME
/**
 * @swagger
 * /api/admin/users/{username}/info:
 *   get:
 *     tags: [admin]
 *     summary: Detailed user dossier (shops, recent deposits, total orders).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: User dossier. }
 *       404: { description: User not found. }
 */
router.get(
    "/users/:username/info",
    requirePermission("view_users"),
    async (req, res) => {
        try {
            const user = await prisma.user.findFirst({
                where: {
                    username: {
                        equals: req.params.username,
                        mode: "insensitive",
                    },
                },
                include: {
                    shops: {
                        include: { _count: { select: { products: true } } },
                    },
                },
            });
            if (!user)
                return res.status(404).json({ error: "User not found." });

            const deposits = await prisma.cryptoDeposit.findMany({
                where: { userId: user.id },
                orderBy: { createdAt: "desc" },
                take: 10,
            });
            const orders = await prisma.order.count({
                where: { userId: user.id },
            });

            const { passwordHash, ...safeUser } = user;
            res.json({
                success: true,
                user: safeUser,
                recentDeposits: deposits,
                totalOrders: orders,
            });
        } catch (err) {
            res.status(500).json({ error: "Dossier extraction failed." });
        }
    },
);

// ═══════════════════════════════════════════════════
// 3. PAYMENT HISTORY  (Bot: AWAITING_PAY_USERNAME)
// ═══════════════════════════════════════════════════
/**
 * @swagger
 * /api/admin/users/{username}/payments:
 *   get:
 *     tags: [admin]
 *     summary: Recent crypto deposits for a given user (up to 20).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Deposits list. }
 *       404: { description: User not found. }
 */
router.get(
    "/users/:username/payments",
    requirePermission("view_users"),
    async (req, res) => {
        try {
            const user = await prisma.user.findFirst({
                where: {
                    username: {
                        equals: req.params.username,
                        mode: "insensitive",
                    },
                },
            });
            if (!user)
                return res.status(404).json({ error: "User not found." });

            const deposits = await prisma.cryptoDeposit.findMany({
                where: { userId: user.id },
                orderBy: { createdAt: "desc" },
                take: 20,
            });

            res.json({ success: true, username: user.username, deposits });
        } catch (err) {
            res.status(500).json({ error: "Payment history failed." });
        }
    },
);

// ═══════════════════════════════════════════════════
// 4. ADD BLT  (Bot: AWAITING_ADD_BLT_USER/AMT)
// ═══════════════════════════════════════════════════
/**
 * @swagger
 * /api/admin/users/{username}/credits/add:
 *   post:
 *     tags: [admin]
 *     summary: Credit BLT to a user's balance (audited).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount: { type: integer, minimum: 1 }
 *     responses:
 *       200: { description: Credits added. }
 *       400: { description: Invalid amount. }
 *       404: { description: User not found. }
 */
router.post(
    "/users/:username/credits/add",
    requirePermission("manage_credits"),
    async (req, res) => {
        const { amount } = req.body;
        const amt = parseInt(amount);
        if (isNaN(amt) || amt <= 0)
            return res.status(400).json({ error: "Invalid amount." });

        try {
            const user = await prisma.user.findFirst({
                where: {
                    username: {
                        equals: req.params.username,
                        mode: "insensitive",
                    },
                },
            });
            if (!user)
                return res.status(404).json({ error: "User not found." });

            await prisma.$transaction([
                prisma.user.update({
                    where: { id: user.id },
                    data: { credits: { increment: amt } },
                }),
                prisma.notification.create({
                    data: {
                        userId: user.id,
                        message: `The Administration has credited your account with <b>${amt} BLT</b>.`,
                        type: "BALANCE",
                        link: "/deposit-history",
                    },
                }),
            ]);

            await invalidateAuthState(user.id);
            await logAudit(
                req.user.id,
                req.user.username,
                "ADD_BLT",
                user.username,
                { amount: amt },
            );
            res.json({
                success: true,
                message: `Added ${amt} BLT to ${user.username}.`,
            });
        } catch (err) {
            res.status(500).json({ error: "Credit operation failed." });
        }
    },
);

// ═══════════════════════════════════════════════════
// 5. REDUCE BLT  (Bot: AWAITING_REDUCE_BLT_USER/AMT)
// ═══════════════════════════════════════════════════
/**
 * @swagger
 * /api/admin/users/{username}/credits/reduce:
 *   post:
 *     tags: [admin]
 *     summary: Debit BLT from a user's balance (audited).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount: { type: integer, minimum: 1 }
 *     responses:
 *       200: { description: Credits reduced. }
 *       400: { description: Invalid amount or insufficient credits. }
 *       404: { description: User not found. }
 */
router.post(
    "/users/:username/credits/reduce",
    requirePermission("manage_credits"),
    async (req, res) => {
        const { amount } = req.body;
        const amt = parseInt(amount);
        if (isNaN(amt) || amt <= 0)
            return res.status(400).json({ error: "Invalid amount." });

        try {
            const user = await prisma.user.findFirst({
                where: {
                    username: {
                        equals: req.params.username,
                        mode: "insensitive",
                    },
                },
            });
            if (!user)
                return res.status(404).json({ error: "User not found." });
            if (user.credits < amt)
                return res.status(400).json({ error: "Insufficient credits." });

            const safeBal = Math.max(0, user.credits - amt);
            await prisma.user.update({
                where: { id: user.id },
                data: { credits: safeBal },
            });
            await invalidateAuthState(user.id);
            await logAudit(
                req.user.id,
                req.user.username,
                "REDUCE_BLT",
                user.username,
                { amount: amt },
            );
            res.json({
                success: true,
                message: `Removed ${amt} BLT from ${user.username}.`,
            });
        } catch (err) {
            res.status(500).json({ error: "Credit operation failed." });
        }
    },
);

// ═══════════════════════════════════════════════════
// 6. CHANGE RANK  (Bot: AWAITING_RANK_USER + SET_RANK_*)
// ═══════════════════════════════════════════════════
const VALID_RANKS = [
    "USER",
    "STARTER",
    "PRO",
    "PREMIUM",
    "ENTERPRISE",
    "ADMIN",
];

/**
 * @swagger
 * /api/admin/users/{username}/rank:
 *   post:
 *     tags: [admin]
 *     summary: Change a user's rank. Granting ADMIN requires Owner role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rank]
 *             properties:
 *               rank:
 *                 type: string
 *                 enum: [USER, STARTER, PRO, PREMIUM, ENTERPRISE, ADMIN]
 *     responses:
 *       200: { description: Rank updated. }
 *       400: { description: Invalid rank. }
 *       403: { description: Only Owners can grant Admin. }
 *       404: { description: User not found. }
 */
router.post(
    "/users/:username/rank",
    requirePermission("change_rank"),
    async (req, res) => {
        const { rank } = req.body;
        if (!VALID_RANKS.includes(rank))
            return res.status(400).json({ error: "Invalid rank." });

        // Prevent privilege escalation: only Owner (role 0) can set ADMIN rank
        if (rank === "ADMIN") {
            const roles = parseAdminRoles(req.user.adminRoles);
            const isOwner =
                roles.includes(0) || (ALLOW_LEGACY_OWNER && roles.length === 0);
            if (!isOwner)
                return res
                    .status(403)
                    .json({ error: "Only Owners can grant Admin rank." });
        }

        try {
            const user = await prisma.user.findFirst({
                where: {
                    username: {
                        equals: req.params.username,
                        mode: "insensitive",
                    },
                },
            });
            if (!user)
                return res.status(404).json({ error: "User not found." });

            await prisma.user.update({
                where: { id: user.id },
                data: { rank },
            });
            await invalidateAuthState(user.id);
            await logAudit(
                req.user.id,
                req.user.username,
                "CHANGE_RANK",
                user.username,
                { rank },
            );

            res.json({
                success: true,
                message: `Rank set to ${rank} for ${user.username}.`,
            });
        } catch (err) {
            res.status(500).json({ error: "Rank update failed." });
        }
    },
);

// ═══════════════════════════════════════════════════
// 7. CHANGE SPLIT %  (Bot: AWAITING_PERCENT_USER/VAL)
// ═══════════════════════════════════════════════════
/**
 * @swagger
 * /api/admin/users/{username}/split:
 *   post:
 *     tags: [admin]
 *     summary: Set a custom vendor split (0.00-1.00) or clear it.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               split:
 *                 oneOf:
 *                   - { type: number, minimum: 0, maximum: 1 }
 *                   - { type: string, enum: [clear] }
 *                   - { type: "null" }
 *     responses:
 *       200: { description: Split updated. }
 *       400: { description: Invalid split. }
 *       404: { description: User not found. }
 */
router.post(
    "/users/:username/split",
    requirePermission("change_split"),
    async (req, res) => {
        const { split } = req.body; // null to clear, float 0-1 to set
        const val =
            split === null || split === "clear" ? null : parseFloat(split);

        if (val !== null && (isNaN(val) || val < 0 || val > 1)) {
            return res.status(400).json({
                error: "Split must be between 0.00 and 1.00, or null to reset.",
            });
        }

        try {
            const user = await prisma.user.findFirst({
                where: {
                    username: {
                        equals: req.params.username,
                        mode: "insensitive",
                    },
                },
            });
            if (!user)
                return res.status(404).json({ error: "User not found." });

            await prisma.user.update({
                where: { id: user.id },
                data: { customSplit: val },
            });
            await logAudit(
                req.user.id,
                req.user.username,
                "CHANGE_SPLIT",
                user.username,
                { split: val },
            );
            res.json({
                success: true,
                message:
                    val === null
                        ? "Split reset to default."
                        : `Split set to ${(val * 100).toFixed(0)}%.`,
            });
        } catch (err) {
            res.status(500).json({ error: "Split update failed." });
        }
    },
);

// ═══════════════════════════════════════════════════
// 8. SET ADMIN ROLES  (Bot: APPLY_ROLES)
// ═══════════════════════════════════════════════════
/**
 * @swagger
 * /api/admin/users/admin-roles:
 *   post:
 *     tags: [admin]
 *     summary: Apply admin role bitmap to a batch of ADMIN users.
 *     description: "Valid role ints: 0=Owner, 1=Co-Owner, 2=Moderator, 3=Support. Assigning 0 requires requester to be Owner."
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [usernames]
 *             properties:
 *               usernames: { type: array, items: { type: string } }
 *               roles: { type: array, items: { type: integer, enum: [0, 1, 2, 3] } }
 *     responses:
 *       200: { description: Roles applied. }
 *       400: { description: Missing usernames. }
 *       403: { description: Only Owners can assign Owner role. }
 */
router.post(
    "/users/admin-roles",
    requirePermission("set_admin_roles"),
    async (req, res) => {
        const { usernames, roles } = req.body; // roles: array of ints [0,1,2,3]

        if (!Array.isArray(usernames) || usernames.length === 0) {
            return res.status(400).json({ error: "Usernames array required." });
        }
        const validRoles = [0, 1, 2, 3];
        const cleanRoles = (roles || []).filter((r) => validRoles.includes(r));

        // Prevent assigning Owner (0) unless requester is also Owner
        if (cleanRoles.includes(0)) {
            const requesterRoles = parseAdminRoles(req.user.adminRoles);
            const isOwner =
                requesterRoles.includes(0) ||
                (ALLOW_LEGACY_OWNER && requesterRoles.length === 0);
            if (!isOwner) {
                return res
                    .status(403)
                    .json({ error: "Only Owners can assign Owner role." });
            }
        }

        try {
            const rolesStr = cleanRoles.join(",");
            const result = await prisma.user.updateMany({
                where: { username: { in: usernames }, rank: "ADMIN" },
                data: { adminRoles: rolesStr },
            });
            const affectedUsers = await prisma.user.findMany({
                where: { username: { in: usernames } },
                select: { id: true },
            });
            await Promise.all(
                affectedUsers.map((affectedUser) =>
                    invalidateAuthState(affectedUser.id),
                ),
            );
            await logAudit(
                req.user.id,
                req.user.username,
                "SET_ADMIN_ROLES",
                usernames.join(","),
                { roles: cleanRoles },
            );
            res.json({
                success: true,
                message: `Roles [${rolesStr}] applied to ${result.count} admins.`,
            });
        } catch (err) {
            res.status(500).json({ error: "Role assignment failed." });
        }
    },
);

// ═══════════════════════════════════════════════════
// 9. CREATE ADMIN  (Bot: ACTION_CREATE_ADMIN)
// ═══════════════════════════════════════════════════
/**
 * @swagger
 * /api/admin/create-admin:
 *   post:
 *     tags: [admin]
 *     summary: Create a new ADMIN account (seeded with credits and red name color).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, email, password]
 *             properties:
 *               username: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 12, description: Must include upper, lower, digit, and symbol. }
 *     responses:
 *       201: { description: Admin created. }
 *       400: { description: Invalid payload. }
 *       409: { description: Username or email already in use. }
 */
router.post(
    "/create-admin",
    requirePermission("create_admin"),
    async (req, res) => {
        const { username, email, password } = req.body;
        if (!username || !email || !password)
            return res.status(400).json({ error: "All fields required." });
        if (!isValidEmail(email))
            return res.status(400).json({ error: "Invalid email." });
        if (!isStrongPassword(password))
            return res.status(400).json({
                error: "Password must be 12+ chars with upper, lower, number, and special char.",
            });

        try {
            const existing = await prisma.user.findFirst({
                where: { OR: [{ username }, { email: email.toLowerCase() }] },
            });
            if (existing)
                return res
                    .status(409)
                    .json({ error: "Username or Email already in use." });

            const passwordHash = await bcrypt.hash(password, 12);
            const newAdmin = await prisma.user.create({
                data: {
                    username,
                    email: email.toLowerCase(),
                    passwordHash,
                    rank: "ADMIN",
                    credits: 999999,
                    nameColor: "#ef4444",
                    hasBlueBadge: true,
                },
            });

            await logAudit(
                req.user.id,
                req.user.username,
                "CREATE_ADMIN",
                username,
                { email },
            );
            res.status(201).json({
                success: true,
                message: `Admin '${username}' created successfully.`,
            });
        } catch (err) {
            res.status(500).json({ error: "Admin creation failed." });
        }
    },
);

// ═══════════════════════════════════════════════════
// 10. CHANGE PASSWORD  (Bot: AWAITING_PASS_USER/VAL)
// ═══════════════════════════════════════════════════
/**
 * @swagger
 * /api/admin/users/{username}/password:
 *   post:
 *     tags: [admin]
 *     summary: Administratively reset a user's password.
 *     description: Changing another admin's password requires Owner role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newPassword]
 *             properties:
 *               newPassword: { type: string, minLength: 12 }
 *     responses:
 *       200: { description: Password updated. }
 *       400: { description: Password not strong enough. }
 *       403: { description: Cannot change another admin's password. }
 *       404: { description: User not found. }
 */
router.post(
    "/users/:username/password",
    requirePermission("change_password"),
    async (req, res) => {
        const { newPassword } = req.body;
        if (!isStrongPassword(newPassword))
            return res.status(400).json({
                error: "Password must be 12+ chars with upper, lower, number, and special char.",
            });

        try {
            const user = await prisma.user.findFirst({
                where: {
                    username: {
                        equals: req.params.username,
                        mode: "insensitive",
                    },
                },
            });
            if (!user)
                return res.status(404).json({ error: "User not found." });

            // Prevent changing another admin's password unless Owner
            if (user.rank === "ADMIN" && user.id !== req.user.id) {
                const requesterRoles = parseAdminRoles(req.user.adminRoles);
                const isOwner =
                    requesterRoles.includes(0) || requesterRoles.length === 0;
                if (!isOwner)
                    return res.status(403).json({
                        error: "Cannot change another admin's password.",
                    });
            }

            const hash = await bcrypt.hash(newPassword, 12);
            await prisma.user.update({
                where: { id: user.id },
                data: { passwordHash: hash },
            });
            await logAudit(
                req.user.id,
                req.user.username,
                "CHANGE_PASSWORD",
                user.username,
                {},
            );
            res.json({
                success: true,
                message: `Password updated for ${user.username}.`,
            });
        } catch (err) {
            res.status(500).json({ error: "Password update failed." });
        }
    },
);

// ═══════════════════════════════════════════════════
// 11. CHANGE EMAIL  (Bot: AWAITING_MAIL_USER/VAL)
// ═══════════════════════════════════════════════════
/**
 * @swagger
 * /api/admin/users/{username}/email:
 *   post:
 *     tags: [admin]
 *     summary: Update a user's email address.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newEmail]
 *             properties:
 *               newEmail: { type: string, format: email }
 *     responses:
 *       200: { description: Email updated. }
 *       400: { description: Valid email required. }
 *       404: { description: User not found. }
 *       409: { description: Email already in use. }
 */
router.post(
    "/users/:username/email",
    requirePermission("change_email"),
    async (req, res) => {
        const { newEmail } = req.body;
        if (!isValidEmail(newEmail))
            return res.status(400).json({ error: "Valid email required." });

        try {
            const user = await prisma.user.findFirst({
                where: {
                    username: {
                        equals: req.params.username,
                        mode: "insensitive",
                    },
                },
            });
            if (!user)
                return res.status(404).json({ error: "User not found." });

            const emailTaken = await prisma.user.findUnique({
                where: { email: newEmail.toLowerCase() },
            });
            if (emailTaken && emailTaken.id !== user.id)
                return res.status(409).json({ error: "Email already in use." });

            await prisma.user.update({
                where: { id: user.id },
                data: { email: newEmail.toLowerCase() },
            });
            await logAudit(
                req.user.id,
                req.user.username,
                "CHANGE_EMAIL",
                user.username,
                { newEmail },
            );
            res.json({
                success: true,
                message: `Email updated for ${user.username}.`,
            });
        } catch (err) {
            res.status(500).json({ error: "Email update failed." });
        }
    },
);

// ═══════════════════════════════════════════════════
// 12. CHANGE USERNAME  (Bot: AWAITING_USER_USER/VAL)
// ═══════════════════════════════════════════════════
/**
 * @swagger
 * /api/admin/users/{username}/rename:
 *   post:
 *     tags: [admin]
 *     summary: Rename a user account.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newUsername]
 *             properties:
 *               newUsername: { type: string, minLength: 3 }
 *     responses:
 *       200: { description: Username updated. }
 *       400: { description: Username too short. }
 *       404: { description: User not found. }
 *       409: { description: Username already taken. }
 */
router.post(
    "/users/:username/rename",
    requirePermission("change_username"),
    async (req, res) => {
        const { newUsername } = req.body;
        if (!newUsername || newUsername.trim().length < 3)
            return res
                .status(400)
                .json({ error: "Username must be 3+ characters." });

        try {
            const user = await prisma.user.findFirst({
                where: {
                    username: {
                        equals: req.params.username,
                        mode: "insensitive",
                    },
                },
            });
            if (!user)
                return res.status(404).json({ error: "User not found." });

            const taken = await prisma.user.findFirst({
                where: {
                    username: { equals: newUsername, mode: "insensitive" },
                },
            });
            if (taken && taken.id !== user.id)
                return res
                    .status(409)
                    .json({ error: "Username already taken." });

            await prisma.user.update({
                where: { id: user.id },
                data: { username: newUsername.trim() },
            });
            await invalidateAuthState(user.id);
            await logAudit(
                req.user.id,
                req.user.username,
                "CHANGE_USERNAME",
                req.params.username,
                { newUsername },
            );
            res.json({
                success: true,
                message: `Username changed to ${newUsername}.`,
            });
        } catch (err) {
            res.status(500).json({ error: "Rename failed." });
        }
    },
);

// ═══════════════════════════════════════════════════
// 13. BAN USER  (Bot: AWAITING_BAN_USERNAME/DAYS/REASON)
// ═══════════════════════════════════════════════════
/**
 * @swagger
 * /api/admin/users/{username}/ban:
 *   post:
 *     tags: [admin]
 *     summary: Ban a non-admin user for N days with a reason.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [days, reason]
 *             properties:
 *               days: { type: integer, minimum: 1 }
 *               reason: { type: string }
 *     responses:
 *       200: { description: User banned. }
 *       400: { description: Invalid ban payload. }
 *       403: { description: Cannot ban admin users. }
 *       404: { description: User not found. }
 */
router.post(
    "/users/:username/ban",
    requirePermission("ban_user"),
    async (req, res) => {
        const { days, reason } = req.body;
        const numDays = parseInt(days);
        if (isNaN(numDays) || numDays <= 0)
            return res.status(400).json({ error: "Invalid ban duration." });
        if (!reason)
            return res.status(400).json({ error: "Ban reason required." });

        try {
            const user = await prisma.user.findFirst({
                where: {
                    username: {
                        equals: req.params.username,
                        mode: "insensitive",
                    },
                },
            });
            if (!user)
                return res.status(404).json({ error: "User not found." });
            if (user.rank === "ADMIN")
                return res
                    .status(403)
                    .json({ error: "Cannot ban admin users." });

            const expiry = new Date();
            expiry.setDate(expiry.getDate() + numDays);

            await prisma.user.update({
                where: { id: user.id },
                data: { bannedUntil: expiry, banReason: reason },
            });

            await invalidateAuthState(user.id);
            await logAudit(
                req.user.id,
                req.user.username,
                "BAN_USER",
                user.username,
                { days: numDays, reason, expiry },
            );
            res.json({
                success: true,
                message: `${user.username} banned until ${expiry.toLocaleDateString()}.`,
            });
        } catch (err) {
            res.status(500).json({ error: "Ban operation failed." });
        }
    },
);

// ═══════════════════════════════════════════════════
// 14. UNBAN USER  (Bot: AWAITING_UNBAN_USERNAME)
// ═══════════════════════════════════════════════════
/**
 * @swagger
 * /api/admin/users/{username}/unban:
 *   post:
 *     tags: [admin]
 *     summary: Remove an active ban from a user.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: User unbanned. }
 *       404: { description: User not found. }
 */
router.post(
    "/users/:username/unban",
    requirePermission("unban_user"),
    async (req, res) => {
        try {
            const user = await prisma.user.findFirst({
                where: {
                    username: {
                        equals: req.params.username,
                        mode: "insensitive",
                    },
                },
            });
            if (!user)
                return res.status(404).json({ error: "User not found." });

            await prisma.user.update({
                where: { id: user.id },
                data: { bannedUntil: null, banReason: null },
            });

            await invalidateAuthState(user.id);
            await logAudit(
                req.user.id,
                req.user.username,
                "UNBAN_USER",
                user.username,
                {},
            );
            res.json({
                success: true,
                message: `${user.username} has been unbanned.`,
            });
        } catch (err) {
            res.status(500).json({ error: "Unban operation failed." });
        }
    },
);

// ═══════════════════════════════════════════════════
// 15. ASSIGN BADGES  (Bot: BDG|BADGE|userId)
// ═══════════════════════════════════════════════════
const VALID_BADGES = ["DEV", "LGBTQ", "BUG_HUNTER", "GHOST"];

/**
 * @swagger
 * /api/admin/users/{username}/badges:
 *   post:
 *     tags: [admin]
 *     summary: Toggle a badge or clear all badges for a user.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               badge: { type: string, enum: [DEV, LGBTQ, BUG_HUNTER, GHOST] }
 *               action: { type: string, enum: [toggle, clear] }
 *     responses:
 *       200: { description: Badges updated. }
 *       400: { description: Invalid badge payload. }
 *       404: { description: User not found. }
 */
router.post(
    "/users/:username/badges",
    requirePermission("assign_badges"),
    async (req, res) => {
        const { badge, action } = req.body; // action: 'toggle' | 'clear'

        if (action !== "clear" && !VALID_BADGES.includes(badge)) {
            return res.status(400).json({
                error: `Invalid badge. Valid: ${VALID_BADGES.join(", ")}`,
            });
        }

        try {
            const user = await prisma.user.findFirst({
                where: {
                    username: {
                        equals: req.params.username,
                        mode: "insensitive",
                    },
                },
            });
            if (!user)
                return res.status(404).json({ error: "User not found." });

            let badgesArray = (user.customBadges || "")
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);

            if (action === "clear") {
                badgesArray = [];
            } else {
                if (badgesArray.includes(badge))
                    badgesArray = badgesArray.filter((b) => b !== badge);
                else badgesArray.push(badge);
            }

            const newBadgesStr =
                badgesArray.length > 0 ? badgesArray.join(",") : null;
            await prisma.user.update({
                where: { id: user.id },
                data: { customBadges: newBadgesStr },
            });
            await invalidateAuthState(user.id);
            await logAudit(
                req.user.id,
                req.user.username,
                "ASSIGN_BADGES",
                user.username,
                { badges: newBadgesStr },
            );
            res.json({
                success: true,
                badges: badgesArray,
                message: "Badges updated.",
            });
        } catch (err) {
            res.status(500).json({ error: "Badge update failed." });
        }
    },
);

// ═══════════════════════════════════════════════════
// 16. DISPUTES  (Bot: ACTION_CHECK_DISPUTES)
// ═══════════════════════════════════════════════════
/**
 * @swagger
 * /api/admin/disputes:
 *   get:
 *     tags: [admin]
 *     summary: List marketplace disputes filtered by status.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, default: OPEN }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200: { description: Disputes list. }
 */
router.get(
    "/disputes",
    requirePermission("view_disputes"),
    async (req, res) => {
        const status = req.query.status || "OPEN";
        const page = parseInt(req.query.page) || 0;

        try {
            const disputes = await prisma.dispute.findMany({
                where: status === "ALL" ? {} : { status },
                orderBy: { createdAt: "asc" },
                skip: page * 20,
                take: 20,
            });

            const total = await prisma.dispute.count({
                where: status === "ALL" ? {} : { status },
            });

            const buyerIds = [...new Set(disputes.map((d) => d.buyerId))];
            const vendorIds = [...new Set(disputes.map((d) => d.vendorId))];
            const [buyers, vendors] = await Promise.all([
                prisma.user.findMany({
                    where: { id: { in: buyerIds } },
                    select: { id: true, username: true },
                }),
                prisma.user.findMany({
                    where: { id: { in: vendorIds } },
                    select: { id: true, username: true },
                }),
            ]);

            const enriched = disputes.map((d) => ({
                ...d,
                buyerName:
                    buyers.find((u) => u.id === d.buyerId)?.username ||
                    "Unknown",
                vendorName:
                    vendors.find((u) => u.id === d.vendorId)?.username ||
                    "Unknown",
            }));

            res.json({ success: true, disputes: enriched, total });
        } catch (err) {
            res.status(500).json({ error: "Disputes fetch failed." });
        }
    },
);

// Bot: dispute resolve (APPROVE / REJECT) — already in server.js, this is admin panel proxy
/**
 * @swagger
 * /api/admin/disputes/{orderId}/resolve:
 *   post:
 *     tags: [admin]
 *     summary: Resolve a dispute from the admin panel by approving or rejecting refund.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action]
 *             properties:
 *               action: { type: string, enum: [APPROVE, REJECT] }
 *     responses:
 *       200: { description: Dispute finalized. }
 *       400: { description: Invalid action or already resolved. }
 *       404: { description: Dispute or order not found. }
 */
router.post(
    "/disputes/:orderId/resolve",
    requirePermission("resolve_disputes"),
    async (req, res) => {
        const { action } = req.body;
        if (!["APPROVE", "REJECT"].includes(action))
            return res.status(400).json({ error: "Invalid action." });

        try {
            const dispute = await prisma.dispute.findUnique({
                where: { orderId: req.params.orderId },
            });
            if (!dispute)
                return res.status(404).json({ error: "Dispute not found." });
            if (dispute.status !== "OPEN")
                return res
                    .status(400)
                    .json({ error: "Dispute already resolved." });

            const order = await prisma.order.findUnique({
                where: { id: req.params.orderId },
            });
            if (!order)
                return res
                    .status(404)
                    .json({ error: "Original order not found." });

            if (action === "APPROVE") {
                await prisma.$transaction([
                    prisma.user.update({
                        where: { id: dispute.buyerId },
                        data: { credits: { increment: order.pricePaid } },
                    }),
                    prisma.dispute.update({
                        where: { id: dispute.id },
                        data: {
                            status: "REFUND_APPROVED",
                            resolvedById: req.user.id,
                            resolvedByName: req.user.username,
                            resolvedAt: new Date(),
                        },
                    }),
                    prisma.disputeMessage.create({
                        data: {
                            disputeId: dispute.id,
                            senderId: req.user.id,
                            senderRank: "ADMIN_SYSTEM",
                            message:
                                "SYSTEM: Escrow REFUNDED to Buyer by Admin Panel.",
                        },
                    }),
                    prisma.user.update({
                        where: { id: req.user.id },
                        data: { casesClosed: { increment: 1 } },
                    }),
                ]);
            } else {
                await prisma.$transaction([
                    prisma.user.update({
                        where: { id: dispute.vendorId },
                        data: { vendorBalance: { increment: order.pricePaid } },
                    }),
                    prisma.dispute.update({
                        where: { id: dispute.id },
                        data: {
                            status: "REFUND_REJECTED",
                            resolvedById: req.user.id,
                            resolvedByName: req.user.username,
                            resolvedAt: new Date(),
                        },
                    }),
                    prisma.disputeMessage.create({
                        data: {
                            disputeId: dispute.id,
                            senderId: req.user.id,
                            senderRank: "ADMIN_SYSTEM",
                            message:
                                "SYSTEM: Refund DENIED. Thread Locked by Admin Panel.",
                        },
                    }),
                    prisma.user.update({
                        where: { id: req.user.id },
                        data: { casesClosed: { increment: 1 } },
                    }),
                ]);
            }

            await logAudit(
                req.user.id,
                req.user.username,
                `DISPUTE_${action}`,
                req.params.orderId,
                {},
            );
            res.json({
                success: true,
                message: `Dispute ${action === "APPROVE" ? "refunded" : "rejected"}.`,
            });
        } catch (err) {
            res.status(500).json({ error: "Dispute resolution failed." });
        }
    },
);

// ═══════════════════════════════════════════════════
// 17. SUPPORT TICKETS  (Bot: TICK_REPLY / TICK_CLOSE)
// ═══════════════════════════════════════════════════
/**
 * @swagger
 * /api/admin/tickets:
 *   get:
 *     tags: [admin]
 *     summary: List support tickets for moderation.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200: { description: Tickets list. }
 */
router.get("/tickets", requirePermission("view_tickets"), async (req, res) => {
    const status = req.query.status;
    const page = parseInt(req.query.page) || 0;

    try {
        const where = status && status !== "ALL" ? { status } : {};
        const [tickets, total] = await Promise.all([
            prisma.supportTicket.findMany({
                where,
                orderBy: { createdAt: "desc" },
                skip: page * 20,
                take: 20,
                include: { messages: { orderBy: { createdAt: "asc" } } },
            }),
            prisma.supportTicket.count({ where }),
        ]);

        const userIds = [...new Set(tickets.map((t) => t.userId))];
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, username: true },
        });

        const enriched = tickets.map((t) => ({
            ...t,
            username:
                users.find((u) => u.id === t.userId)?.username || "Unknown",
        }));

        res.json({ success: true, tickets: enriched, total });
    } catch (err) {
        res.status(500).json({ error: "Tickets fetch failed." });
    }
});

/**
 * @swagger
 * /api/admin/tickets/{id}/reply:
 *   post:
 *     tags: [admin]
 *     summary: Reply to a support ticket as admin and notify the user.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [message]
 *             properties:
 *               message: { type: string }
 *     responses:
 *       200: { description: Reply sent. }
 *       400: { description: Message missing or ticket closed. }
 *       404: { description: Ticket not found. }
 */
router.post(
    "/tickets/:id/reply",
    requirePermission("reply_tickets"),
    async (req, res) => {
        const { message } = req.body;
        if (!message)
            return res.status(400).json({ error: "Message required." });

        try {
            const ticket = await prisma.supportTicket.findUnique({
                where: { id: req.params.id },
            });
            if (!ticket)
                return res.status(404).json({ error: "Ticket not found." });
            if (ticket.status === "CLOSED")
                return res.status(400).json({ error: "Ticket is closed." });

            await prisma.$transaction([
                prisma.supportTicket.update({
                    where: { id: req.params.id },
                    data: {
                        status: "ANSWERED",
                        messages: {
                            create: {
                                senderId: req.user.id,
                                senderRank: "ADMIN",
                                message,
                            },
                        },
                    },
                }),
                prisma.notification.create({
                    data: {
                        userId: ticket.userId,
                        message: `Admin has replied to your Support Ticket #${req.params.id.substring(0, 8)}.`,
                        type: "TICKET",
                        link: "/support",
                    },
                }),
            ]);

            await logAudit(
                req.user.id,
                req.user.username,
                "TICKET_REPLY",
                req.params.id,
                {},
            );
            res.json({ success: true, message: "Reply sent." });
        } catch (err) {
            res.status(500).json({ error: "Reply failed." });
        }
    },
);

/**
 * @swagger
 * /api/admin/tickets/{id}/close:
 *   post:
 *     tags: [admin]
 *     summary: Close a support ticket.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Ticket closed. }
 */
router.post(
    "/tickets/:id/close",
    requirePermission("close_tickets"),
    async (req, res) => {
        try {
            await prisma.supportTicket.update({
                where: { id: req.params.id },
                data: { status: "CLOSED" },
            });
            await logAudit(
                req.user.id,
                req.user.username,
                "TICKET_CLOSE",
                req.params.id,
                {},
            );
            res.json({ success: true, message: "Ticket closed." });
        } catch (err) {
            res.status(500).json({ error: "Close failed." });
        }
    },
);

// ═══════════════════════════════════════════════════
// 18. ADVERTISEMENTS  (Bot: ACTION_MANAGE_ADS / VIEW_AD / DELETE_AD)
// ═══════════════════════════════════════════════════
/**
 * @swagger
 * /api/admin/ads:
 *   get:
 *     tags: [admin]
 *     summary: List all advertisement entries.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Ads list. }
 */
router.get("/ads", requirePermission("view_ads"), async (req, res) => {
    try {
        const ads = await prisma.advertisement.findMany({
            include: { vendor: { select: { username: true } } },
            orderBy: { createdAt: "desc" },
        });
        res.json({ success: true, ads });
    } catch (err) {
        res.status(500).json({ error: "Ads fetch failed." });
    }
});

/**
 * @swagger
 * /api/admin/ads/{id}:
 *   delete:
 *     tags: [admin]
 *     summary: Delete an advertisement by id.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Ad terminated. }
 */
router.delete("/ads/:id", requirePermission("delete_ads"), async (req, res) => {
    try {
        await prisma.advertisement.delete({ where: { id: req.params.id } });
        await logAudit(
            req.user.id,
            req.user.username,
            "DELETE_AD",
            req.params.id,
            {},
        );
        res.json({ success: true, message: "Ad terminated." });
    } catch (err) {
        res.status(500).json({ error: "Delete failed." });
    }
});

// ═══════════════════════════════════════════════════
// 19. WITHDRAWALS  (Bot: ACTION_CHECK_WITHDRAWALS / WD_PAY / WD_REJ)
// ═══════════════════════════════════════════════════
/**
 * @swagger
 * /api/admin/withdrawals:
 *   get:
 *     tags: [admin]
 *     summary: List withdrawal requests by status.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, default: PENDING }
 *     responses:
 *       200: { description: Withdrawals list. }
 */
router.get(
    "/withdrawals",
    requirePermission("view_withdrawals"),
    async (req, res) => {
        const status = req.query.status || "PENDING";
        try {
            const withdrawals = await prisma.withdrawal.findMany({
                where: status === "ALL" ? {} : { status },
                orderBy: { createdAt: "asc" },
                include: {
                    user: { select: { username: true, telegramChatId: true } },
                },
            });
            res.json({ success: true, withdrawals });
        } catch (err) {
            res.status(500).json({ error: "Withdrawals fetch failed." });
        }
    },
);

/**
 * @swagger
 * /api/admin/withdrawals/{id}/approve:
 *   post:
 *     tags: [admin]
 *     summary: Mark a pending withdrawal as SENT and notify vendor on Telegram.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Withdrawal marked SENT. }
 *       400: { description: Already handled or invalid. }
 */
router.post(
    "/withdrawals/:id/approve",
    requirePermission("approve_withdrawals"),
    async (req, res) => {
        try {
            const wd = await prisma.withdrawal.findUnique({
                where: { id: req.params.id },
                include: { user: true },
            });
            if (!wd || wd.status !== "PENDING")
                return res
                    .status(400)
                    .json({ error: "Already handled or invalid." });

            await prisma.withdrawal.update({
                where: { id: wd.id },
                data: { status: "SENT" },
            });

            // Notify vendor via Telegram if they have a chatId
            if (wd.user?.telegramChatId) {
                const vText = `<b>[ 💸 PAYMENT DISPATCHED ]</b>\n\nYour withdrawal of <b>$${wd.amount.toFixed(2)}</b> over <b>${wd.network}</b> has been paid by Silverbullet Administration.`;
                fetch(
                    `https://api.telegram.org/bot${VENDOR_BOT_TOKEN}/sendMessage`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            chat_id: wd.user.telegramChatId,
                            text: vText,
                            parse_mode: "HTML",
                        }),
                    },
                ).catch(() => {});
            }

            await logAudit(
                req.user.id,
                req.user.username,
                "WITHDRAWAL_APPROVE",
                wd.id,
                { amount: wd.amount, network: wd.network },
            );
            res.json({ success: true, message: "Withdrawal marked as SENT." });
        } catch (err) {
            res.status(500).json({ error: "Approval failed." });
        }
    },
);

/**
 * @swagger
 * /api/admin/withdrawals/{id}/reject:
 *   post:
 *     tags: [admin]
 *     summary: Reject a pending withdrawal and refund vendor balance.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Withdrawal rejected and refunded. }
 *       400: { description: Already handled or invalid. }
 */
router.post(
    "/withdrawals/:id/reject",
    requirePermission("approve_withdrawals"),
    async (req, res) => {
        try {
            const wd = await prisma.withdrawal.findUnique({
                where: { id: req.params.id },
                include: { user: true },
            });
            if (!wd || wd.status !== "PENDING")
                return res
                    .status(400)
                    .json({ error: "Already handled or invalid." });

            await prisma.$transaction([
                prisma.withdrawal.update({
                    where: { id: wd.id },
                    data: { status: "REJECTED" },
                }),
                prisma.user.update({
                    where: { id: wd.userId },
                    data: { vendorBalance: { increment: wd.amount } },
                }),
            ]);

            await logAudit(
                req.user.id,
                req.user.username,
                "WITHDRAWAL_REJECT",
                wd.id,
                { amount: wd.amount },
            );
            res.json({
                success: true,
                message: "Withdrawal rejected and balance refunded.",
            });
        } catch (err) {
            res.status(500).json({ error: "Rejection failed." });
        }
    },
);

// ═══════════════════════════════════════════════════
// 20. CUSTOM REQUESTS  (Bot: APPROVEREQ / REJECTREQ)
// ═══════════════════════════════════════════════════
/**
 * @swagger
 * /api/admin/requests:
 *   get:
 *     tags: [admin]
 *     summary: List custom requests by status.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, default: PENDING }
 *     responses:
 *       200: { description: Requests list. }
 */
router.get(
    "/requests",
    requirePermission("approve_requests"),
    async (req, res) => {
        const status = req.query.status || "PENDING";
        try {
            const requests = await prisma.customRequest.findMany({
                where: status === "ALL" ? {} : { status },
                include: { user: { select: { username: true } } },
                orderBy: { createdAt: "desc" },
            });
            res.json({ success: true, requests });
        } catch (err) {
            res.status(500).json({ error: "Requests fetch failed." });
        }
    },
);

/**
 * @swagger
 * /api/admin/requests/{id}/approve:
 *   post:
 *     tags: [admin]
 *     summary: Approve and publish a custom request.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Request approved. }
 */
router.post(
    "/requests/:id/approve",
    requirePermission("approve_requests"),
    async (req, res) => {
        try {
            await prisma.customRequest.update({
                where: { id: req.params.id },
                data: { status: "APPROVED" },
            });
            await logAudit(
                req.user.id,
                req.user.username,
                "REQUEST_APPROVE",
                req.params.id,
                {},
            );
            res.json({
                success: true,
                message: "Request approved and published.",
            });
        } catch (err) {
            res.status(500).json({ error: "Approval failed." });
        }
    },
);

/**
 * @swagger
 * /api/admin/requests/{id}/reject:
 *   post:
 *     tags: [admin]
 *     summary: Reject a custom request.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Request rejected. }
 */
router.post(
    "/requests/:id/reject",
    requirePermission("approve_requests"),
    async (req, res) => {
        try {
            await prisma.customRequest.update({
                where: { id: req.params.id },
                data: { status: "REJECTED" },
            });
            await logAudit(
                req.user.id,
                req.user.username,
                "REQUEST_REJECT",
                req.params.id,
                {},
            );
            res.json({ success: true, message: "Request rejected." });
        } catch (err) {
            res.status(500).json({ error: "Rejection failed." });
        }
    },
);

// ═══════════════════════════════════════════════════
// 21. AUDIT LOG  (Admin panel exclusive)
// ═══════════════════════════════════════════════════
/**
 * @swagger
 * /api/admin/audit:
 *   get:
 *     tags: [admin]
 *     summary: Read paginated audit logs.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 0 }
 *     responses:
 *       200: { description: Audit logs. }
 *       503: { description: Audit engine unavailable. }
 */
router.get("/audit", requirePermission("view_audit"), async (req, res) => {
    const page = parseInt(req.query.page) || 0;
    try {
        const { logs, total, error } = await getAuditLogs(prisma, {
            page,
            pageSize: 50,
        });
        if (error) {
            logger.error("[AUDIT LOG ERROR]", error);
            return res
                .status(503)
                .json({ error: `Audit Engine Offline: ${error}` });
        }
        res.json({ success: true, logs, total });
    } catch (err    ) {
        logger.error()
        res.status(500).json({ error: "Audit log fetch failed." });
    }
});

// ═══════════════════════════════════════════════════
// 22. SELF: my permissions
// ═══════════════════════════════════════════════════
/**
 * @swagger
 * /api/admin/me/permissions:
 *   get:
 *     tags: [admin]
 *     summary: Return current admin role ids, role names and computed permissions.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Permission matrix for current admin. }
 */
router.get("/me/permissions", async (req, res) => {
    const roles = parseAdminRoles(req.user.adminRoles);
    const permissions = computePermissions(req.user.rank, req.user.adminRoles);

    const ROLE_NAMES = {
        0: "Owner",
        1: "Co-Owner",
        2: "Moderator",
        3: "Support",
    };
    const roleNames =
        roles.length === 0
            ? ["Owner"]
            : roles.map((r) => ROLE_NAMES[r] || `Role ${r}`);

    res.json({ success: true, roles, roleNames, permissions });
});// ═══════════════════════════════════════════════════
// 23. GLOBAL SYSTEM SETTINGS (Banner)
// ═══════════════════════════════════════════════════
/**
 * @swagger
 * /api/admin/settings/banner:
 *   get:
 *     tags: [admin]
 *     summary: Get global banner settings
 *     security:
 *       - bearerAuth: []
 *   put:
 *     tags: [admin]
 *     summary: Update global banner settings
 *     security:
 *       - bearerAuth: []
 */
router.get("/settings/banner", async (req, res) => {
    try {
        let settings = await prisma.systemSettings.findUnique({
            where: { id: "global" },
        });

        if (!settings) {
            settings = {
                bannerActive: false,
                bannerMessage: "",
                bannerColor: "bg-indigo-600",
            };
        }

        res.json({ success: true, settings });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch banner settings." });
    }
});

router.put("/settings/banner", async (req, res) => {
    const { active, message, color } = req.body;

    try {
        const settings = await prisma.systemSettings.upsert({
            where: { id: "global" },
            update: {
                bannerActive: Boolean(active),
                bannerMessage: String(message || ""),
                bannerColor: String(color || "bg-indigo-600"),
            },
            create: {
                id: "global",
                bannerActive: Boolean(active),
                bannerMessage: String(message || ""),
                bannerColor: String(color || "bg-indigo-600"),
            },
        });

        await logAudit(
            req.user.id,
            req.user.username,
            "UPDATE_BANNER",
            "GLOBAL",
            { active, message, color }
        );

        res.json({ success: true, message: "Banner settings updated.", settings });
    } catch (err) {
        res.status(500).json({ error: "Failed to update banner settings." });
    }
});

module.exports = router;

