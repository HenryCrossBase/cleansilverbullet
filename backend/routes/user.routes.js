const express = require("express");
const otplib = require("otplib");
const qrcode = require("qrcode");
const { validate } = require("../validators/middleware");
const { userValidators } = require("../validators/user.validator");
const { userResponse } = require("../models/responses/user.response");
const {
    authenticateToken,
    invalidateAuthState,
    prisma,
    bcrypt,
    argon2,
    jwt,
    avatarUpload,
    isSafeHttpUrl,
    LAST_ONLINE_SYNC_MS,
    lastOnlineTouch,
} = require("./shared");

const { JWT_SECRET } = require("../env");

const router = express.Router();

/**
 * @swagger
 * /api/user/me:
 *   get:
 *     tags: [user]
 *     summary: Return the authenticated user's profile (without password hash).
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse'
 *       404:
 *         description: User not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/me", authenticateToken, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
        });
        if (!user) return res.status(404).json({ error: "User not found." });

        const lastTouch = lastOnlineTouch.get(user.id) || 0;
        const now = Date.now();
        if (now - lastTouch > LAST_ONLINE_SYNC_MS) {
            lastOnlineTouch.set(user.id, now);
            prisma.user
                .update({
                    where: { id: user.id },
                    data: { lastOnline: new Date() },
                })
                .catch(() => {});
        }

        const { passwordHash, ...safeUser } = user;
        res.json(userResponse.me(safeUser));
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch user profile." });
    }
});

/**
 * @swagger
 * /api/user/notifications:
 *   get:
 *     tags: [user]
 *     summary: List the most recent 20 notifications for the caller.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NotificationsResponse'
 */
router.get("/notifications", authenticateToken, async (req, res) => {
    try {
        const notifications = await prisma.notification.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: "desc" },
            take: 20,
        });
        res.json(userResponse.notifications(notifications));
    } catch (err) {
        res.status(500).json({ error: "Notification fetch failed." });
    }
});

