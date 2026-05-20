const express = require("express");
const { validate } = require("../validators/middleware");
const { adsValidators } = require("../validators/ads.validator");
const { adsResponse } = require("../models/responses/ads.response");
const { authenticateToken, prisma } = require("./shared");
const { getLogger } = require("../lib/logger");

const logger = getLogger("ads.routes");

const router = express.Router();

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
            const isAdmin = user.rank === "ADMIN";

            if (!isAdmin && user.credits < amountBlt)
                return res
                    .status(403)
                    .json({ error: "Insufficient BLT Balance." });

            const txs = [
                prisma.advertisement.create({
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
                }),
            ];
            if (!isAdmin) {
                txs.push(
                    prisma.user.update({
                        where: { id: user.id },
                        data: { credits: { decrement: amountBlt } },
                    }),
                );
            }

            await prisma.$transaction(txs);

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
    ...validate(adsValidators.click),
    async (req, res) => {
        try {
            await prisma.advertisement.update({
                where: { id: req.params.id },
                data: { clicks: { increment: 1 } },
            });
            res.json(adsResponse.tracked());
        } catch (err) {
            res.status(500).json({ error: "Tracking failed." });
        }
    },
);

module.exports = { path: "/api/ads", router };
