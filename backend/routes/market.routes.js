const express = require("express");
const { validate } = require("../validators/middleware");
const { marketValidators } = require("../validators/market.validator");
const { marketResponse } = require("../models/responses/market.response");
const {
    authenticateToken,
    prisma,
    sendVendorTelegramAlert,
    maskUsername,
    VENDOR_DASHBOARD_URL,
} = require("./shared");
const { getLogger } = require("../lib/logger");

const logger = getLogger("market.routes");

const router = express.Router();

/**
 * @swagger
 * /api/marketplace/buy:
 *   post:
 *     tags: [market]
 *     summary: Buy a single unit of a product (legacy endpoint using product stock counter).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId]
 *             properties:
 *               productId: { type: string }
 *     responses:
 *       200:
 *         description: Purchase complete.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       400:
 *         description: Insufficient funds or out of stock.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
    "/marketplace/buy",
    authenticateToken,
    ...validate(marketValidators.buyBody),
    async (req, res) => {
        const { productId } = req.body;
        if (!productId)
            return res.status(400).json({ error: "ProductID missing." });

        try {
            const result = await prisma.$transaction(async (tx) => {
                const product = await tx.product.findUnique({
                    where: { id: productId },
                    select: {
                        id: true,
                        stock: true,
                        price: true,
                        marketBid: true,
                        shop: {
                            select: {
                                owner: {
                                    select: {
                                        id: true,
                                        rank: true,
                                        customSplit: true,
                                        vendorBalance: true,
                                    },
                                },
                            },
                        },
                    },
                });

                if (!product) throw new Error("Product destroyed or missing.");

                const buyerUpdate = await tx.user.updateMany({
                    where: { id: req.user.id, credits: { gte: product.price } },
                    data: { credits: { decrement: product.price } },
                });
                if (!buyerUpdate.count) throw new Error("INSUFFICIENT_FUNDS");

                const stockUpdate = await tx.product.updateMany({
                    where: { id: product.id, stock: { gte: 1 } },
                    data: { stock: { decrement: 1 } },
                });
                if (!stockUpdate.count) throw new Error("Out of stock.");

                const existingVendor = product.shop.owner;
                let splitMultiplier = 0;
                if (product.shop.owner.customSplit !== null) {
                    splitMultiplier = product.shop.owner.customSplit;
                } else if (
                    product.shop.owner.rank === "ENTERPRISE" ||
                    product.shop.owner.rank === "ADMIN"
                ) {
                    splitMultiplier = 0.75;
                } else if (product.shop.owner.rank === "PREMIUM") {
                    splitMultiplier = 0.6;
                } else {
                    splitMultiplier = 0.5;
                }
                
                const vendorCut = (product.price * splitMultiplier) - (product.marketBid || 0);

                await tx.user.update({
                    where: { id: existingVendor.id },
                    data: { vendorBalance: { increment: vendorCut } },
                });

                await tx.order.create({
                    data: {
                        productId: product.id,
                        userId: req.user.id,
                        pricePaid: product.price,
                    },
                });

                return { vendorChatId: null };
            });

            res.json(
                marketResponse.purchased(
                    "Transaction completed. Payload injected into Digital Stash.",
                ),
            );
        } catch (err) {
            const message = err.message || "Escrow processing failed.";
            logger.error("Purchase error:", err);
            res.status(message === "INSUFFICIENT_FUNDS" ? 400 : 400).json({
                error: message,
            });
        }
    },
);

/**
 * @swagger
 * /api/shops:
 *   get:
 *     tags: [market]
 *     summary: List shops sorted by market bid and views.
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
 *         description: Shop list with owner usernames masked.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShopsResponse'
 */
router.get(
    "/shops",
    authenticateToken,
    ...validate(marketValidators.shopsQuery),
    async (req, res) => {
        try {
            const page = Math.max(0, parseInt(req.query.page, 10) || 0);
            const limit = Math.min(
                100,
                Math.max(1, parseInt(req.query.limit, 10) || 20),
            );

            await prisma.shop.updateMany({
                where: { bidExpiresAt: { lt: new Date() } },
                data: { marketBid: 0, bidExpiresAt: null },
            });

            const shops = await prisma.shop.findMany({
                where: {
                    owner: {
                        rank: {
                            in: ["PRO", "PREMIUM", "ENTERPRISE", "ADMIN"],
                        },
                    },
                },
                include: {
                    owner: {
                        select: { username: true, avatarUrl: true, rank: true },
                    },
                    _count: { select: { products: true } },
                },
                orderBy: [{ marketBid: "desc" }, { views: "desc" }],
                skip: page * limit,
                take: limit,
            });

            const maskedShops = shops.map((s) => ({
                ...s,
                owner: {
                    ...s.owner,
                    username: maskUsername(s.owner.username, req),
                },
            }));

            res.json(marketResponse.shops(maskedShops));
        } catch (err) {
            res.status(500).json({
                error: "Market Index Error: Shops unavailable.",
            });
        }
    },
);