/**
 * @swagger
 * /api/user/notifications/{id}/read:
 *   post:
 *     tags: [user]
 *     summary: Mark a notification as read.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Notification updated.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       403:
 *         description: Unauthorized.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
    "/notifications/:id/read",
    authenticateToken,
    ...validate(userValidators.notificationIdParam),
    async (req, res) => {
        try {
            const notif = await prisma.notification.findUnique({
                where: { id: req.params.id },
            });
            if (!notif || notif.userId !== req.user.id)
                return res.status(403).json({ error: "Unauthorized" });

            await prisma.notification.update({
                where: { id: req.params.id },
                data: { read: true },
            });
            res.json(userResponse.actionSuccess(undefined));
        } catch (err) {
            res.status(500).json({ error: "Read update failed." });
        }
    },
);

/**
 * @swagger
 * /api/user/notifications/{id}:
 *   delete:
 *     tags: [user]
 *     summary: Delete a notification owned by the caller.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Deleted.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       403:
 *         description: Unauthorized.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete(
    "/notifications/:id",
    authenticateToken,
    ...validate(userValidators.notificationIdParam),
    async (req, res) => {
        try {
            const notif = await prisma.notification.findUnique({
                where: { id: req.params.id },
            });
            if (!notif || notif.userId !== req.user.id)
                return res.status(403).json({ error: "Unauthorized" });

            await prisma.notification.delete({
                where: { id: req.params.id },
            });
            res.json(userResponse.actionSuccess(undefined));
        } catch (err) {
            res.status(500).json({ error: "Deletion failed." });
        }
    },
);

/**
 * @swagger
 * /api/user/profile/{username}:
 *   get:
 *     tags: [user]
 *     summary: Public profile dossier for a given username (unauthenticated).
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Public profile.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfileResponse'
 *       404:
 *         description: User not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
    "/profile/:username",
    ...validate(userValidators.usernameParam),
    async (req, res) => {
        try {
            const user = await prisma.user.findUnique({
                where: { username: req.params.username },
                select: {
                    id: true,
                    username: true,
                    rank: true,
                    avatarUrl: true,
                    bio: true,
                    createdAt: true,
                    lastOnline: true,
                    nameColor: true,
                    nameEffect: true,
                    hasBlueBadge: true,
                    casesClosed: true,
                    customBadges: true,
                },
            });
            if (!user)
                return res.status(404).json({ error: "User not found." });
            const stats = {
                injectedRatings: 0,
                threadLikes: 0,
                totalThreads: 0,
            };

            res.json(userResponse.profile(user, stats));
        } catch (err) {
            res.status(500).json({
                error: "Failed to compile dossier schema.",
            });
        }
    },
);

/**
 * @swagger
 * /api/user/change-username:
 *   post:
 *     tags: [user]
 *     summary: Change the authenticated user's username (costs 200 BLT unless admin).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [newUsername]
 *             properties:
 *               newUsername: { type: string }
 *     responses:
 *       200:
 *         description: Username changed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       400:
 *         description: Insufficient credits or name taken.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
    "/change-username",
    authenticateToken,
    ...validate(userValidators.changeUsername),
    async (req, res) => {
        const { newUsername } = req.body;
        try {
            const user = await prisma.user.findUnique({
                where: { id: req.user.id },
            });
            const isAdmin = user.rank === "ADMIN";
            if (!isAdmin && user.credits < 200) {
                return res.status(400).json({
                    error: "Insufficient Bullets. 200 USD required.",
                });
            }

            const nameExists = await prisma.user.findUnique({
                where: { username: newUsername },
            });
            if (nameExists) {
                return res.status(400).json({
                    error: "That identity is already claimed by another user.",
                });
            }

            const dataPayload = { username: newUsername };
            if (!isAdmin) dataPayload.credits = user.credits - 200;

            await prisma.user.update({
                where: { id: req.user.id },
                data: dataPayload,
            });

            await invalidateAuthState(req.user.id);

            res.json(
                userResponse.actionSuccess("Username successfully changed."),
            );
        } catch (err) {
            res.status(500).json({ error: "Failed to change identity." });
        }
    },
);

/**
 * @swagger
 * /api/user/change-password:
 *   post:
 *     tags: [user]
 *     summary: Change the authenticated user's password.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [oldPassword, newPassword]
 *             properties:
 *               oldPassword: { type: string }
 *               newPassword: { type: string, minLength: 6 }
 *     responses:
 *       200:
 *         description: Credentials rotated.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       401:
 *         description: Current password invalid.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
const rateLimit = require("express-rate-limit");
const changePasswordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 6,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many password change attempts. Please wait." },
});

router.post(
    "/change-password",
    authenticateToken,
    changePasswordLimiter,
    ...validate(userValidators.changePassword),
    async (req, res) => {
        const { oldPassword, newPassword } = req.body;
        if (!oldPassword || !newPassword)
            return res
                .status(400)
                .json({ error: "Invalid transmission payload." });

        try {
            const user = await prisma.user.findUnique({
                where: { id: req.user.id },
            });
            if (!user)
                return res
                    .status(404)
                    .json({ error: "User identity fragmented." });

            const isBcrypt = user.passwordHash.startsWith("$2");
            let isMatch = false;

            if (isBcrypt) {
                isMatch = await bcrypt.compare(oldPassword, user.passwordHash);
            } else {
                try {
                    isMatch = await argon2.verify(user.passwordHash, oldPassword);
                } catch (e) {
                    isMatch = false;
                }
            }

            if (!isMatch)
                return res
                    .status(401)
                    .json({ error: "Current Master Key is invalid." });

            const strong = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,64}$/;
            if (typeof newPassword !== "string" || !strong.test(newPassword)) {
                return res.status(400).json({
                    error: "Password must be 8-64 chars, with upper, digit, and symbol.",
                });
            }

            const updatedHash = await argon2.hash(newPassword);
            await prisma.user.update({
                where: { id: req.user.id },
                data: {
                    passwordHash: updatedHash,
                    passwordChangedAt: new Date(),
                },
            });
            await invalidateAuthState(req.user.id);

            res.json(
                userResponse.actionSuccess(
                    "Security credentials actively rotated. All other sessions have been logged out.",
                ),
            );
        } catch (err) {
            res.status(500).json({ error: "Internal Security Error." });
        }
    },
);

/**
 * @swagger
 * /api/user/avatar:
 *   post:
 *     tags: [user]
 *     summary: Upload a new avatar image (multipart).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Avatar updated.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       400:
 *         description: Invalid file.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/avatar", authenticateToken, (req, res) => {
    avatarUpload(req, res, async (err) => {
        if (err) return res.status(400).json({ error: err.message });
        if (!req.file)
            return res.status(400).json({ error: "No avatar file provided." });

        try {
            const avatarUrl = `uploads/${req.file.filename}`;
            await prisma.user.update({
                where: { id: req.user.id },
                data: { avatarUrl },
            });
            res.json(
                userResponse.actionSuccess(undefined, {
                    avatarUrl,
                }),
            );
        } catch (dbErr) {
            res.status(500).json({
                error: "Failed to assign avatar to database.",
            });
        }
    });
});

/**
 * @swagger
 * /api/user/avatar-url:
 *   post:
 *     tags: [user]
 *     summary: Set or clear the avatar URL (must be http/https).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               avatarUrl: { type: string, format: uri, nullable: true }
 *     responses:
 *       200:
 *         description: Avatar URL updated.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       400:
 *         description: Invalid URL.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
    "/avatar-url",
    authenticateToken,
    ...validate(userValidators.avatarUrl),
    async (req, res) => {
        const { avatarUrl } = req.body;

        if (
            avatarUrl !== undefined &&
            avatarUrl !== null &&
            avatarUrl !== "" &&
            !isSafeHttpUrl(avatarUrl)
        ) {
            return res
                .status(400)
                .json({ error: "Avatar URL must be a valid http/https URL." });
        }

        try {
            await prisma.user.update({
                where: { id: req.user.id },
                data: { avatarUrl: avatarUrl || undefined }, // Nullish allows wiping
            });
            res.json(
                userResponse.actionSuccess("Avatar URL updated.", {
                    avatarUrl: avatarUrl || "",
                }),
            );
        } catch (err) {
            res.status(500).json({
                error: "Failed to allocate new avatar reference.",
            });
        }
    },
);

/**
 * @swagger
 * /api/user/deposits:
 *   get:
 *     tags: [user]
 *     summary: Paginated list of the caller's crypto deposits (stale PENDINGs are purged).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 0 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 25, maximum: 100 }
 *     responses:
 *       200:
 *         description: Deposits.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DepositsResponse'
 */
