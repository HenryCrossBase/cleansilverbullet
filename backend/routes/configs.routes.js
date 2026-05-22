const express = require("express");
const { validate } = require("../validators/middleware");
const { configsValidators } = require("../validators/configs.validator");
const { configsResponse } = require("../models/responses/configs.response");
const { authenticateToken, prisma } = require("./shared");

const router = express.Router();

/**
 * @swagger
 * /api/configs:
 *   get:
 *     tags: [configs]
 *     summary: List admin-published configs (latest activity first).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 50, maximum: 100 }
 *     responses:
 *       200:
 *         description: Configs list.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ConfigsResponse'
 */
router.get(
    "/",
    authenticateToken,
    ...validate(configsValidators.listQuery),
    async (req, res) => {
        try {
            const limit = Math.min(
                100,
                Math.max(1, parseInt(req.query.limit, 10) || 50),
            );
            const rawConfigs = await prisma.adminConfig.findMany({
                orderBy: { createdAt: "desc" },
                take: limit,
                select: {
                    id: true,
                    title: true,
                    description: true,
                    fileName: true,
                    fileSize: true,
                    adminName: true,
                    createdAt: true,
                },
            });

            const configIds = rawConfigs.map((c) => c.id);
            const ratingGroups = configIds.length
                ? await prisma.configRating.groupBy({
                      by: ["configId"],
                      where: { configId: { in: configIds } },
                      _max: { createdAt: true },
                  })
                : [];

            const latestRatingByConfig = ratingGroups.reduce((acc, group) => {
                acc[group.configId] = group._max.createdAt;
                return acc;
            }, {});

            const configs = rawConfigs.map((config) => {
                const latestRating = latestRatingByConfig[config.id];
                const latestAction = latestRating
                    ? new Date(latestRating).getTime()
                    : new Date(config.createdAt).getTime();
                return { ...config, latestAction };
            });

            configs.sort((a, b) => b.latestAction - a.latestAction);

            res.json(configsResponse.configs(configs));
        } catch (err) {
            res.status(500).json({
                error: "DB Index Error: Configs temporarily unavailable.",
            });
        }
    },
);

const multer = require("multer");
const path = require("path");
const fs = require("fs");

const downloadDir = path.join(__dirname, "../downloads");
if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, downloadDir);
    },
    filename: (req, file, cb) => {
        const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "");
        cb(null, `${Date.now()}_${safeName}`);
    }
});

const upload = multer({ 
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (req, file, cb) => {
        if (!file.originalname.endsWith(".espk") && !file.originalname.endsWith(".svb")) {
            return cb(new Error("Only .espk and .svb files are allowed"));
        }
        cb(null, true);
    }
});

/**
 * @swagger
 * /api/configs/create:
 *   post:
 *     tags: [configs]
 *     summary: Create a new config with file upload (ADMIN ONLY)
 *     security:
 *       - bearerAuth: []
 */
function requireAdminForUpload(req, res, next) {
    if (!req.user || req.user.rank !== "ADMIN") {
        return res.status(403).json({ error: "Unauthorized. Admin access required." });
    }
    next();
}

router.post(
    "/create",
    authenticateToken,
    requireAdminForUpload,
    upload.single("configFile"),
    async (req, res) => {
        try {
            const { title, description } = req.body;
            if (!title || !description || !req.file) {
                if (req.file) {
                    // Clean up if any of the other fields were missing.
                    fs.promises.unlink(req.file.path).catch(() => {});
                }
                return res.status(400).json({ error: "Missing required fields or file." });
            }

            const newConfig = await prisma.adminConfig.create({
                data: {
                    title,
                    description,
                    fileName: req.file.filename,
                    fileSize: req.file.size,
                    adminName: req.user.username,
                },
            });

            res.status(201).json({ success: true, config: newConfig });
        } catch (err) {
            if (req.file) fs.promises.unlink(req.file.path).catch(() => {});
            console.error(err);
            // Generic message — don't leak err.message which can include internal paths.
            res.status(500).json({ error: "Failed to create config." });
        }
    }
);

/**
 * @swagger
 * /api/configs/{id}:
 *   delete:
 *     tags: [configs]
 *     summary: Delete a config (ADMIN ONLY)
 *     security:
 *       - bearerAuth: []
 */
