const express = require("express");
const { validate } = require("../validators/middleware");
const { supportValidators } = require("../validators/support.validator");
const { supportResponse } = require("../models/responses/support.response");
const {
    authenticateToken,
    prisma,
    sendAdminTelegramAlert,
} = require("./shared");

const router = express.Router();

/**
 * @swagger
 * /api/support/ticket:
 *   post:
 *     tags: [support]
 *     summary: Submit a new support ticket.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [subject, message]
 *             properties:
 *               subject: { type: string }
 *               message: { type: string }
 *     responses:
 *       200:
 *         description: Ticket submitted and admin alerted.
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
 *       500:
 *         description: Transmission failed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
    "/ticket",
    authenticateToken,
    ...validate(supportValidators.createTicket),
    async (req, res) => {
        const { subject, message } = req.body;
        if (!subject || !message)
            return res
                .status(400)
                .json({ error: "Invalid transmission payload." });

        try {
            const ticket = await prisma.supportTicket.create({
                data: {
                    userId: req.user.id,
                    subject,
                    status: "PENDING",
                    messages: {
                        create: {
                            senderId: req.user.id,
                            senderRank: "USER",
                            message: message,
                        },
                    },
                },
            });

            const user = await prisma.user.findUnique({
                where: { id: req.user.id },
            });

            const tgMessage = `<b>[ 🚨 NEW SUPPORT TICKET ]</b>\n\n<b>Ticket ID:</b> <code>${ticket.id}</code>\n<b>User:</b> <code>${user.username}</code>\n<b>Subject:</b> <code>${subject}</code>\n\n<b>Message:</b>\n<i>${message}</i>`;

            await sendAdminTelegramAlert(tgMessage, {
                inline_keyboard: [
                    [
                        {
                            text: "✍️ Reply to Ticket",
                            callback_data: `TICK_REPLY|${ticket.id}`,
                        },
                    ],
                    [
                        {
                            text: "❌ Close Ticket",
                            callback_data: `TICK_CLOSE|${ticket.id}`,
                        },
                    ],
                ],
            });

            res.json(supportResponse.ticketSubmitted());
        } catch (err) {
            res.status(500).json({
                error: "Failed to transmit support ticket.",
            });
        }
    },
);

/**
 * @swagger
 * /api/support/tickets:
 *   get:
 *     tags: [support]
 *     summary: List support tickets owned by the caller.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 0 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, maximum: 100 }
 *     responses:
 *       200:
 *         description: Ticket list.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TicketsResponse'
 */
router.get(
    "/tickets",
    authenticateToken,
    ...validate(supportValidators.ticketsQuery),
    async (req, res) => {
        try {
            const page = Math.max(0, parseInt(req.query.page, 10) || 0);
            const limit = Math.min(
                100,
                Math.max(1, parseInt(req.query.limit, 10) || 20),
            );

            const tickets = await prisma.supportTicket.findMany({
                where: { userId: req.user.id },
                orderBy: { createdAt: "desc" },
                skip: page * limit,
                take: limit,
                select: {
                    id: true,
                    subject: true,
                    status: true,
                    createdAt: true,
                },
            });
            res.json(supportResponse.tickets(tickets));
        } catch (err) {
            res.status(500).json({ error: "Failed to locate active tickets." });
        }
    },
);

/**
 * @swagger
 * /api/support/ticket/{id}:
 *   get:
 *     tags: [support]
 *     summary: Get a specific ticket with its message thread.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Ticket with messages.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TicketResponse'
 *       403:
 *         description: Unauthorized access.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Ticket not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
    "/ticket/:id",
    authenticateToken,
    ...validate(supportValidators.ticketIdParam),
    async (req, res) => {
        try {
            const ticket = await prisma.supportTicket.findUnique({
                where: { id: req.params.id },
                include: {
                    messages: {
                        orderBy: { createdAt: "asc" },
                    },
                },
            });

            if (!ticket)
                return res.status(404).json({ error: "Ticket not found." });

            const user = await prisma.user.findUnique({
                where: { id: req.user.id },
            });
            if (ticket.userId !== req.user.id && user.rank !== "ADMIN") {
                return res.status(403).json({ error: "Unauthorized access." });
            }

            res.json(supportResponse.ticket(ticket));
        } catch (err) {
            res.status(500).json({
                error: "Failed to load ticket dialogue.",
            });
        }
    },
);

module.exports = { path: "/api/support", router };
