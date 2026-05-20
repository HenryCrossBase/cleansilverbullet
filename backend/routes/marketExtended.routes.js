const express = require("express");
const { validate } = require("../validators/middleware");
const {
    marketExtendedValidators,
} = require("../validators/marketExtended.validator");
const {
    marketExtendedResponse,
} = require("../models/responses/marketExtended.response");
const {
    authenticateToken,
    prisma,
    sendVendorTelegramAlert,
    maskUsername,
    VENDOR_DASHBOARD_URL,
    ADMIN_BOT_TOKEN,
    ADMIN_CHAT_ID,
    appendWebhookLog,
} = require("./shared");
const { getLogger } = require("../lib/logger");

const logger = getLogger("marketExtended.routes");

const router = express.Router();

/**
 * @swagger
 * /api/market/product/{id}:
 *   get:
 *     tags: [market]
 *     summary: Get product detail with its shop and vendor (vendor name masked).
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Product detail.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ProductResponse'
 *       404:
 *         description: Product currently untraceable.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
    "/market/product/:id",
    ...validate(marketExtendedValidators.productIdParam),
    async (req, res) => {
        try {
            const product = await prisma.product.findUnique({
                where: { id: req.params.id, stock: { gt: 0 } },
                include: {
                    shop: {
                        include: {
                            owner: {
                                select: {
                                    username: true,
                                    avatarUrl: true,
                                    rank: true,
                                    lastOnline: true,
                                },
                            },
                        },
                    },
                },
            });
            if (!product)
                return res
                    .status(404)
                    .json({ error: "Product currently untraceable." });

            product.shop.owner.username = maskUsername(
                product.shop.owner.username,
                req,
            );
            res.json(marketExtendedResponse.product(product));
        } catch (err) {
            res.status(500).json({ error: "Network infrastructure unstable." });
        }
    },
);

/**
 * @swagger
 * /api/marketplace/buy/{productId}:
 *   post:
 *     tags: [market]
 *     summary: Purchase N stock lines of a product and decrypt the payload.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount: { type: integer, minimum: 1, default: 1 }
 *     responses:
 *       200:
 *         description: Purchase completed with decrypted log.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PurchaseLogResponse'
 *       400:
 *         description: Insufficient stock or funds.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Payload missing.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
    "/marketplace/buy/:productId",
    authenticateToken,
    ...validate(marketExtendedValidators.buy),
    async (req, res) => {
        try {
            const productId = req.params.productId;
            const buyerId = req.user.id;
            const amount = parseInt(req.body.amount, 10) || 1;

            const product = await prisma.product.findUnique({
                where: { id: productId },
                include: { shop: { include: { owner: true } } },
            });

            if (!product)
                return res
                    .status(404)
                    .json({ error: "Payload physically missing." });

            const lines = product.logContent
                .split("\n")
                .filter((l) => l.trim() !== "");
            if (amount > lines.length) {
                return res.status(400).json({
                    error: `Not enough stock. Only ${lines.length} lines available.`,
                });
            }

            const purchasedLines = lines.slice(0, amount).join("\n");
            const remainingLines = lines.slice(amount).join("\n");

            const priceUsd = product.price * amount;
            const splitRate =
                product.shop.owner.customSplit !== null
                    ? product.shop.owner.customSplit
                    : (product.shop.owner.rank === "ENTERPRISE" || product.shop.owner.rank === "ADMIN")
                      ? 0.75
                      : product.shop.owner.rank === "PREMIUM"
                        ? 0.6
                        : 0.5;
            const vendorRevenue = (priceUsd * splitRate) - ((product.marketBid || 0) * amount);

            const buyer = await prisma.user.findUnique({
                where: { id: buyerId },
            });
            if (buyer.credits < priceUsd) {
                return res.status(400).json({ error: "Insufficient Bullets." });
            }

            await prisma.$transaction([
                prisma.user.update({
                    where: { id: buyerId },
                    data: { credits: { decrement: priceUsd } },
                }),

                prisma.user.update({
                    where: { id: product.shop.owner.id },
                    data: { vendorBalance: { increment: vendorRevenue } },
                }),

                prisma.order.create({
                    data: {
                        productId: product.id,
                        userId: buyerId,
                        pricePaid: priceUsd,
                        purchasedContent: purchasedLines,
                    },
                }),

                prisma.product.update({
                    where: { id: product.id },
                    data: {
                        logContent: remainingLines,
                        stock: lines.length - amount,
                    },
                }),
            ]);

            if (product.shop.owner.telegramChatId) {
                sendVendorTelegramAlert(
                    product.shop.owner.telegramChatId,
                    `Tool # ${product.id.substring(0, 8)} ${product.productName} is sold.`,
                );
            }

            res.json(marketExtendedResponse.purchase(purchasedLines));
        } catch (err) {
            res.status(500).json({
                error: "Marketplace Execution Failure.",
            });
        }
    },
);

/**
 * @swagger
 * /api/orders/dispute:
 *   post:
 *     tags: [market]
 *     summary: Open a dispute on an order (5 minute window).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId, target]
 *             properties:
 *               orderId: { type: string }
 *               target: { type: string, enum: [ADMIN, VENDOR] }
 *     responses:
 *       200:
 *         description: Dispute opened.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       400:
 *         description: Dispute already active.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Window expired or order context invalid.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
    "/orders/dispute",
    authenticateToken,
    ...validate(marketExtendedValidators.dispute),
    async (req, res) => {
        const { orderId, target } = req.body;
        if (!orderId || !target)
            return res.status(400).json({ error: "Missing payload" });

        try {
            const order = await prisma.order.findUnique({
                where: { id: orderId },
            });
            if (!order || order.userId !== req.user.id)
                return res
                    .status(403)
                    .json({ error: "Order context invalid." });

            const timeSince =
                (new Date().getTime() - new Date(order.createdAt).getTime()) /
                1000 /
                60;
            if (timeSince > 6.5)
                return res
                    .status(403)
                    .json({ error: "Dispute window expired (5 min + 90s wait)." });

            const product = await prisma.product.findUnique({
                where: { id: order.productId },
                include: { shop: true },
            });
            if (!product)
                return res.status(404).json({ error: "Asset index missing." });

            const existingDispute = await prisma.dispute.findUnique({
                where: { orderId },
            });
            if (existingDispute)
                return res
                    .status(400)
                    .json({ error: "Dispute already active." });

            await prisma.dispute.create({
                data: {
                    orderId,
                    buyerId: req.user.id,
                    vendorId: product.shop.ownerId,
                    status: target === "ADMIN" ? "OPEN" : "OPEN",
                },
            });

            try {
                const disputeMsg = `🚨 <b>ADMINISTRATIVE DISPUTE ALERT</b> 🚨\n\nA user has formally executed a marketplace dispute against a Vendor.\n\n<b>Order ID:</b> <code>${orderId}</code>\n<b>Amount Locked:</b> <code>$${product.price.toFixed(2)} BLT</code>\n\nPlease enter the Master Dispute Hub to arbitrate immediately.`;

                if (ADMIN_BOT_TOKEN && ADMIN_CHAT_ID) {
                    const rAdmin = await fetch(
                        `https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`,
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                chat_id: ADMIN_CHAT_ID,
                                text: disputeMsg,
                                parse_mode: "HTML",
                            }),
                        },
                    );
                    const ro1 = await rAdmin.text();
                    appendWebhookLog(
                        `[ADMIN GROUP PUSH] Status: ${rAdmin.status} - Output: ${ro1}`,
                    );
                }

                const authorizedAdmins = await prisma.user.findMany({
                    where: { rank: "ADMIN", telegramChatId: { not: null } },
                });
                for (const admin of authorizedAdmins) {
                    const rAdminLoop = await fetch(
                        `https://api.telegram.org/bot${ADMIN_BOT_TOKEN}/sendMessage`,
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                chat_id: admin.telegramChatId,
                                text: disputeMsg,
                                parse_mode: "HTML",
                            }),
                        },
                    );
                    const ro2 = await rAdminLoop.text();
                    appendWebhookLog(
                        `[ADMIN DM PUSH] Chat: ${admin.telegramChatId} - Status: ${rAdminLoop.status} - Output: ${ro2}`,
                    );
                }
            } catch (e) {
                logger.error("Admin Dispatch Failure", e);
            }

            const vendorNode = await prisma.user.findUnique({
                where: { id: product.shop.ownerId },
            });
            if (vendorNode && vendorNode.telegramChatId) {
                await sendVendorTelegramAlert(
                    vendorNode.telegramChatId,
                    `🚨 <b>CRITICAL DISPUTE OPENED</b>\n\nA buyer has locked escrow and disputed Order <b>#${orderId.substring(0, 8)}</b> for product <b>${product.productName}</b>.\n\nFailure to reply within 24 hours will result in an automatic forced refund via Admin arbitration.\n\n<a href="${VENDOR_DASHBOARD_URL}">Resolve Dispute Now</a>`,
                );
            }

            res.json(
                marketExtendedResponse.disputeOpened(
                    target === "ADMIN"
                        ? "Escalated to Silverbullet Core."
                        : "Vendor alerted. 24h Replacement Window Started.",
                ),
            );
        } catch (err) {
            res.status(500).json({ error: "Dispute network error." });
        }
    },
);

/**
 * @swagger
 * /api/vendor/replace-log:
 *   post:
 *     tags: [market]
 *     summary: Vendor supplies a replacement log for an active dispute.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [disputeId, replacementLog]
 *             properties:
 *               disputeId: { type: string }
 *               replacementLog: { type: string }
 *     responses:
 *       200:
 *         description: Replacement queued pending admin review.
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
    "/vendor/replace-log",
    authenticateToken,
    ...validate(marketExtendedValidators.replaceLog),
    async (req, res) => {
        const { disputeId, replacementLog } = req.body;
        if (!disputeId || !replacementLog)
            return res.status(400).json({ error: "Invalid payload." });

        try {
            const dispute = await prisma.dispute.findUnique({
                where: { id: disputeId },
            });
            if (!dispute || dispute.vendorId !== req.user.id)
                return res
                    .status(403)
                    .json({ error: "Unauthorized manipulation." });

            await prisma.dispute.update({
                where: { id: disputeId },
                data: { status: "PENDING_ADMIN", replacementLog },
            });

            res.json(marketExtendedResponse.replacementQueued());
        } catch (err) {
            res.status(500).json({ error: "Replacement injection error." });
        }
    },
);

module.exports = { path: "/api", router };
