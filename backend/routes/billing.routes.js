const express = require("express");
const { validate } = require("../validators/middleware");
const { billingValidators } = require("../validators/billing.validator");
const { billingResponse } = require("../models/responses/billing.response");
const {
    authenticateToken,
    prisma,
    crypto,
    sendAdminTelegramAlert,
    maskUsername,
} = require("./shared");
const { getLogger } = require("../lib/logger");

const {
    OXAPAY_CHECKOUT_URL,
    OXAPAY_PAYLINK_BASE,
    OXAPAY_API_KEY,
    APP_BASE_URL,
} = require("../env");

const router = express.Router();

const logger = getLogger("billing.routes");

/**
 * @swagger
 * /api/crypto/oxapay/webhook:
 *   post:
 *     tags: [billing]
 *     summary: Webhook receiver for OxaPay Instant Payment Notifications.
 *     description: Validates payment via OxaPay Inquiry API and credits user.
 */
router.post("/crypto/oxapay/webhook", async (req, res) => {
    // We respond 200 immediately to acknowledge receipt to OxaPay so they stop retrying
    res.status(200).send("OK");

    // Extract trackId robustly (handles top-level and nested data structures)
    const trackId = req.body.trackId || req.body.track_id || (req.body.data && req.body.data.track_id);
    const status = req.body.status || (req.body.data && req.body.data.status);
    
    if (!trackId) return;

    // Check if status is paid (case-insensitive)
    const statusStr = String(status).toLowerCase();
    if (statusStr !== "paid" && statusStr !== "completed" && statusStr !== "confirmed") return;

    if (!OXAPAY_API_KEY) {
        console.error(
            "Webhook triggered but OXAPAY_API_KEY is missing in environment.",
        );
        return;
    }

    try {
        // Zero-Trust: Never trust the webhook payload. Always ask OxaPay directly.
        const inquiryRes = await fetch(
            "https://api.oxapay.com/merchants/request/inquiry",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    merchant: OXAPAY_API_KEY,
                    trackId: trackId,
                }),
            },
        );

        if (!inquiryRes.ok) return;
        const inquiryData = await inquiryRes.json();

        // Handle both old API (result: 100, status: "Paid") and new API (status: 200, data.status: "paid")
        const oldApiStatus = String(inquiryData.status || "").toLowerCase();
        const oldApiPaid = inquiryData.result === 100 && (oldApiStatus === "paid" || oldApiStatus === "completed" || oldApiStatus === "confirmed");

        const newApiStatus = String(inquiryData.data?.status || "").toLowerCase();
        const newApiPaid = inquiryData.status === 200 && inquiryData.data && (newApiStatus === "paid" || newApiStatus === "completed" || newApiStatus === "confirmed");

        if (!oldApiPaid && !newApiPaid) {
            return;
        }

        const confirmedTrackId = inquiryData.trackId || (inquiryData.data && inquiryData.data.track_id) || trackId;

        // 1. Find the pending deposit
        const deposit = await prisma.cryptoDeposit.findFirst({
            where: { trackId: String(confirmedTrackId), status: "PENDING" }
        });

        if (!deposit) return; // Already processed or invalid

        // Get the user manually since there's no direct relation in schema
        const user = await prisma.user.findUnique({
            where: { id: deposit.userId }
        });

        if (!user) return;

        // 2. Perform Database Transaction
        await prisma.$transaction(async (tx) => {
            // Update Deposit Status
            await tx.cryptoDeposit.update({
                where: { id: deposit.id },
                data: { status: "COMPLETED" },
            });

            // Credit User Wallet
            await tx.user.update({
                where: { id: deposit.userId },
                data: { credits: { increment: deposit.bulletsReceived } },
            });
        });

        // 3. Notify Admin Chat
        const maskedName = maskUsername(user.username);
        const msg = `💰 <b>NEW DEPOSIT!</b>\n\n<b>User:</b> <code>${maskedName}</code>\n<b>Amount:</b> $${deposit.amountUsd.toFixed(2)}\n<b>Credited:</b> ${deposit.bulletsReceived} BLT\n<b>Gateway:</b> OxaPay\n<b>TrackID:</b> <code>${trackId}</code>`;

        await sendAdminTelegramAlert(msg);
    } catch (err) {
        console.error("[OxaPay Webhook] Critical failure:", err);
    }
});