router.get(
    "/deposits",
    authenticateToken,
    ...validate(userValidators.depositsQuery),
    async (req, res) => {
        try {
            const page = Math.max(0, parseInt(req.query.page, 10) || 0);
            const limit = Math.min(
                100,
                Math.max(1, parseInt(req.query.limit, 10) || 25),
            );

            const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60000);
            await prisma.cryptoDeposit.deleteMany({
                where: {
                    status: "PENDING",
                    createdAt: { lt: fortyEightHoursAgo },
                },
            });

            const deposits = await prisma.cryptoDeposit.findMany({
                where: { userId: req.user.id },
                orderBy: { createdAt: "desc" },
                skip: page * limit,
                take: limit,
                select: {
                    id: true,
                    amountUsd: true,
                    bulletsReceived: true,
                    trackId: true,
                    status: true,
                    payLink: true,
                    createdAt: true,
                },
            });
            res.json(userResponse.deposits(deposits));
        } catch {
            res.status(500).json({
                error: "Failed to map local deposit structures.",
            });
        }
    },
);

/**
 * @swagger
 * /api/user/like:
 *   post:
 *     tags: [user]
 *     summary: Toggle a profile endorsement/like for another user.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [targetUsername]
 *             properties:
 *               targetUsername: { type: string }
 *     responses:
 *       200:
 *         description: Endorsement toggled.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       400:
 *         description: Self-endorsement blocked.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Target user missing.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
    "/like",
    authenticateToken,
    ...validate(userValidators.likeBody),
    async (req, res) => {
        const { targetUsername } = req.body;
        if (!targetUsername)
            return res.status(400).json({ error: "Target parameter missing." });

        try {
            const targetUser = await prisma.user.findUnique({
                where: { username: targetUsername },
            });
            if (!targetUser)
                return res
                    .status(404)
                    .json({ error: "User does not exist on this network." });

            if (targetUser.id === req.user.id)
                return res
                    .status(400)
                    .json({ error: "You cannot physically endorse yourself." });

            const existingLike = await prisma.profileLike.findUnique({
                where: {
                    likerId_targetUserId: {
                        likerId: req.user.id,
                        targetUserId: targetUser.id,
                    },
                },
            });

            if (existingLike) {
                await prisma.profileLike.delete({
                    where: { id: existingLike.id },
                });
                return res.json(
                    userResponse.actionSuccess("Endorsement revoked.", {
                        liked: false,
                    }),
                );
            } else {
                await prisma.profileLike.create({
                    data: {
                        likerId: req.user.id,
                        targetUserId: targetUser.id,
                    },
                });
                return res.json(
                    userResponse.actionSuccess("Endorsement deployed.", {
                        liked: true,
                    }),
                );
            }
        } catch (err) {
            res.status(500).json({ error: "Fulfillment framework crashed." });
        }
    },
);

/**
 * @swagger
 * /api/user/like-status/{username}:
 *   get:
 *     tags: [user]
 *     summary: Total likes on a profile and whether the optional caller has liked.
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Like status.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LikeStatusResponse'
 *       404:
 *         description: User missing.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
    "/like-status/:username",
    ...validate(userValidators.usernameParam),
    async (req, res) => {
        try {
            const targetUser = await prisma.user.findUnique({
                where: { username: req.params.username },
            });
            if (!targetUser)
                return res.status(404).json({ error: "User missing." });

            const organicLikes = await prisma.profileLike.count({
                where: { targetUserId: targetUser.id },
            });
            const totalLikes = organicLikes + (targetUser.casesClosed || 0);

            let hasLiked = false;

            const authHeader = req.headers["authorization"];
            if (authHeader) {
                const token = authHeader.split(" ")[1];
                if (token) {
                    try {
                        const userPayload = jwt.verify(token, JWT_SECRET, {
                            algorithms: ["HS256"],
                        });
                        const likeNode = await prisma.profileLike.findUnique({
                            where: {
                                likerId_targetUserId: {
                                    likerId: userPayload.id,
                                    targetUserId: targetUser.id,
                                },
                            },
                        });
                        if (likeNode) hasLiked = true;
                    } catch (e) {}
                }
            }

            res.json(userResponse.likeStatus(totalLikes, hasLiked));
        } catch (err) {
            res.status(500).json({ error: "Reputation fetch aborted." });
        }
    },
);

/**
 * @swagger
 * /api/user/profile/{username}:
 *   get:
 *     tags: [user]
 *     summary: Profile view for authenticated users (extended fields and stats).
 *     description: This route is defined after the public profile route and requires bearer authentication.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Profile payload.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserProfileResponse'
 *       404:
 *         description: User dossier not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
    "/profile/:username",
    authenticateToken,
    ...validate(userValidators.usernameParam),
    async (req, res) => {
        try {
            const targetUser = await prisma.user.findUnique({
                where: { username: req.params.username },
                select: {
                    id: true,
                    username: true,
                    rank: true,
                    avatarUrl: true,
                    credits: true,
                    bio: true,
                    createdAt: true,
                    lastOnline: true,
                    nameColor: true,
                    nameEffect: true,
                    hasBlueBadge: true,
                    casesClosed: true,
                    customBadges: true,
                },
            });

            if (!targetUser) {
                if (req.params.username === "Silverbullet Core") {
                    return res.json({
                        ...userResponse.profile(
                            {
                                username: "Silverbullet Core",
                                rank: "ADMIN",
                                credits: 99999,
                                avatarUrl: "",
                                bio: "System Administrator.",
                                createdAt: new Date("2020-01-01"),
                                lastOnline: new Date(),
                            },
                            {
                                injectedRatings: 0,
                                threadLikes: 0,
                                establishedThreads: 5,
                                resolvedTickets: 10,
                            },
                        ),
                    });
                }
                return res
                    .status(404)
                    .json({ error: "User Dossier Not Found" });
            }

            const injectedRatings = await prisma.configRating.count({
                where: { userId: targetUser.id },
            });

            const threadLikes = await prisma.threadLike.count({
                where: { userId: targetUser.id },
            });

            res.json(
                userResponse.profile(targetUser, {
                    injectedRatings,
                    threadLikes,
                    establishedThreads: Math.floor(Math.random() * 20),
                    resolvedTickets: Math.floor(Math.random() * 5),
                }),
            );
        } catch (err) {
            res.status(500).json({
                error: "Failed to compile Public Dossier.",
            });
        }
    },
);

/**
 * @swagger
 * /api/user/bio:
 *   post:
 *     tags: [user]
 *     summary: Update the caller's short biography (max 120 chars).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bio]
 *             properties:
 *               bio: { type: string, maxLength: 120 }
 *     responses:
 *       200:
 *         description: Bio updated.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       400:
 *         description: Invalid data.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
    "/bio",
    authenticateToken,
    ...validate(userValidators.bio),
    async (req, res) => {
        const { bio } = req.body;

        if (typeof bio !== "string")
            return res.status(400).json({ error: "Invalid data." });
        if (bio.length > 120)
            return res.status(400).json({
                error: "Bio exceeds maximum structural length of 120 chars.",
            });

        try {
            await prisma.user.update({
                where: { id: req.user.id },
                data: { bio },
            });
            res.json(userResponse.actionSuccess("Bio updated successfully."));
        } catch (err) {
            res.status(500).json({
                error: "Failed to allocate new biography.",
            });
        }
    },
);

/**
 * @swagger
 * /api/user/purchases:
 *   get:
 *     tags: [user]
 *     summary: Full receipt history with dispute and review information joined.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Purchase history.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PurchasesResponse'
 */
