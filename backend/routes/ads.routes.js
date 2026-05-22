const express = require("express");
const rateLimit = require("express-rate-limit");
const { ipKeyGenerator } = require("express-rate-limit");
const { validate } = require("../validators/middleware");
const { adsValidators } = require("../validators/ads.validator");
const { adsResponse } = require("../models/responses/ads.response");
const { authenticateToken, prisma } = require("./shared");
const { getLogger } = require("../lib/logger");

const logger = getLogger("ads.routes");

const router = express.Router();

const clickLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => `${ipKeyGenerator(req.ip)}|${req.params.id || "noid"}`,
    message: { error: "Click cooldown." },
});

/**
 * @swagger
 * /api/ads/slots:
 *   get:
 *     tags: [ads]
 *     summary: List currently active advertisement slots.
 *     responses:
 *       200:
 *         description: Active ads.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AdsSlotsResponse'
 */
router.get("/slots", async (req, res) => {
    try {
        const activeAds = await prisma.advertisement.findMany({
            where: { status: "ACTIVE", expiresAt: { gt: new Date() } },
        });
        res.json(adsResponse.slots(activeAds));
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch ad slots." });
    }
});

/**
 * @swagger
 * /api/ads/purchase:
 *   post:
 *     tags: [ads]
 *     summary: Purchase an ad slot with BLT credits.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [slotId, durationDays, imageUrl, targetUrl]
 *             properties:
 *               slotId: { type: integer, minimum: 1, maximum: 6 }
 *               durationDays: { type: integer, enum: [14, 30] }
 *               imageUrl: { type: string }
 *               targetUrl: { type: string }
 *     responses:
 *       200:
 *         description: Ad purchased and activated.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       400:
 *         description: Invalid slot / duration.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Slot occupied, locked, or insufficient balance.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
    "/purchase",
    authenticateToken,
    ...validate(adsValidators.purchase),
    async (req, res) => {
        const { slotId, durationDays, imageUrl, targetUrl } = req.body;
        if (!slotId || !durationDays || !imageUrl || !targetUrl)
            return res
                .status(400)
                .json({ error: "Missing required ad details." });
        if (![14, 30].includes(durationDays))
            return res.status(400).json({ error: "Invalid duration." });
        if (slotId < 1 || slotId > 6)
            return res.status(400).json({ error: "Invalid slot ID." });

        try {
            const existing = await prisma.advertisement.findFirst({
                where: {
                    slotId,
                    status: { in: ["ACTIVE", "PENDING_PAYMENT"] },
                },
            });

            if (existing) {
                if (
                    existing.status === "ACTIVE" &&
                    existing.expiresAt > new Date()
                )
                    return res
                        .status(403)
                        .json({ error: "Slot is currently occupied." });
                if (
                    existing.status === "PENDING_PAYMENT" &&
                    existing.lockedUntil > new Date()
                )
                    return res.status(403).json({
                        error: "Slot is currently locked for another buyer's checkout.",
                    });
            }

            const amountBlt = durationDays === 14 ? 250 : 480;
            const user = await prisma.user.findUnique({
                where: { id: req.user.id },
            });
            if (!user) return res.status(404).json({ error: "User not found." });
            const isAdmin = user.rank === "ADMIN";

            try {
                await prisma.$transaction(async (tx) => {
                    if (!isAdmin) {
                        const debited = await tx.user.updateMany({
                            where: { id: user.id, credits: { gte: amountBlt } },
                            data: { credits: { decrement: amountBlt } },
                        });
                        if (debited.count === 0) throw new Error("INSUFFICIENT_BLT");
                    }
                    await tx.advertisement.create({
                        data: {
                            vendorId: user.id,
                            imageUrl,
                            targetUrl,
                            slotId: parseInt(slotId),
                            status: "ACTIVE",
                            expiresAt: new Date(
                                Date.now() + durationDays * 24 * 60 * 60 * 1000,
                            ),
                        },
                    });
                }, { isolationLevel: "Serializable" });
            } catch (e) {
                if (e?.message === "INSUFFICIENT_BLT") {
                    return res.status(403).json({ error: "Insufficient BLT Balance." });
                }
                throw e;
            }

            if (existing && existing.status === "PENDING_PAYMENT") {
                await prisma.advertisement.deleteMany({
                    where: { id: existing.id },
                });
            }

            res.json(adsResponse.purchased(slotId, durationDays));
        } catch (err) {
            logger.error(err);
            res.status(500).json({ error: "Ad initialization failed." });
        }
    },
);

/**
 * @swagger
 * /api/ads/{id}/click:
 *   post:
 *     tags: [ads]
 *     summary: Record a click on an advertisement.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Click tracked.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessOnly'
 */
router.post(
    "/:id/click",
    clickLimiter,
    ...validate(adsValidators.click),
    async (req, res) => {
        try {
            // Only count clicks for currently-active ads to prevent inflating
            // dead ads' counters retroactively.
            const r = await prisma.advertisement.updateMany({
                where: { id: req.params.id, status: "ACTIVE", expiresAt: { gt: new Date() } },
                data: { clicks: { increment: 1 } },
            });
            if (r.count === 0) return res.status(404).json({ error: "Ad not active." });
            res.json(adsResponse.tracked());
        } catch (err) {
            res.status(500).json({ error: "Tracking failed." });
        }
    },
);

module.exports = { path: "/api/ads", router };