router.delete(
    "/:id",
    authenticateToken,
    async (req, res) => {
        try {
            if (req.user.rank !== "ADMIN") {
                return res.status(403).json({ error: "Unauthorized. Admin access required." });
            }

            const config = await prisma.adminConfig.findUnique({
                where: { id: req.params.id },
            });

            if (!config) {
                return res.status(404).json({ error: "Config not found." });
            }

            const fs = require("fs");
            const path = require("path");
            const filePath = path.join(__dirname, "../downloads", config.fileName);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            await prisma.configRating.deleteMany({
                where: { configId: req.params.id }
            });

            await prisma.threadLike.deleteMany({
                where: { configId: req.params.id }
            });

            await prisma.adminConfig.delete({
                where: { id: req.params.id },
            });

            res.json({ success: true, message: "Config deleted successfully." });
        } catch (err) {
            console.error(err);
            res.status(500).json({ error: "Failed to delete config." });
        }
    }
);

/**
 * @swagger
 * /api/configs/{id}:
 *   get:
 *     tags: [configs]
 *     summary: Get a config thread with all ratings and likes.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Config thread.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ThreadWithRepliesResponse'
 *       404:
 *         description: Config not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
    "/:id",
    authenticateToken,
    ...validate(configsValidators.configIdParam),
    async (req, res) => {
        try {
            const config = await prisma.adminConfig.findUnique({
                where: { id: req.params.id },
            });
            if (!config)
                return res.status(404).json({ error: "Config not found." });

            const adminUser = await prisma.user.findUnique({
                where: { username: config.adminName },
            });

            const threadData = {
                ...config,
                author: {
                    username: config.adminName,
                    rank: adminUser ? adminUser.rank : "ADMIN",
                    avatarUrl: adminUser ? adminUser.avatarUrl : "/default-avatar.png",
                    posts: adminUser ? 0 : 0, // Fallbacks if you don't track posts
                    threads: adminUser ? 0 : 0, 
                    credits: adminUser ? adminUser.credits : 0,
                    joined: adminUser ? new Date(adminUser.createdAt).toISOString() : new Date().toISOString(),
                },
            };

            const ratings = await prisma.configRating.findMany({
                where: { configId: req.params.id },
            });
            const likes = await prisma.threadLike.findMany({
                where: { configId: req.params.id },
            });

            const userIds = [
                ...new Set([
                    ...ratings.map((r) => r.userId),
                    ...likes.map((l) => l.userId),
                ]),
            ];

            const users = await prisma.user.findMany({
                where: { id: { in: userIds } },
                select: {
                    id: true,
                    username: true,
                    rank: true,
                    avatarUrl: true,
                    credits: true,
                    createdAt: true,
                },
            });

            const replies = userIds
                .map((uid) => {
                    const user = users.find((u) => u.id === uid);
                    const ratingObj = ratings.find((r) => r.userId === uid);
                    const likeObj = likes.find((l) => l.userId === uid);
                    const timestamp = ratingObj
                        ? ratingObj.createdAt
                        : likeObj
                          ? likeObj.createdAt
                          : new Date();

                    return {
                        id: ratingObj ? ratingObj.id : likeObj?.id || uid,
                        user,
                        score: ratingObj ? ratingObj.score : 0,
                        hasLiked: !!likeObj,
                        createdAt: timestamp,
                    };
                })
                .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); // Sort oldest replies first

            res.json(configsResponse.thread(threadData, replies));
        } catch (err) {
            res.status(500).json({ error: "Database mapping failed." });
        }
    },
);

/**
 * @swagger
 * /api/configs/{id}/rate:
 *   post:
 *     tags: [configs]
 *     summary: Rate a config from 1 to 5 (daily limits by rank).
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
 *             required: [score]
 *             properties:
 *               score: { type: integer, minimum: 1, maximum: 5 }
 *     responses:
 *       200:
 *         description: Rating stored.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       400:
 *         description: Invalid rating dimension.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Daily rating limit reached.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
    "/:id/rate",
    authenticateToken,
    ...validate([
        ...configsValidators.configIdParam,
        ...configsValidators.rateBody,
    ]),
    async (req, res) => {
        const { score } = req.body;
        if (!score || score < 1 || score > 5)
            return res.status(400).json({ error: "Invalid rating dimension." });

        try {
            let limit = 3;
            if (req.user.rank === "STARTER") limit = 5;
            else if (
                ["PRO", "PREMIUM", "ENTERPRISE", "ADMIN"].includes(
                    req.user.rank,
                )
            )
                limit = Infinity;

            if (limit !== Infinity) {
                const startOfDay = new Date();
                startOfDay.setHours(0, 0, 0, 0);
                const dailyCount = await prisma.configRating.count({
                    where: {
                        userId: req.user.id,
                        createdAt: { gte: startOfDay },
                    },
                });
                if (dailyCount >= limit) {
                    return res.status(403).json({
                        error: `Limited to ${limit} interactions per day. Please upgrade to unlock.`,
                    });
                }
            }

            const existing = await prisma.configRating.findUnique({
                where: {
                    configId_userId: {
                        configId: req.params.id,
                        userId: req.user.id,
                    },
                },
            });

            if (existing) {
                await prisma.configRating.update({
                    where: { id: existing.id },
                    data: { score },
                });
            } else {
                await prisma.configRating.create({
                    data: {
                        configId: req.params.id,
                        userId: req.user.id,
                        score,
                    },
                });
            }

            res.json(configsResponse.rated());
        } catch (err) {
            res.status(500).json({ error: "Rating execution failed." });
        }
    },
);

/**
 * @swagger
 * /api/configs/{id}/like:
 *   post:
 *     tags: [configs]
 *     summary: Like a config thread (daily limits by rank).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Like recorded.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       403:
 *         description: Daily like limit reached.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
    "/:id/like",
    authenticateToken,
    ...validate(configsValidators.configIdParam),
    async (req, res) => {
        try {
            let limit = 3;
            if (req.user.rank === "STARTER") limit = 5;
            else if (
                ["PRO", "PREMIUM", "ENTERPRISE", "ADMIN"].includes(
                    req.user.rank,
                )
            )
                limit = Infinity;

            if (limit !== Infinity) {
                const startOfDay = new Date();
                startOfDay.setHours(0, 0, 0, 0);
                const dailyCount = await prisma.threadLike.count({
                    where: {
                        userId: req.user.id,
                        createdAt: { gte: startOfDay },
                    },
                });
                if (dailyCount >= limit) {
                    return res.status(403).json({
                        error: `Limited to ${limit} interactions per day. Please upgrade to unlock.`,
                    });
                }
            }

            const existingLike = await prisma.threadLike.findUnique({
                where: {
                    configId_userId: {
                        configId: req.params.id,
                        userId: req.user.id,
                    },
                },
            });

            if (!existingLike) {
                await prisma.threadLike.create({
                    data: { configId: req.params.id, userId: req.user.id },
                });
            }
            res.json(configsResponse.liked());
        } catch (err) {
            res.status(500).json({ error: "Like Execution Failed." });
        }
    },
);

/**
 * @swagger
 * /api/configs/{id}/status:
 *   get:
 *     tags: [configs]
 *     summary: Get user-specific unlock, rating and like state for a config.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Config status for the authenticated user.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/GenericObjectResponse'
 *       404:
 *         description: Config vanished.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
    "/:id/status",
    authenticateToken,
    ...validate(configsValidators.configIdParam),
    async (req, res) => {
        try {
            const config = await prisma.adminConfig.findUnique({
                where: { id: req.params.id },
            });
            if (!config)
                return res.status(404).json({ error: "Config vanished." });

            const diffMinutes =
                (new Date().getTime() - new Date(config.createdAt).getTime()) /
                1000 /
                60;
            const isEarlyAccessBlocked =
                diffMinutes < 15 && ["USER", "STARTER"].includes(req.user.rank);

            const userRating = await prisma.configRating.findUnique({
                where: {
                    configId_userId: {
                        configId: req.params.id,
                        userId: req.user.id,
                    },
                },
            });

            const userLike = await prisma.threadLike.findUnique({
                where: {
                    configId_userId: {
                        configId: req.params.id,
                        userId: req.user.id,
                    },
                },
            });

            const allRatings = await prisma.configRating.findMany({
                where: { configId: req.params.id },
            });

            let average = 0;
            if (allRatings.length > 0) {
                average =
                    allRatings.reduce((acc, curr) => acc + curr.score, 0) /
                    allRatings.length;
            }

            res.json(
                configsResponse.status({
                    isUnlocked:
                        !!(userRating && userLike) || req.user.rank === "ADMIN", // Require BOTH!
                    hasLiked: !!userLike,
                    hasRated: !!userRating,
                    averageScore: average.toFixed(1),
                    totalRatings: allRatings.length,
                    earlyAccessBlocked: isEarlyAccessBlocked,
                    timeRemaining: isEarlyAccessBlocked
                        ? Math.ceil(15 - diffMinutes)
                        : 0,
                }),
            );
        } catch (err) {
            res.status(500).json({ error: "Firewall ping failed." });
        }
    },
);

module.exports = { path: "/api/configs", router };