router.get("/purchases", authenticateToken, async (req, res) => {
    try {
        const orders = await prisma.order.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: "desc" },
        });

        const productIds = orders.map((o) => o.productId);

        const products = await prisma.product.findMany({
            where: { id: { in: productIds } },
            include: {
                shop: { select: { shopName: true } },
            },
        });

        const orderIds = orders.map((o) => o.id);
        const disputes = await prisma.dispute.findMany({
            where: { orderId: { in: orderIds } },
        });

        const reviews = await prisma.productReview.findMany({
            where: { userId: req.user.id, productId: { in: productIds } },
        });

        const enrichedReceipts = orders.map((order) => {
            const p = products.find((prod) => prod.id === order.productId);
            const dispute = disputes.find((d) => d.orderId === order.id);
            const userReview = reviews.find((r) => r.orderId === order.id);

            const now = new Date();
            const msSincePurchase = now.getTime() - order.createdAt.getTime();
            const isCheckerTarget = p.productName.toLowerCase().includes("pof");

            let canView = msSincePurchase >= 90000;
            if (isCheckerTarget) {
                if (order.checkStatus === "VALID") {
                    canView = true;
                } else if (order.checkStatus === "INVALID_FINAL" && order.checkCompletedAt) {
                    const msSinceCheckCompleted = now.getTime() - order.checkCompletedAt.getTime();
                    canView = msSinceCheckCompleted >= 90000;
                } else {
                    canView = false;
                }
            }

            let finalLogContent =
                dispute && dispute.status === "REPLACED"
                    ? dispute.replacementLog
                    : order.purchasedContent;

            if (!canView) {
                finalLogContent = "PENDING_SUPPORT_VERIFICATION";
            }

            return {
                id: order.id,
                productId: order.productId,
                pricePaid: order.pricePaid,
                purchasedAt: order.createdAt,
                productName: p.productName,
                description: p.description,
                shopName: p.shop.shopName,
                logContent: finalLogContent,
                dispute: dispute || null,
                userScore: userReview ? userReview.score : 0,
                checkStatus: order.checkStatus || "UNCHECKED",
                checkAttempts: order.checkAttempts || 0,
                checkCompletedAt: order.checkCompletedAt || null,
            };
        });

        res.json(userResponse.purchases(enrichedReceipts));
    } catch (err) {
        res.status(500).json({ error: "Ledger access denied." });
    }
});