/**
 * @swagger
 * /api/market/accounts:
 *   get:
 *     tags: [market]
 *     summary: Search and list products in the ACCOUNT category.
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: country
 *         schema: { type: string }
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [most_sold, newest] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 0 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 24, maximum: 200 }
 *     responses:
 *       200:
 *         description: Accounts list.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AccountsResponse'
 */
router.get(
    "/market/accounts",
    ...validate(marketValidators.accountsQuery),
    async (req, res) => {
        try {
            const { search, country, sort } = req.query;
            const page = Math.max(0, parseInt(req.query.page, 10) || 0);
            const limit = Math.min(
                200,
                Math.max(1, parseInt(req.query.limit, 10) || 24),
            );

            const where = { stock: { gt: 0 } };
            if (search) {
                where.productName = { contains: search, mode: "insensitive" };
            }
            if (country && country !== "All" && country !== "Global") {
                where.country = country;
            }

            const allAccounts = await prisma.product.findMany({
                where,
                orderBy:
                    sort === "most_sold"
                        ? [{ marketBid: "desc" }, { sales: "desc" }]
                        : sort === "price_asc"
                        ? [{ marketBid: "desc" }, { price: "asc" }]
                        : sort === "price_desc"
                        ? [{ marketBid: "desc" }, { price: "desc" }]
                        : [{ marketBid: "desc" }, { createdAt: "desc" }],
                take: 1500,
                select: {
                    id: true,
                    productName: true,
                    description: true,
                    price: true,
                    stock: true,
                    category: true,
                    country: true,
                    sales: true,
                    createdAt: true,
                    shopId: true,
                    marketBid: true,
                    shop: {
                        select: {
                            shopName: true,
                            storeColor: true,
                            storeEffect: true,
                            isTrusted: true,
                        },
                    },
                },
            });

            const bidded = [];
            const standardByShop = {};

            for (const acc of allAccounts) {
                if (acc.marketBid > 0) {
                    bidded.push(acc);
                } else {
                    if (!standardByShop[acc.shopId]) {
                        standardByShop[acc.shopId] = [];
                    }
                    standardByShop[acc.shopId].push(acc);
                }
            }

            bidded.sort((a, b) => (b.marketBid || 0) - (a.marketBid || 0));

            const interleavedStandard = [];
            const shopIds = Object.keys(standardByShop);
            let hasMore = true;
            let index = 0;

            while (hasMore) {
                hasMore = false;
                for (const shopId of shopIds) {
                    if (index < standardByShop[shopId].length) {
                        interleavedStandard.push(standardByShop[shopId][index]);
                        hasMore = true;
                    }
                }
                index++;
            }

            const combined = [...bidded, ...interleavedStandard];
            const accounts = combined.slice(page * limit, (page + 1) * limit);

            res.json(marketResponse.accounts(accounts));
        } catch (err) {
            logger.error(err);
            res.status(500).json({ error: "Failed to query global accounts." });
        }
    },
);

