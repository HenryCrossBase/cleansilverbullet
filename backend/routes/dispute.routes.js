const express = require("express");
const { validate } = require("../validators/middleware");
const { disputeValidators } = require("../validators/dispute.validator");
const { disputeResponse } = require("../models/responses/dispute.response");
const {
    authenticateToken,
    prisma,
    sendAdminTelegramAlert,
    sendVendorTelegramAlert,
    maskUsername,
    VENDOR_DASHBOARD_URL,
    ADMIN_BOT_TOKEN,
    appendWebhookLog,
} = require("./shared");

const router = express.Router();

/**
 * @swagger
 * /api/market/dispute-report:
 *   post:
 *     tags: [dispute]
 *     summary: Open a formal dispute on an order with an initial message (5 minute window).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId, initialMessage]
 *             properties:
 *               orderId: { type: string }
 *               initialMessage: { type: string }
 *     responses:
 *       200:
 *         description: Dispute opened.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       400:
 *         description: Dispute window closed or already active.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
    "/dispute-report",
    authenticateToken,
    ...validate(disputeValidators.report),
    async (req, res) => {
        const { orderId, initialMessage } = req.body;
        try {
            if (!initialMessage)
                return res.status(400).json({
                    error: "An initial message is strictly required to open a dispute.",
                });

            const dispute = await prisma.$transaction(async (tx) => {
                const order = await tx.order.findFirst({
                    where: { id: orderId, userId: req.user.id },
                    select: {
                        id: true,
                        userId: true,
                        productId: true,
                        createdAt: true,
                        pricePaid: true,
                    },
                });
                if (!order) throw new Error("Order phantom.");

                if (
                    Date.now() - new Date(order.createdAt).getTime() >
                    5 * 60 * 1000
                ) {
                    throw new Error(
                        "Dispute window permanently closed (5 minutes elapsed).",
                    );
                }

                const product = await tx.product.findUnique({
                    where: { id: order.productId },
                    select: {
                        id: true,
                        productName: true,
                        price: true,
                        shop: { select: { ownerId: true } },
                    },
                });
                if (!product) throw new Error("Product phantom.");

                const exists = await tx.dispute.findUnique({
                    where: { orderId },
                });
                if (exists) throw new Error("Dispute already active.");

                return tx.dispute.create({
                    data: {
                        orderId,
                        buyerId: req.user.id,
                        vendorId: product.shop.ownerId,
                        status: "OPEN",
                    },
                });
            });

            try {
                const disputeMsg = `⚠️ <b>[ DISPUTE OPENED ]</b> ⚠️\n\n<b>Order ID:</b> <code>${orderId.substring(0, 8)}</code>\n\n<b>Buyer:</b> <code>${req.user.username}</code>`;

                await sendAdminTelegramAlert(disputeMsg);

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
                    await rAdminLoop.json();
                }
            } catch (e) {}

            const vendorNode = await prisma.user.findUnique({
                where: { id: dispute.vendorId },
            });
            if (vendorNode && vendorNode.telegramChatId) {
                await sendVendorTelegramAlert(
                    vendorNode.telegramChatId,
                    `Tool # ${orderId.substring(0, 8)} is Reported with Report # ${dispute.id.substring(0, 8)}`,
                );
            }

            await prisma.disputeMessage.create({
                data: {
                    disputeId: dispute.id,
                    senderId: req.user.id,
                    senderRank: req.user.rank,
                    message: initialMessage,
                },
            });

            await prisma.notification.create({
                data: {
                    userId: dispute.vendorId,
                    message: `A new dispute has been opened for Order #${orderId.substring(0, 8)}. Immediate action required.`,
                    type: "DISPUTE",
                    link: `/vendor/dashboard`,
                },
            });

            res.json(disputeResponse.opened());
        } catch (err) {
            res.status(500).json({ error: "System failure." });
        }
    },
);

/**
 * @swagger
 * /api/market/dispute/{orderId}:
 *   get:
 *     tags: [dispute]
 *     summary: Get the full dispute thread for an order (buyer, vendor, or admin).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Dispute detail with messages.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DisputeResponse'
 *       403:
 *         description: Not a participant.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Dispute not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
    "/dispute/:orderId",
    authenticateToken,
    ...validate(disputeValidators.orderIdParam),
    async (req, res) => {
        try {
            const dispute = await prisma.dispute.findUnique({
                where: { orderId: req.params.orderId },
                include: { messages: { orderBy: { createdAt: "asc" } } },
            });

            if (!dispute) {
                return res.status(404).json({ error: "Dispute not found." });
            }

            if (
                dispute.buyerId !== req.user.id &&
                dispute.vendorId !== req.user.id &&
                req.user.rank !== "ADMIN"
            ) {
                return res.status(403).json({
                    error: "Forbidden. Extracted payload locked.",
                });
            }

            if (req.user.rank === "ADMIN" && dispute.status === "OPEN") {
                const hasAdminSpoken = dispute.messages.some(
                    (m) => m.senderId === req.user.id,
                );
                if (!hasAdminSpoken) {
                    const adminUser = await prisma.user.findUnique({
                        where: { id: req.user.id },
                    });
                    const joinMessage = await prisma.disputeMessage.create({
                        data: {
                            disputeId: dispute.id,
                            senderId: req.user.id,
                            senderRank: req.user.rank,
                            message: `SYSTEM: Admin ${adminUser?.username || "Unknown"} has joined the chat.`,
                        },
                    });
                    dispute.messages.push(joinMessage);

                    const vendorNode = await prisma.user.findUnique({
                        where: { id: dispute.vendorId },
                    });
                    if (vendorNode && vendorNode.telegramChatId) {
                        sendVendorTelegramAlert(
                            vendorNode.telegramChatId,
                            `⚖️ <b>ARBITRATOR ARRIVED</b>\n\nAdministrator <b>${adminUser?.username || req.user.username}</b> has physically joined the ongoing dispute chat for Order <b>#${dispute.orderId.substring(0, 8)}</b>.\n\n<a href="${VENDOR_DASHBOARD_URL}">Access Hub</a>`,
                        );
                    }
                }
            }

            const bUser = await prisma.user.findUnique({
                where: { id: dispute.buyerId },
            });
            const vUser = await prisma.user.findUnique({
                where: { id: dispute.vendorId },
            });

            const augmentedDispute = {
                ...dispute,
                buyerName:
                    req.user.rank === "ADMIN"
                        ? bUser?.username
                        : maskUsername(bUser?.username || "Unknown", req),
                vendorName:
                    req.user.rank === "ADMIN"
                        ? vUser?.username
                        : maskUsername(vUser?.username || "Unknown", req),
            };

            for (let m of augmentedDispute.messages) {
                if (m.senderRank === "ADMIN") {
                    const u = await prisma.user.findUnique({
                        where: { id: m.senderId },
                    });
                    m.senderName = u?.username || "Admin";
                    m.adminReputation = u?.casesClosed || 0;
                }
            }

            res.json(disputeResponse.detail(augmentedDispute));
        } catch (err) {
            res.status(500).json({ error: "System failure." });
        }
    },
);

/**
 * @swagger
 * /api/market/dispute/{orderId}/reply:
 *   post:
 *     tags: [dispute]
 *     summary: Post a reply in an open dispute thread.
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
 *             required: [message]
 *             properties:
 *               message: { type: string }
 *     responses:
 *       200:
 *         description: Reply posted.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       400:
 *         description: Ticket closed or empty message.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Not a participant.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
    "/dispute/:orderId/reply",
    authenticateToken,
    ...validate([
        ...disputeValidators.orderIdParam,
        ...disputeValidators.reply,
    ]),
    async (req, res) => {
        const { message } = req.body;
        try {
            if (!message)
                return res.status(400).json({ error: "Message empty." });

            const dispute = await prisma.dispute.findUnique({
                where: { orderId: req.params.orderId },
            });
            if (!dispute)
                return res.status(404).json({ error: "Dispute not found." });

            if (
                dispute.buyerId !== req.user.id &&
                dispute.vendorId !== req.user.id &&
                req.user.rank !== "ADMIN"
            ) {
                return res.status(403).json({
                    error: "Forbidden. Extracted payload locked.",
                });
            }

            if (dispute.status !== "OPEN") {
                return res
                    .status(400)
                    .json({ error: "Ticket is closed by Administrators." });
            }

            await prisma.disputeMessage.create({
                data: {
                    disputeId: dispute.id,
                    senderId: req.user.id,
                    senderRank: req.user.rank,
                    message,
                },
            });

            if (req.user.rank === "ADMIN") {
                const priorAdminMessages = await prisma.disputeMessage.count({
                    where: {
                        disputeId: dispute.id,
                        senderRank: "ADMIN",
                    },
                });

                if (priorAdminMessages === 1) {
                    await prisma.disputeMessage.create({
                        data: {
                            disputeId: dispute.id,
                            senderId: req.user.id,
                            senderRank: "ADMIN_SYSTEM",
                            message: `Administrator ${req.user.username} has officially joined the dispute arbitration. Please operate with transparency.`,
                        },
                    });

                    const vendorNode = await prisma.user.findUnique({
                        where: { id: dispute.vendorId },
                    });
                    if (vendorNode && vendorNode.telegramChatId) {
                        sendVendorTelegramAlert(
                            vendorNode.telegramChatId,
                            `⚖️ <b>ARBITRATOR ARRIVED</b>\n\nAdministrator <b>${req.user.username}</b> has physically joined the ongoing dispute chat for Order <b>#${dispute.orderId.substring(0, 8)}</b>.\n\n<a href="${VENDOR_DASHBOARD_URL}">Access Hub</a>`,
                        );
                    }

                    const payload = {
                        message: `[ SYSTEM ALERT ] A Silverbullet Administrator has officially joined your Dispute dialogue on Order #${dispute.orderId.substring(0, 8)}.`,
                        type: "DISPUTE",
                        link: `/disputes/${dispute.orderId}`,
                    };
                    await prisma.notification.createMany({
                        data: [
                            { userId: dispute.buyerId, ...payload },
                            { userId: dispute.vendorId, ...payload },

                            {
                                userId: req.user.id,
                                message: `[ SYSTEM NOTATION ] You have firmly established your presence in Order #${dispute.orderId.substring(0, 8)}.`,
                                type: "DISPUTE",
                                link: `/disputes/${dispute.orderId}`,
                            },
                        ],
                    });
                }
            }

            res.json(disputeResponse.replied());
        } catch (err) {
            res.status(500).json({ error: "System failure." });
        }
    },
);

/**
 * @swagger
 * /api/market/dispute/{orderId}/resolve:
 *   post:
 *     tags: [dispute]
 *     summary: Admin-only arbitration that approves or rejects the refund.
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
 *       200:
 *         description: Dispute resolved.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       403:
 *         description: Admin clearance required.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
    "/dispute/:orderId/resolve",
    authenticateToken,
    ...validate([
        ...disputeValidators.orderIdParam,
        ...disputeValidators.resolve,
    ]),
    async (req, res) => {
        if (req.user.rank !== "ADMIN")
            return res
                .status(403)
                .json({ error: "UNAUTHORIZED. Admin clearance only." });

        const { action } = req.body; // 'APPROVE' or 'REJECT'
        try {
            const dispute = await prisma.$transaction(async (tx) => {
                const current = await tx.dispute.findUnique({
                    where: { orderId: req.params.orderId },
                    select: {
                        id: true,
                        orderId: true,
                        buyerId: true,
                        vendorId: true,
                        status: true,
                    },
                });
                if (!current) throw new Error("Dispute not found.");
                if (current.status !== "OPEN")
                    throw new Error("Dispute already finalized.");

                const order = await tx.order.findUnique({
                    where: { id: req.params.orderId },
                    select: { id: true, pricePaid: true, productId: true },
                });
                if (!order) throw new Error("Original order not found.");

                const nextStatus =
                    action === "APPROVE"
                        ? "REFUND_APPROVED"
                        : "REFUND_REJECTED";
                const updated = await tx.dispute.updateMany({
                    where: { id: current.id, status: "OPEN" },
                    data: {
                        status: nextStatus,
                        resolvedById: req.user.id,
                        resolvedByName: req.user.username,
                        resolvedAt: new Date(),
                    },
                });
                if (!updated.count)
                    throw new Error("Dispute already finalized.");

                if (action === "APPROVE") {
                    await tx.user.update({
                        where: { id: current.buyerId },
                        data: { credits: { increment: order.pricePaid } },
                    });

                    const vendor = await tx.user.findUnique({
                        where: { id: current.vendorId },
                        select: { rank: true, customSplit: true }
                    });
                    
                    const splitRate =
                        vendor.customSplit !== null
                            ? vendor.customSplit
                            : (vendor.rank === "ENTERPRISE" || vendor.rank === "ADMIN")
                              ? 0.75
                              : vendor.rank === "PREMIUM"
                                ? 0.6
                                : 0.5;
                    const vendorCut = order.pricePaid * splitRate;

                    await tx.user.update({
                        where: { id: current.vendorId },
                        data: { vendorBalance: { decrement: vendorCut } },
                    });
                }

                await tx.disputeMessage.create({
                    data: {
                        disputeId: current.id,
                        senderId: req.user.id,
                        senderRank: "ADMIN_SYSTEM",
                        message:
                            action === "APPROVE"
                                ? "SYSTEM: Escrow REFUNDED to Buyer."
                                : "SYSTEM: Refund DENIED. Thread Locked.",
                    },
                });

                await tx.user.update({
                    where: { id: req.user.id },
                    data: { casesClosed: { increment: 1 } },
                });

                return current;
            });

            const vUser = await prisma.user.findUnique({
                where: { id: dispute.vendorId },
            });
            if (vUser && vUser.telegramChatId) {
                if (action === "APPROVE") {
                    await sendVendorTelegramAlert(
                        vUser.telegramChatId,
                        `Tool # ${req.params.orderId.substring(0, 8)} Report # ${dispute.id.substring(0, 8)} Refunded`,
                    );
                } else {
                    await sendVendorTelegramAlert(
                        vUser.telegramChatId,
                        `✅ <b>DISPUTE RESOLVED</b>\n\nOrder <b>#${req.params.orderId.substring(0, 8)}</b> has been formally closed by Administrator <b>${req.user.username}</b>.\n\n<b>Result:</b> Not Refunded\n\n<a href="${VENDOR_DASHBOARD_URL}">Access Seller Terminal</a>`,
                    );
                }
            }

            res.json(disputeResponse.resolved(action));
        } catch (err) {
            res.status(500).json({ error: "System failure." });
        }
    },
);

module.exports = { path: "/api/market", router };