/**
 * @swagger
 * /api/user/buy-cosmetic:
 *   post:
 *     tags: [user]
 *     summary: Purchase a cosmetic (verified badge or 30-day color/effect pass).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [type]
 *             properties:
 *               type: { type: string, enum: [badge, color_pass] }
 *               hexColor: { type: string, description: "Required for color_pass; must match /^#[0-9A-Fa-f]{6}$/." }
 *               effect: { type: string, description: "Optional display effect for color_pass." }
 *     responses:
 *       200:
 *         description: Cosmetic applied.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       400:
 *         description: Invalid cosmetic type or insufficient credits.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Color pass locked for 30 days.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
    "/buy-cosmetic",
    authenticateToken,
    ...validate(userValidators.buyCosmetic),
    async (req, res) => {
        const { type } = req.body;

        try {
            const user = await prisma.user.findUnique({
                where: { id: req.user.id },
            });
            if (!user) return res.status(404).json({ error: "User phantom." });

            const isAdmin = user.rank === "ADMIN";

            if (type === "badge") {
                if (user.hasBlueBadge)
                    return res.status(400).json({
                        error: "You already own the Verified Badge.",
                    });

                if (!isAdmin) {
                    const debited = await prisma.user.updateMany({
                        where: { id: user.id, credits: { gte: 10 }, hasBlueBadge: false },
                        data: { credits: { decrement: 10 } },
                    });
                    if (debited.count === 0) {
                        return res.status(400).json({
                            error: "Insufficient BLT or badge already owned.",
                        });
                    }
                }
                await prisma.user.update({
                    where: { id: user.id },
                    data: { hasBlueBadge: true },
                });
                return res.json(
                    userResponse.actionSuccess(
                        "Verified Badge permanently unlocked!",
                    ),
                );
            }

            if (type === "color_pass") {
                const { hexColor, effect } = req.body;
                if (!hexColor || !/^#[0-9A-Fa-f]{6}$/.test(hexColor)) {
                    return res.status(400).json({ error: "Invalid Hex Code." });
                }

                const validEffects = [
                    "none",
                    "effect-flying",
                    "effect-3d",
                    "effect-typing",
                    "effect-neon",
                    "effect-shake",
                    "effect-rgb",
                    "effect-flash",
                    "effect-hologram",
                    "effect-plasma",
                    "effect-fire",
                    "effect-radioactive-dust",
                    "effect-void-walker",
                    "Kinetic: Sine Wave",
                    "Kinetic: Elastic Band",
                    "Kinetic: Matrix Scrambler",
                    "Kinetic: Ghost Shift",
                    "Kinetic: Typewriter",
                ];
                const secureEffect = validEffects.includes(effect)
                    ? effect
                    : "none";

                const now = new Date();
                if (
                    !isAdmin &&
                    user.colorPassExpiry &&
                    new Date(user.colorPassExpiry) > now
                ) {
                    return res.status(403).json({
                        error: "Configuration locked. You must wait 30 days before editing your Display Identity again.",
                    });
                }

                if (!isAdmin) {
                    // Atomic debit + expiry-still-null/expired guard.
                    const debited = await prisma.user.updateMany({
                        where: {
                            id: user.id,
                            credits: { gte: 20 },
                            OR: [
                                { colorPassExpiry: null },
                                { colorPassExpiry: { lt: now } },
                            ],
                        },
                        data: { credits: { decrement: 20 } },
                    });
                    if (debited.count === 0) {
                        return res.status(400).json({
                            error: "Insufficient BLT or pass still active.",
                        });
                    }
                }

                const newExpiry = new Date();
                newExpiry.setDate(newExpiry.getDate() + 30);
                await prisma.user.update({
                    where: { id: user.id },
                    data: {
                        nameColor: hexColor,
                        nameEffect: secureEffect,
                        colorPassExpiry: newExpiry,
                    },
                });
                return res.json(
                    userResponse.actionSuccess(
                        "Display Identity permanently locked in for 30 days.",
                    ),
                );
            }

            res.status(400).json({ error: "Invalid cosmetic type." });
        } catch (err) {
            res.status(500).json({ error: "Cosmetics terminal failure." });
        }
    },
);

// ==========================================
// 2FA Endpoints
// ==========================================

router.get("/2fa/generate", authenticateToken, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
        });

        if (user.twoFactorEnabled) {
            return res.status(400).json({ error: "2FA is already enabled." });
        }

        const secret = otplib.generateSecret(20);
        await prisma.user.update({
            where: { id: req.user.id },
            data: { twoFactorSecret: secret, twoFactorEnabled: false },
        });

        const otpauthUrl = otplib.generateURI({ issuer: "Silverbullet", accountName: user.username, secret });
        const qrCodeUrl = await qrcode.toDataURL(otpauthUrl);

        res.status(200).json({
            secret,
            qrCodeUrl,
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to generate 2FA." });
    }
});

router.post("/2fa/enable", authenticateToken, async (req, res) => {
    try {
        const { code } = req.body;

        if (!code) {
            return res.status(400).json({ error: "Missing code." });
        }

        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { twoFactorSecret: true, twoFactorEnabled: true },
        });
        if (!user?.twoFactorSecret || user.twoFactorEnabled) {
            return res.status(400).json({ error: "Call /2fa/generate first." });
        }

        const isValid = otplib.verifySync({
            token: String(code),
            secret: user.twoFactorSecret,
            window: 1,
        }).valid;

        if (!isValid) {
            return res.status(400).json({ error: "Invalid 2FA code." });
        }

        await prisma.user.update({
            where: { id: req.user.id },
            data: { twoFactorEnabled: true },
        });

        res.status(200).json({ success: true, message: "2FA enabled successfully." });
    } catch (err) {
        res.status(500).json({ error: "Failed to enable 2FA." });
    }
});

router.post("/2fa/disable", authenticateToken, async (req, res) => {
    try {
        const { password, code } = req.body;

        if (!password || !code) {
            return res.status(400).json({ error: "Password and 2FA code are required." });
        }

        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
        });

        if (!user.twoFactorEnabled) {
            return res.status(400).json({ error: "2FA is not enabled." });
        }

        const isPasswordValid = await argon2.verify(user.passwordHash, password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: "Invalid password." });
        }

        const isValid = otplib.verifySync({ token: code, secret: user.twoFactorSecret, window: 1 }).valid;
        if (!isValid) {
            return res.status(400).json({ error: "Invalid 2FA code." });
        }

        await prisma.user.update({
            where: { id: req.user.id },
            data: {
                twoFactorSecret: null,
                twoFactorEnabled: false,
            },
        });

        res.status(200).json({ success: true, message: "2FA disabled successfully." });
    } catch (err) {
        res.status(500).json({ error: "Failed to disable 2FA." });
    }
});

module.exports = { path: "/api/user", router };