/**
 * @swagger
 * /api/shops/{id}:
 *   get:
 *     tags: [market]
 *     summary: Get a shop detail page; increments view counter and hides log content for non-buyers.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Shop with enriched products.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ShopResponse'
 *       404:
 *         description: Storefront not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get(
    "/shops/:id",
    authenticateToken,
    ...validate(marketValidators.shopIdParam),
    async (req, res) => {
        try {
            await prisma.shop.update({
                where: { id: req.params.id },
                data: { views: { increment: 1 } },
            });

            const shop = await prisma.shop.findUnique({
                where: { id: req.params.id },
                include: {
                    owner: {
                        select: {
                            username: true,
                            avatarUrl: true,
                            rank: true,
                            lastOnline: true,
                        },
                    },
                    products: {
                        where: { stock: { gt: 0 } }
                    },
                },
            });
            if (!shop)
                return res.status(404).json({
                    error: "Storefront not found or seized by Admin.",
                });

            const validRanks = ["PRO", "PREMIUM", "ENTERPRISE", "ADMIN"];
            if (!validRanks.includes(shop.owner.rank)) {
                return res.status(404).json({
                    error: "Storefront not found or seized by Admin.",
                });
            }

            shop.owner.username = maskUsername(shop.owner.username, req);

            const allReviews = await prisma.productReview.findMany({
                where: { productId: { in: shop.products.map((p) => p.id) } },
            });

            const userOrders = await prisma.order.findMany({
                where: {
                    userId: req.user.id,
                    productId: { in: shop.products.map((p) => p.id) },
                },
            });

            const enrichedProducts = shop.products.map((p) => {
                const productReviews = allReviews.filter(
                    (r) => r.productId === p.id,
                );
                const avg =
                    productReviews.length > 0
                        ? (
                              productReviews.reduce(
                                  (sum, r) => sum + r.score,
                                  0,
                              ) / productReviews.length
                          ).toFixed(1)
                        : "0.0";

                const hasPurchased = userOrders.some(
                    (o) => o.productId === p.id,
                );

                return {
                    ...p,
                    logContent: hasPurchased ? p.logContent : "LOCKED",
                    averageScore: avg,
                    totalReviews: productReviews.length,
                    userScore:
                        productReviews.find((r) => r.userId === req.user.id)
                            ?.score || 0,
                    hasPurchased,
                };
            });

            shop.owner.username = maskUsername(shop.owner.username, req);

            res.json(
                marketResponse.shop({ ...shop, products: enrichedProducts }),
            );
        } catch (err) {
            res.status(500).json({ error: "Failed to access storefront." });
        }
    },
);

/**
 * @swagger
 * /api/tickets/create:
 *   post:
 *     tags: [market]
 *     summary: Create a market ticket against a shop.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [shopId, message]
 *             properties:
 *               shopId: { type: string }
 *               message: { type: string }
 *     responses:
 *       200:
 *         description: Ticket created.
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
    "/tickets/create",
    authenticateToken,
    ...validate(marketValidators.ticketCreate),
    async (req, res) => {
        const { shopId, message } = req.body;
        if (!shopId || !message)
            return res.status(400).json({ error: "Invalid ticket payload." });

        try {
            await prisma.ticket.create({
                data: {
                    shopId,
                    message,
                    status: "OPEN",
                },
            });
            res.json(marketResponse.ticketCreated());
        } catch (err) {
            res.status(500).json({ error: "Ticket transmission failed." });
        }
    },
);

/**
 * @swagger
 * /api/market/purchase/{productId}:
 *   post:
 *     tags: [market]
 *     summary: Purchase N stock lines from a product (preferred over /marketplace/buy).
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
 *         description: Purchase complete with purchased log.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       400:
 *         description: Insufficient stock or funds.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Product missing.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
    "/market/purchase/:productId",
    authenticateToken,
    ...validate([
        ...marketValidators.purchaseParam,
        ...marketValidators.purchaseBody,
    ]),
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
                        sales: { increment: amount },
                    },
                }),
            ]);

            if (product.shop.owner.telegramChatId) {
                await sendVendorTelegramAlert(
                    product.shop.owner.telegramChatId,
                    `💰 <b>SALE INCOMING!</b>\n\nYou just sold <b>${amount}x ${product.productName}</b>.\nRevenue Generated: <b>${vendorRevenue.toFixed(2)}</b> Bullets.\n\n<a href="${VENDOR_DASHBOARD_URL}">Access Seller Terminal</a>`,
                );
            }

            res.json(
                marketResponse.purchased(
                    "Transaction successful. Log Decrypted.",
                    {
                        log: purchasedLines,
                    },
                ),
            );
        } catch (err) {
            res.status(500).json({ error: "Transaction array failed." });
        }
    },
);

/**
 * @swagger
 * /api/market/review/{productId}:
 *   post:
 *     tags: [market]
 *     summary: Submit a one-time review for a purchased order.
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
 *             required: [score, orderId]
 *             properties:
 *               score: { type: integer, minimum: 1, maximum: 5 }
 *               orderId: { type: string }
 *     responses:
 *       200:
 *         description: Review created.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       400:
 *         description: Invalid scoring matrix or missing receipt.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Review already submitted or unauthorized.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
    "/market/review/:productId",
    authenticateToken,
    ...validate(marketValidators.review),
    async (req, res) => {
        const { score, orderId } = req.body;
        if (!score || score < 1 || score > 5)
            return res.status(400).json({ error: "Invalid scoring matrix." });
        if (!orderId)
            return res
                .status(400)
                .json({ error: "Missing explicit receipt signature." });

        try {
            const receipt = await prisma.order.findFirst({
                where: {
                    id: orderId,
                    productId: req.params.productId,
                    userId: req.user.id,
                },
            });

            if (!receipt) {
                return res.status(403).json({
                    error: "Blocked: You do not own a valid cryptographic receipt for this Log.",
                });
            }

            const existing = await prisma.productReview.findFirst({
                where: { orderId: orderId },
            });

            if (existing) {
                return res.status(403).json({
                    error: "Rating matrix locked. You cannot modify an inscribed review for this explicit receipt.",
                });
            } else {
                await prisma.productReview.create({
                    data: {
                        productId: req.params.productId,
                        userId: req.user.id,
                        orderId: orderId,
                        score,
                    },
                });
            }

            const productData = await prisma.product.findUnique({
                where: { id: req.params.productId },
            });
            if (productData) {
                const shopProducts = await prisma.product.findMany({
                    where: { shopId: productData.shopId },
                });
                const shopProductIds = shopProducts.map((p) => p.id);

                const stats = await prisma.productReview.aggregate({
                    where: { productId: { in: shopProductIds } },
                    _avg: { score: true },
                });
                const orderCount = await prisma.order.count({
                    where: { productId: { in: shopProductIds } },
                });

                if (orderCount >= 50 && stats._avg.score >= 4.5) {
                    await prisma.shop.update({
                        where: { id: productData.shopId },
                        data: { isTrusted: true },
                    });
                }
            }

            res.json(marketResponse.reviewCreated());
        } catch (err) {
            logger.error("Review Error:", err);
            res.status(500).json({ error: "Review injection failed." });
        }
    },
);

module.exports = { path: "/api", router };
