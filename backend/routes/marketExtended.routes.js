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
            if (!Number.isInteger(amount) || amount < 1 || amount > 100) {
                return res.status(400).json({ error: "Invalid amount." });
            }

            const result = await prisma.$transaction(async (tx) => {
                const product = await tx.product.findUnique({
                    where: { id: productId },
                    include: { shop: { include: { owner: true } } },
                });
                if (!product) throw new Error("PRODUCT_MISSING");

                if (product.shop.owner.id === buyerId) {
                    throw new Error("SELF_TRADE_BLOCKED");
                }

                const lines = product.logContent
                    .split("\n")
                    .filter((l) => l.trim() !== "");
                if (amount > lines.length) {
                    throw new Error(`INSUFFICIENT_STOCK:${lines.length}`);
                }

                const purchasedLines = lines.slice(0, amount).join("\n");
                const remainingLines = lines.slice(amount).join("\n");

                const priceUsd = product.price * amount;
                const ownerRank = product.shop.owner.rank;
                const customSplit = product.shop.owner.customSplit;
                // Clamp customSplit to [0, 1] defensively even though admin endpoints
                // should enforce that — the admin Telegram bot historically did not.
                const splitRate = (customSplit !== null && customSplit >= 0 && customSplit <= 1)
                    ? customSplit
                    : (ownerRank === "ENTERPRISE" || ownerRank === "ADMIN")
                      ? 0.75
                      : ownerRank === "PREMIUM"
                        ? 0.6
                        : 0.5;
                const vendorRevenue = Math.max(0,
                    (priceUsd * splitRate) - ((product.marketBid || 0) * amount));

                const stockUpdate = await tx.product.updateMany({
                    where: { id: product.id, stock: { gte: amount } },
                    data: {
                        logContent: remainingLines,
                        stock: { decrement: amount },
                    },
                });
                if (stockUpdate.count === 0) throw new Error("INSUFFICIENT_STOCK_RACE");

                const buyerUpdate = await tx.user.updateMany({
                    where: { id: buyerId, credits: { gte: priceUsd } },
                    data: { credits: { decrement: priceUsd } },
                });
                if (buyerUpdate.count === 0) throw new Error("INSUFFICIENT_FUNDS");

                await tx.user.update({
                    where: { id: product.shop.owner.id },
                    data: { vendorBalance: { increment: vendorRevenue } },
                });

                await tx.order.create({
                    data: {
                        productId: product.id,
                        userId: buyerId,
                        pricePaid: priceUsd,
                        purchasedContent: purchasedLines,
                    },
                });

                return { product, purchasedLines };
            }, { isolationLevel: "Serializable" });

            const { product, purchasedLines } = result;

            if (product.shop.owner.telegramChatId) {
                sendVendorTelegramAlert(
                    product.shop.owner.telegramChatId,
                    `Tool # ${product.id.substring(0, 8)} ${product.productName} is sold.`,
                );
            }

            res.json(marketExtendedResponse.purchase(purchasedLines));
        } catch (err) {
            const msg = err?.message || "";
            if (msg === "PRODUCT_MISSING") {
                return res.status(404).json({ error: "Payload physically missing." });
            }
            if (msg === "SELF_TRADE_BLOCKED") {
                return res.status(403).json({ error: "You cannot purchase from your own shop." });
            }
            if (msg.startsWith("INSUFFICIENT_STOCK:")) {
                const have = msg.split(":")[1];
                return res.status(400).json({ error: `Not enough stock. Only ${have} lines available.` });
            }
            if (msg === "INSUFFICIENT_STOCK_RACE") {
                return res.status(400).json({ error: "Stock depleted." });
            }
            if (msg === "INSUFFICIENT_FUNDS") {
                return res.status(400).json({ error: "Insufficient Bullets." });
            }
            logger.error("Marketplace buy error:", err);
            res.status(500).json({ error: "Marketplace Execution Failure." });
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
    (_req, res) => res.status(410).json({
        error: "Endpoint deprecated. Use the dispute thread to negotiate a replacement.",
    }),
);

module.exports = { path: "/api", router };
