const express = require("express");
const { validate } = require("../validators/middleware");
const { requestsValidators } = require("../validators/requests.validator");
const { requestsResponse } = require("../models/responses/requests.response");
const {
    authenticateToken,
    prisma,
    publicSubmitLimiter,
    sendAdminTelegramAlert,
} = require("./shared");
const { getLogger } = require("../lib/logger");

const logger = getLogger("requests.routes");

const router = express.Router();

/**
 * @swagger
 * /api/contact:
 *   post:
 *     tags: [requests]
 *     summary: Public contact transmission forwarded to admin Telegram.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, message]
 *             properties:
 *               email: { type: string, format: email }
 *               subject: { type: string, maxLength: 200 }
 *               message: { type: string, maxLength: 5000 }
 *     responses:
 *       200:
 *         description: Contact submitted.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       400:
 *         description: Invalid contact payload.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
    "/contact",
    publicSubmitLimiter,
    ...validate(requestsValidators.contact),
    async (req, res) => {
        const { email, subject, message } = req.body;
        if (!email || !message)
            return res.status(400).json({
                error: "Email Address and Message Body are mandatory.",
            });
        if (
            String(subject || "").length > 200 ||
            String(message).length > 5000
        ) {
            return res.status(400).json({ error: "Invalid contact payload." });
        }

        try {
            const text = `<b>[ ✉️ INCOMING TRANSMISSION ]</b>\n\n<b>From:</b> <code>${email}</code>\n<b>Topic:</b> ${subject || "General Inquiry"}\n\n<b>Payload:</b>\n<i>${message}</i>`;
            await sendAdminTelegramAlert(text);

            res.json(requestsResponse.contactSubmitted());
        } catch (err) {
            res.status(500).json({ error: "Signal interrupted." });
        }
    },
);

/**
 * @swagger
 * /api/requests:
 *   get:
 *     tags: [requests]
 *     summary: List public, approved custom tool requests (with masked requestors).
 *     responses:
 *       200:
 *         description: Public list of approved requests.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/RequestsResponse'
 */
router.get("/requests", async (req, res) => {
    try {
        const requests = await prisma.customRequest.findMany({
            where: { status: "APPROVED" },
            include: { user: { select: { username: true } } },
            orderBy: { createdAt: "desc" },
        });

        const publicRequests = requests.map((r) => {
            let name = r.user.username;
            if (name.length >= 4) {
                const firstPart = name.substring(0, 2);
                const lastPart = name.substring(name.length - 2);
                const asterisks = "*".repeat(
                    name.length - 4 > 6 ? 6 : name.length - 4,
                );
                name = firstPart + asterisks + lastPart;
            } else {
                name = name.charAt(0) + "***";
            }

            return {
                id: r.id,
                title: r.title,
                description: r.description,
                createdAt: r.createdAt,
                requestor: name,
            };
        });

        res.json(requestsResponse.requests(publicRequests));
    } catch (err) {
        logger.error(err);
        res.status(500).json({ error: "Failed to fetch custom requests." });
    }
});

/**
 * @swagger
 * /api/requests/submit:
 *   post:
 *     tags: [requests]
 *     summary: Submit a new custom tool request for admin approval.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, description]
 *             properties:
 *               title: { type: string, maxLength: 150 }
 *               description: { type: string, maxLength: 5000 }
 *     responses:
 *       200:
 *         description: Request submitted.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       400:
 *         description: Invalid payload.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
    "/requests/submit",
    authenticateToken,
    publicSubmitLimiter,
    ...validate(requestsValidators.submit),
    async (req, res) => {
        const { title, description } = req.body;
        if (!title || !description)
            return res
                .status(400)
                .json({ error: "Missing transmission fields" });
        if (String(title).length > 150 || String(description).length > 5000) {
            return res
                .status(400)
                .json({ error: "Invalid request payload size." });
        }

        try {
            const cr = await prisma.customRequest.create({
                data: {
                    userId: req.user.id,
                    title,
                    description,
                    status: "PENDING",
                },
            });

            const text = `📦 <b>NEW CUSTOM REQUEST [PENDING]</b>\n<b>Requestor:</b> ${req.user.username} *(Visible ONLY to Admin)*\n<b>Requested Tool:</b> ${title}\n<b>Details:</b>\n<i>${description}</i>`;
            const kb = {
                inline_keyboard: [
                    [
                        {
                            text: "✅ Approve to Public Board",
                            callback_data: `APPROVEREQ_${cr.id}`,
                        },
                        {
                            text: "❌ Reject",
                            callback_data: `REJECTREQ_${cr.id}`,
                        },
                    ],
                ],
            };

            await sendAdminTelegramAlert(text, kb);

            res.json(requestsResponse.submitted());
        } catch (e) {
            res.status(500).json({ error: "Request engine offline." });
        }
    },
);

/**
 * @swagger
 * /api/requests/{id}/notify:
 *   post:
 *     tags: [requests]
 *     summary: Notify the requestor that a custom request has been fulfilled.
 *     description: Caller must be an admin or a verified vendor owning a shop.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Notification dispatched.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       400:
 *         description: Request already fulfilled.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Caller not a vendor or admin.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Request not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
    "/requests/:id/notify",
    authenticateToken,
    ...validate(requestsValidators.notifyParam),
    async (req, res) => {
        const { id } = req.params;
        try {
            const caller = await prisma.user.findUnique({
                where: { id: req.user.id },
            });
            const isVendor = await prisma.shop.findFirst({
                where: { ownerId: req.user.id },
            });

            if (caller.rank !== "ADMIN" && !isVendor) {
                return res.status(403).json({
                    error: "Only Silverbullet Verified Vendors can trigger this network.",
                });
            }

            const targetRequest = await prisma.customRequest.findUnique({
                where: { id },
            });
            if (!targetRequest)
                return res.status(404).json({ error: "Request not found." });

            if (targetRequest.status === "FULFILLED") {
                return res.status(400).json({
                    error: "This request has already been mathematically fulfilled.",
                });
            }

            const alias = isVendor
                ? `store <b>${isVendor.shopName}</b>`
                : `the <b>Administration Marketplace</b>`;

            await prisma.notification.create({
                data: {
                    userId: targetRequest.userId,
                    message: `Your tool request for "<i>${targetRequest.title}</i>" has just been fulfilled by ${alias}! Review the Marketplace heavily for it.`,
                    type: "SYSTEM",
                    link: "/market",
                },
            });

            await prisma.customRequest.update({
                where: { id },
                data: { status: "FULFILLED" },
            });

            res.json(requestsResponse.notified());
        } catch (e) {
            logger.error(e);
            res.status(500).json({
                error: "Notification dispatcher offline.",
            });
        }
    },
);

module.exports = { path: "/api", router };