/**
 * @swagger
 * /api/crypto/invoice:
 *   post:
 *     tags: [billing]
 *     summary: Create a pending crypto deposit invoice.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amountUsd]
 *             properties:
 *               amountUsd: { type: number, minimum: 1 }
 *     responses:
 *       200:
 *         description: Invoice created with pay link.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CryptoInvoiceResponse'
 *       400:
 *         description: Minimum deposit not met.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
    "/crypto/invoice",
    authenticateToken,
    ...validate(billingValidators.cryptoInvoice),
    async (req, res) => {
        const { amountUsd } = req.body;
        if (!amountUsd || amountUsd < 1)
            return res.status(400).json({
                error: "Minimum deposit is legally strictly 1.00 USD.",
            });

        try {
            const amount = Number(amountUsd);
            const bulletsReceived = Math.max(1, Math.floor(amount));
            // Ensure trackId is under 50 characters for OxaPay validation
            const shortUserId = String(req.user.id).replace(/-/g, '').slice(0, 8);
            const trackId = `dep_${shortUserId}_${Date.now()}`;
            
            // Generate OxaPay Invoice Request
            if (!OXAPAY_API_KEY) {
                return res.status(500).json({ error: "OxaPay API key is not configured." });
            }

            const oxapayResponse = await fetch("https://api.oxapay.com/merchants/request", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    merchant: OXAPAY_API_KEY,
                    amount: parseFloat(amount.toFixed(2)),
                    currency: "USD",
                    orderId: trackId,
                    description: `Silverbullet Deposit`,
                    callbackUrl: `${APP_BASE_URL}/api/crypto/oxapay/webhook`,
                    returnUrl: `${APP_BASE_URL}/deposit-history`
                })
            });

            if (!oxapayResponse.ok) {
                logger.error("OxaPay API error: " + oxapayResponse.status);
                return res.status(500).json({ error: "Failed to communicate with payment gateway." });
            }

            const oxapayData = await oxapayResponse.json();
            
            if (oxapayData.result !== 100 || !oxapayData.payLink) {
                logger.error("OxaPay API returned failure:", oxapayData);
                return res.status(500).json({ error: `Payment gateway rejected the request: ${oxapayData.message || 'Unknown error'}` });
            }

            const payLink = oxapayData.payLink;

            const deposit = await prisma.cryptoDeposit.create({
                data: {
                    userId: req.user.id,
                    amountUsd: amount,
                    bulletsReceived,
                    trackId: String(oxapayData.trackId),
                    payLink,
                    status: "PENDING",
                    purchaseType: "BULLETS",
                },
                select: {
                    id: true,
                    amountUsd: true,
                    bulletsReceived: true,
                    trackId: true,
                    payLink: true,
                    status: true,
                    createdAt: true,
                },
            });

            res.json(billingResponse.cryptoInvoice(deposit));
        } catch (err) {
            logger.error("Crypto invoice error:", err);
            res.status(500).json({ error: "Failed to generate invoice." });
        }
    },
);

/**
 * @swagger
 * /api/platform/buy-upgrade:
 *   post:
 *     tags: [billing]
 *     summary: Purchase a platform upgrade with BLT credits.
 *     description: |
 *       Supported itemType values: RANK_STARTER, RANK_PRO, RANK_PREMIUM, RANK_ENTERPRISE,
 *       SOFTWARE_ONLY, SUB_BLUE_BADGE, SUB_COSMETICS. Vendor ranks require a shopName.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [itemType]
 *             properties:
 *               itemType:
 *                 type: string
 *                 enum: [RANK_STARTER, RANK_PRO, RANK_PREMIUM, RANK_ENTERPRISE, SOFTWARE_ONLY, SUB_BLUE_BADGE, SUB_COSMETICS]
 *               shopName: { type: string }
 *     responses:
 *       200:
 *         description: Upgrade purchased.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       400:
 *         description: Insufficient credits or invalid payload.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
    "/platform/buy-upgrade",
    authenticateToken,
    ...validate(billingValidators.buyUpgrade),
    async (req, res) => {
        const { itemType, shopName } = req.body;
        if (!itemType)
            return res
                .status(400)
                .json({ error: "No payload type specified." });

        const pricingMap = {
            RANK_STARTER: 20,
            RANK_PRO: 99,
            RANK_PREMIUM: 299,
            RANK_ENTERPRISE: 899,
            SOFTWARE_ONLY: 187,
            SUB_BLUE_BADGE: 15,
            SUB_COSMETICS: 10,
        };

        const costBlt = pricingMap[itemType];
        if (!costBlt)
            return res
                .status(400)
                .json({ error: "Invalid product selection." });

        const isVendorRank = [
            "RANK_PRO",
            "RANK_PREMIUM",
            "RANK_ENTERPRISE",
        ].includes(itemType);
        let cleanShopName = null;

        if (isVendorRank) {
            if (!shopName || typeof shopName !== "string")
                return res
                    .status(400)
                    .json({ error: "Store name is required." });
            cleanShopName = shopName.trim();
            if (cleanShopName.length < 4 || cleanShopName.length > 30) {
                return res.status(400).json({
                    error: "Store name must be between 4 and 30 characters.",
                });
            }
            const regex = /^[A-Za-z0-9 ]+$/;
            if (!regex.test(cleanShopName)) {
                return res.status(400).json({
                    error: "Store name cannot contain special characters.",
                });
            }

            const existingShop = await prisma.shop.findFirst({
                where: { shopName: cleanShopName },
            });
            if (existingShop) {
                return res.status(400).json({
                    error: "This Store Name is already taken by another vendor!",
                });
            }
        }

        try {
            const user = await prisma.user.findUnique({
                where: { id: req.user.id },
            });
            if (!user) return res.status(404).json({ error: "User not found." });
            const isAdmin = user.rank === "ADMIN";

            const result = await prisma.$transaction(async (tx) => {
                if (!isAdmin) {
                    const debited = await tx.user.updateMany({
                        where: { id: req.user.id, credits: { gte: costBlt } },
                        data: { credits: { decrement: costBlt } },
                    });
                    if (debited.count === 0) {
                        throw new Error("INSUFFICIENT_BLT");
                    }
                }

                const sideEffects = {};
                if (itemType.startsWith("RANK_")) {
                    const rankRank = itemType.split("_")[1];
                    if (!isAdmin) sideEffects.rank = rankRank;
                    if (["PREMIUM", "ENTERPRISE"].includes(rankRank) || isAdmin) {
                        sideEffects.hasSoftwareLicense = true;
                    }
                } else if (itemType === "SOFTWARE_ONLY") {
                    sideEffects.hasSoftwareLicense = true;
                } else if (itemType === "SUB_BLUE_BADGE") {
                    const expiry = new Date();
                    expiry.setDate(expiry.getDate() + 30);
                    sideEffects.hasBlueBadge = true;
                    sideEffects.blueBadgeExpiry = expiry;
                } else if (itemType === "SUB_COSMETICS") {
                    const expiry = new Date();
                    expiry.setDate(expiry.getDate() + 30);
                    sideEffects.colorPassExpiry = expiry;
                }

                if (Object.keys(sideEffects).length > 0) {
                    await tx.user.update({
                        where: { id: req.user.id },
                        data: sideEffects,
                    });
                }

                if (isVendorRank) {
                    const existingUserShop = await tx.shop.findFirst({
                        where: { ownerId: user.id },
                    });
                    if (!existingUserShop) {
                        await tx.shop.create({
                            data: {
                                ownerId: user.id,
                                shopName: cleanShopName,
                                shopDescription:
                                    "A brand new seller on the Silverbullet Marketplace.",
                                isTrusted: false,
                            },
                        });
                    } else {
                        await tx.shop.update({
                            where: { id: existingUserShop.id },
                            data: { shopName: cleanShopName },
                        });
                    }
                }

                return true;
            }, { isolationLevel: "Serializable" });

            res.json(billingResponse.upgradePurchased());
        } catch (err) {
            if (err?.message === "INSUFFICIENT_BLT") {
                return res.status(400).json({ error: "Insufficient BLT Balance." });
            }
            logger.error("Purchase error:", err);
            res.status(500).json({
                error: "Failed to process internal transaction.",
            });
        }
    },
);

module.exports = { path: "/api", router };
