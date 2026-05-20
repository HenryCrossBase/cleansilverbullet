const express = require("express");
const { validate } = require("../validators/middleware");
const { enterpriseValidators } = require("../validators/enterprise.validator");
const {
    enterpriseResponse,
} = require("../models/responses/enterprise.response");
const {
    authenticateToken,
    prisma,
    sendAdminTelegramAlert,
    maskUsername,
} = require("./shared");
const { getLogger } = require("../lib/logger");

const logger = getLogger("enterprise.routes");
const router = express.Router();

/**
 * @swagger
 * /api/enterprise/bid:
 *   post:
 *     tags: [enterprise]
 *     summary: Place a 24h marketplace visibility bid for your shop.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [amount]
 *             properties:
 *               amount: { type: number, minimum: 0.01 }
 *     responses:
 *       200:
 *         description: Bid placed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       400:
 *         description: Invalid bid or insufficient vault.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: No storefront registered.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
    "/bid",
    authenticateToken,
    ...validate(enterpriseValidators.bid),
    async (req, res) => {
        const { amount } = req.body;
        const bidAmount = parseFloat(amount);

        if (isNaN(bidAmount) || bidAmount <= 0) {
            return res.status(400).json({ error: "Invalid bid logic." });
        }

        try {
            const user = await prisma.user.findUnique({
                where: { id: req.user.id },
                include: { shops: true },
            });
            if (!user || user.shops.length === 0)
                return res
                    .status(403)
                    .json({ error: "No storefront registered." });

            const isAdmin = user.rank === "ADMIN";

            if (!isAdmin && user.vendorBalance < bidAmount) {
                return res.status(400).json({
                    error: `Insufficient Vault Balance. You have $${user.vendorBalance.toFixed(2)} available.`,
                });
            }

            const shop = user.shops[0];

            const txs = [];
            if (!isAdmin) {
                txs.push(
                    prisma.user.update({
                        where: { id: user.id },
                        data: { vendorBalance: { decrement: bidAmount } },
                    }),
                );
            }
            txs.push(
                prisma.shop.update({
                    where: { id: shop.id },
                    data: {
                        marketBid: { increment: bidAmount },
                        bidExpiresAt: new Date(
                            Date.now() + 24 * 60 * 60 * 1000,
                        ),
                    },
                }),
            );

            await prisma.$transaction(txs);

            res.json(enterpriseResponse.bidPlaced(bidAmount));
        } catch (e) {
            res.status(500).json({ error: "Transaction interrupted." });
        }
    },
);

/**
 * @swagger
 * /api/enterprise/dashboard:
 *   get:
 *     tags: [enterprise]
 *     summary: Full vendor dashboard (stats, reviews, disputes, recent sales, top stores).
 *     description: Admins additionally receive a globalDisputes payload.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Vendor dashboard payload.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DashboardResponse'
 */
router.get("/dashboard", authenticateToken, async (req, res) => {
    try {
        await prisma.shop.updateMany({
            where: { bidExpiresAt: { lt: new Date() } },
            data: { marketBid: 0, bidExpiresAt: null },
        });

        const highestShop = await prisma.shop.findFirst({
            orderBy: { marketBid: "desc" },
            select: { marketBid: true },
        });
        const topMarketBid = highestShop ? highestShop.marketBid : 0;

        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: {
                shops: {
                    include: {
                        products: {
                            orderBy: { createdAt: "desc" },
                        },
                    },
                },
            },
        });

        let globalDisputes = null;
        if (req.user.rank === "ADMIN") {
            const adminDisputes = await prisma.dispute.findMany({
                orderBy: { createdAt: "desc" },
            });
            const allBuyers = await prisma.user.findMany({
                where: {
                    id: { in: adminDisputes.map((d) => d.buyerId) },
                },
            });
            const allVendors = await prisma.user.findMany({
                where: {
                    id: { in: adminDisputes.map((d) => d.vendorId) },
                },
            });

            globalDisputes = adminDisputes.map((d) => {
                const b = allBuyers.find((u) => u.id === d.buyerId);
                const v = allVendors.find((u) => u.id === d.vendorId);
                return {
                    id: d.id,
                    orderId: d.orderId,
                    status: d.status,
                    createdAt: d.createdAt,
                    buyerName: b ? b.username : "Unknown",
                    vendorName: v ? v.username : "Unknown",
                    resolvedById: d.resolvedById,
                    resolvedByName: d.resolvedByName,
                    resolvedAt: d.resolvedAt,
                };
            });
        }

        if (!user || user.shops.length === 0) {
            return res.json(
                enterpriseResponse.dashboardSetupNeeded(globalDisputes),
            );
        }

        const shop = user.shops[0];
        const productIds = shop.products.map((p) => p.id);

        const now = new Date();
        const ago24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const ago30d = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const allOrders = await prisma.order.findMany({
            where: { productId: { in: productIds } },
        });

        const myDisputes = await prisma.dispute.findMany({
            where: { vendorId: user.id },
            orderBy: { createdAt: "desc" },
        });

        const refundedOrderIds = new Set(
            myDisputes
                .filter((d) => d.status === "REFUND_APPROVED")
                .map((d) => d.orderId)
        );

        const totalOrders = allOrders.length;
        const splitMultiplier =
            user.customSplit !== null
                ? user.customSplit
                : (user.rank === "ENTERPRISE" || user.rank === "ADMIN")
                  ? 0.75
                  : user.rank === "PREMIUM"
                    ? 0.6
                    : 0.5;
        const income24h = allOrders
            .filter((o) => o.createdAt >= ago24h && !refundedOrderIds.has(o.id))
            .reduce((sum, o) => sum + o.pricePaid * splitMultiplier, 0);
        const income30d = allOrders
            .filter((o) => o.createdAt >= ago30d && !refundedOrderIds.has(o.id))
            .reduce((sum, o) => sum + o.pricePaid * splitMultiplier, 0);

        const totalReviews = await prisma.productReview.count({
            where: { productId: { in: productIds } },
        });

        let reviews = [];

        try {
            const rawReviews = await prisma.productReview.findMany({
                where: { productId: { in: productIds } },
                orderBy: { createdAt: "desc" },
                take: 10,
            });

            const userFetches = rawReviews.map((r) =>
                prisma.user.findUnique({
                    where: { id: r.userId },
                    select: { username: true },
                }),
            );
            const users = await Promise.all(userFetches);

            reviews = rawReviews.map((r, idx) => ({
                score: r.score,
                createdAt: r.createdAt,
                productId: r.productId,
                reviewer: maskUsername(
                    users[idx]?.username || "Anonymous",
                    req,
                ),
            }));
        } catch (e) {}



        await prisma.notification.updateMany({
            where: { userId: user.id, type: "DISPUTE", read: false },
            data: { read: true },
        });

        const disputeBuyerIds = myDisputes.map((d) => d.buyerId);
        const disputeBuyers = await prisma.user.findMany({
            where: { id: { in: disputeBuyerIds } },
            select: { id: true, username: true },
        });

        const disputesPayload = myDisputes.map((d) => {
            const b = disputeBuyers.find((u) => u.id === d.buyerId);
            return {
                ...d,
                buyerName: maskUsername(b ? b.username : "Unknown", req),
            };
        });

        const orderBuyerIds = [...new Set(allOrders.map((o) => o.userId))];
        const orderBuyers = await prisma.user.findMany({
            where: { id: { in: orderBuyerIds } },
            select: { id: true, username: true },
        });

        const sortedOrders = [...allOrders].sort(
            (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
        );
        const recentSales = sortedOrders.map((o) => {
            const product = shop.products.find((p) => p.id === o.productId);
            const buyer = orderBuyers.find((u) => u.id === o.userId);
            return {
                id: o.id,
                productId: o.productId,
                productName: product ? product.productName : "Unknown Product",
                pricePaid: o.pricePaid,
                vendorCut: o.pricePaid * splitMultiplier,
                isRefunded: refundedOrderIds.has(o.id),
                buyerName: maskUsername(
                    buyer ? buyer.username : "Anonymous",
                    req,
                ),
                createdAt: o.createdAt,
            };
        });

        const topStoresRaw = await prisma.user.findMany({
            where: {
                rank: {
                    in: ["PRO", "PREMIUM", "ENTERPRISE", "ADMIN"],
                },
            },
            select: {
                username: true,
                vendorBalance: true,
                shops: { select: { shopName: true } },
            },
            orderBy: { vendorBalance: "desc" },
            take: 8,
        });
        const topStores = topStoresRaw.map((u) => ({
            username: u.username,
            vendorBalance: u.vendorBalance,
            storeName:
                u.shops && u.shops.length > 0
                    ? u.shops[0].shopName
                    : u.username + "'s Realm",
        }));

        res.json(
            enterpriseResponse.dashboard({
                user,
                shop,
                highestMarketBid: topMarketBid,
                vendorBalance: user.vendorBalance,
                totalOrders,
                income24h,
                income30d,
                totalReviews,
                reviews,
                disputes: disputesPayload,
                globalDisputes: globalDisputes,
                recentSales,
                topStores,
            }),
        );
    } catch (err) {
        res.status(500).json({ error: "Enterprise terminal crash." });
    }
});

/**
 * @swagger
 * /api/enterprise/tg-token:
 *   get:
 *     tags: [enterprise]
 *     summary: Get a one-time Telegram link token used to bind the vendor's Telegram account.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token (or linked status) returned.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TelegramTokenResponse'
 */
router.get("/tg-token", authenticateToken, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
        });
        if (!user) return res.status(404).json({ error: "User not found." });

        if (user.telegramChatId) {
            return res.json(enterpriseResponse.tgLinked());
        }

        let token = user.telegramLinkToken;
        if (!token) {
            const crypto = require("crypto");

            token = crypto.randomBytes(10).toString("hex").toUpperCase();
            await prisma.user.update({
                where: { id: user.id },
                data: { telegramLinkToken: token },
            });
        }

        res.json(enterpriseResponse.tgToken(token));
    } catch (err) {
        res.status(500).json({ error: "Token generator failure." });
    }
});

/**
 * @swagger
 * /api/enterprise/setup:
 *   post:
 *     tags: [enterprise]
 *     summary: Create the vendor's first storefront (requires vendor rank and Telegram link).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [shopName]
 *             properties:
 *               shopName: { type: string, maxLength: 30 }
 *               avatarUrl: { type: string }
 *               bannerUrl: { type: string }
 *     responses:
 *       200:
 *         description: Shop created.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SetupDoneResponse'
 *       400:
 *         description: Shop name conflict or already exists.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Vendor tier or TG link missing.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
    "/setup",
    authenticateToken,
    ...validate(enterpriseValidators.setup),
    async (req, res) => {
        try {
            const { shopName, avatarUrl, bannerUrl } = req.body;

            const user = await prisma.user.findUnique({
                where: { id: req.user.id },
                include: { shops: true },
            });
            if (
                !user ||
                !["PRO", "PREMIUM", "ENTERPRISE", "ADMIN"].includes(user.rank)
            ) {
                return res
                    .status(403)
                    .json({ error: "Unauthorized. Vendor Tier required." });
            }

            if (!user.telegramChatId) {
                return res.status(403).json({
                    error: "Telegram Secure Link is required before opening a storefront.",
                });
            }

            if (user.shops.length > 0) {
                return res.status(400).json({
                    error: "You already have a vendor storefront allocated.",
                });
            }

            if (!shopName || shopName.trim().length === 0) {
                return res
                    .status(400)
                    .json({ error: "Store Name is required." });
            }
            const cleanName = shopName.trim();
            if (cleanName.length > 30) {
                return res.status(400).json({
                    error: "Store Name must be 30 characters or less.",
                });
            }

            const existingShops = await prisma.shop.findMany({
                select: { shopName: true },
            });
            const isTaken = existingShops.some(
                (s) => s.shopName.toLowerCase() === cleanName.toLowerCase(),
            );

            if (isTaken) {
                return res.status(400).json({
                    error: `The store name '${cleanName}' is already locked by another user.`,
                });
            }

            const newShop = await prisma.shop.create({
                data: {
                    ownerId: user.id,
                    shopName: cleanName,
                    shopDescription: "Welcome to my store!",
                    avatarUrl: avatarUrl ? avatarUrl.trim() : null,
                    bannerUrl: bannerUrl ? bannerUrl.trim() : null,
                },
            });

            res.json(enterpriseResponse.setupDone(newShop));
        } catch (err) {
            logger.error("Shop Setup Error:", err);
            res.status(500).json({
                error: "Critical error during vendor setup sequence.",
            });
        }
    },
);

/**
 * @swagger
 * /api/enterprise/bulk-price:
 *   put:
 *     tags: [enterprise]
 *     summary: Bulk update price for all products in a category owned by the caller.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [category, newPrice]
 *             properties:
 *               category: { type: string }
 *               newPrice: { type: integer, minimum: 1 }
 *     responses:
 *       200:
 *         description: Products updated count returned.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       400:
 *         description: Missing parameters.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put(
    "/bulk-price",
    authenticateToken,
    ...validate(enterpriseValidators.bulkPrice),
    async (req, res) => {
        const { category, newPrice } = req.body;
        if (!category || !newPrice)
            return res.status(400).json({ error: "Missing bulk parameters." });

        try {
            const user = await prisma.user.findUnique({
                where: { id: req.user.id },
                include: { shops: true },
            });
            if (user.shops.length === 0)
                return res.status(403).json({ error: "Unauthorized." });

            const result = await prisma.product.updateMany({
                where: {
                    shopId: user.shops[0].id,
                    productName: category,
                },
                data: {
                    price: parseInt(newPrice),
                },
            });

            res.json(enterpriseResponse.bulkPrice(result.count));
        } catch (err) {
            res.status(500).json({ error: "Bulk operation exception." });
        }
    },
);

router.post(
    "/product-bid",
    authenticateToken,
    ...validate(enterpriseValidators.productBid),
    async (req, res) => {
        const { productId, amount } = req.body;
        const bidAmount = parseFloat(amount);

        try {
            const user = await prisma.user.findUnique({
                where: { id: req.user.id },
                include: { shops: true },
            });
            if (!user || user.shops.length === 0) {
                return res.status(403).json({ error: "No storefront registered." });
            }

            const shop = user.shops[0];
            const product = await prisma.product.findFirst({
                where: { id: productId, shopId: shop.id },
            });

            if (!product) {
                return res.status(404).json({ error: "Product not found or not owned by you." });
            }

            const splitMultiplier =
                user.customSplit !== null
                    ? user.customSplit
                    : (user.rank === "ENTERPRISE" || user.rank === "ADMIN")
                      ? 0.75
                      : user.rank === "PREMIUM"
                        ? 0.6
                        : 0.5;

            const maxAllowedBid = product.price * splitMultiplier;
            if (bidAmount >= maxAllowedBid) {
                return res.status(400).json({ 
                    error: `You cannot bid with this amount! Max allowed bid is ${maxAllowedBid.toFixed(2)} BLT to avoid negative revenue.` 
                });
            }

            await prisma.product.update({
                where: { id: product.id },
                data: { marketBid: bidAmount },
            });

            res.json({ success: true, message: "Product bid updated successfully." });
        } catch (err) {
            logger.error(err);
            res.status(500).json({ error: "Failed to set product bid." });
        }
    },
);

router.post(
    "/category-bid",
    authenticateToken,
    ...validate(enterpriseValidators.categoryBid),
    async (req, res) => {
        const { productName, amount } = req.body;
        const bidAmount = parseFloat(amount);

        try {
            const user = await prisma.user.findUnique({
                where: { id: req.user.id },
                include: { shops: true },
            });
            if (!user || user.shops.length === 0) {
                return res.status(403).json({ error: "No storefront registered." });
            }

            const shop = user.shops[0];
            
            // Validate bid amount based on the split
            const splitMultiplier =
                user.customSplit !== null
                    ? user.customSplit
                    : (user.rank === "ENTERPRISE" || user.rank === "ADMIN")
                      ? 0.75
                      : user.rank === "PREMIUM"
                        ? 0.6
                        : 0.5;

            // Find an example product to check the price
            const exampleProduct = await prisma.product.findFirst({
                where: { shopId: shop.id, productName, stock: { gt: 0 } }
            });

            if (!exampleProduct) {
                 return res.status(404).json({ error: "No available stock found for this category." });
            }

            const maxAllowedBid = exampleProduct.price * splitMultiplier;
            if (bidAmount >= maxAllowedBid) {
                 return res.status(400).json({ 
                    error: `You cannot bid with this amount! Max allowed bid is ${maxAllowedBid.toFixed(2)} BLT to avoid negative revenue.` 
                });
            }

            // Get all products matching this category that are in stock
            const targetProducts = await prisma.product.findMany({
                where: { shopId: shop.id, productName, stock: { gt: 0 } },
                take: 10,
                orderBy: { createdAt: 'desc' }
            });

            if (targetProducts.length === 0) {
                 return res.status(404).json({ error: "No available stock found for this category to bid on." });
            }

            // First reset all marketbids for this user to ensure we don't exceed 10 total
            await prisma.product.updateMany({
                where: { shopId: shop.id },
                data: { marketBid: 0 }
            });

            // Now apply the new bid to up to 10 items
            const targetIds = targetProducts.map(p => p.id);
            await prisma.product.updateMany({
                where: { id: { in: targetIds } },
                data: { marketBid: bidAmount }
            });

            res.json({ success: true, message: `Successfully placed a bid of ${bidAmount} BLT on ${targetIds.length} items in category: ${productName}. Previous product bids have been cleared to ensure the 10 account limit.` });

        } catch (err) {
            logger.error(err);
            res.status(500).json({ error: "Failed to set category bid." });
        }
    }
);

/**
 * @swagger
 * /api/enterprise/products:
 *   post:
 *     tags: [enterprise]
 *     summary: Create multiple products from a multi-line log payload.
 *     description: Each non-empty line of logContent becomes a separate single-stock product entry.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productName, price, logContent]
 *             properties:
 *               productName: { type: string }
 *               description: { type: string }
 *               price: { type: integer, minimum: 1 }
 *               logContent: { type: string, description: Newline-separated log entries. }
 *               category: { type: string }
 *               country: { type: string }
 *     responses:
 *       200:
 *         description: Products created.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       400:
 *         description: Missing or empty payload.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
    "/products",
    authenticateToken,
    ...validate(enterpriseValidators.createProducts),
    async (req, res) => {
        const {
            productName,
            description,
            price,
            logContent,
            category,
            country,
        } = req.body;
        if (!productName || !price || !logContent)
            return res
                .status(400)
                .json({ error: "Missing Log injection parameters." });

        try {
            const user = await prisma.user.findUnique({
                where: { id: req.user.id },
                include: { shops: true },
            });
            if (user.shops.length === 0)
                return res.status(403).json({ error: "Unauthorized vendor." });

            const lines = logContent
                .split("\n")
                .filter((l) => l.trim().length > 0);
            if (lines.length === 0)
                return res.status(400).json({ error: "Payload nullified." });

            const duplicateCheck = await prisma.product.findFirst({
                where: {
                    logContent: {
                        in: lines.map(l => l.trim())
                    }
                }
            });

            if (duplicateCheck) {
                return res.status(400).json({ error: "this item is already added by you or another seller !" });
            }

            const payloadMappings = [];
            
            for (const line of lines) {
                const trimmedLine = line.trim();
                
                if (req.body.isBulk) {
                    const parts = trimmedLine.split(' | ');
                    if (parts.length !== 6) {
                        return res.status(400).json({ error: "Wrong format! Bulk upload MUST use: ProductName | CountryCode | Description | URL | Email | Password" });
                    }
                    
                    const pName = parts[0].trim();
                    const pCountry = parts[1].trim();
                    const pDesc = parts[2].trim();
                    const pUrl = parts[3].trim();
                    const pEmail = parts[4].trim();
                    const pPass = parts[5].trim();
                    
                    payloadMappings.push({
                        shopId: user.shops[0].id,
                        productName: pName,
                        description: pDesc,
                        price: parseInt(price),
                        logContent: `${pUrl} | ${pEmail} | ${pPass}`,
                        category: category || "GENERAL",
                        country: pCountry || "Global",
                        stock: 1,
                    });
                } else {
                    payloadMappings.push({
                        shopId: user.shops[0].id,
                        productName,
                        description,
                        price: parseInt(price),
                        logContent: trimmedLine,
                        category: category || "GENERAL",
                        country: country || "Global",
                        stock: 1,
                    });
                }
            }

            await prisma.product.createMany({
                data: payloadMappings,
            });

            res.json(enterpriseResponse.productsCreated(lines.length));
        } catch (err) {
            res.status(500).json({ error: "Log database lock." });
        }
    },
);

/**
 * @swagger
 * /api/enterprise/buy-cosmetic:
 *   post:
 *     tags: [enterprise]
 *     summary: Purchase a shop cosmetic (verified badge / color pass / avatar+info update).
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
 *               type: { type: string, enum: [badge, color_pass, avatar_update] }
 *               hexColor: { type: string }
 *               effect: { type: string }
 *               avatarUrl: { type: string }
 *               bannerUrl: { type: string }
 *               shopName: { type: string }
 *               shopDescription: { type: string }
 *     responses:
 *       200:
 *         description: Cosmetic applied.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       400:
 *         description: Invalid cosmetic payload.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Unauthorized vendor.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
    "/buy-cosmetic",
    authenticateToken,
    ...validate(enterpriseValidators.buyCosmetic),
    async (req, res) => {
        const { type } = req.body;
        try {
            const user = await prisma.user.findUnique({
                where: { id: req.user.id },
                include: { shops: true },
            });
            if (!user || user.shops.length === 0)
                return res.status(403).json({ error: "Unauthorized vendor." });

            const shop = user.shops[0];

            const isAdmin = user.rank === "ADMIN";

            if (type === "badge") {
                if (shop.isTrusted)
                    return res
                        .status(400)
                        .json({ error: "Store is already Verified." });
                if (!isAdmin && user.credits < 20)
                    return res.status(400).json({
                        error: "Insufficient BLT. Requires 20 BLT.",
                    });

                if (!isAdmin) {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { credits: user.credits - 20 },
                    });
                }
                await prisma.shop.update({
                    where: { id: shop.id },
                    data: { isTrusted: true },
                });
                return res.json(
                    enterpriseResponse.cosmetic(
                        "Verified Store Badge permanently unlocked!",
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

                const isReset = hexColor === "#ffffff" && secureEffect === "none";

                if (!isAdmin && !isReset && user.credits < 20)
                    return res.status(400).json({
                        error: "Insufficient BLT. Requires 20 BLT.",
                    });

                if (!isAdmin && !isReset) {
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { credits: user.credits - 20 },
                    });
                }
                await prisma.shop.update({
                    where: { id: shop.id },
                    data: {
                        storeColor: hexColor,
                        storeEffect: secureEffect,
                    },
                });
                return res.json(
                    enterpriseResponse.cosmetic("Store Identity updated."),
                );
            }

            if (type === "avatar_update") {
                const { avatarUrl, bannerUrl, shopName, shopDescription } =
                    req.body;
                const dataUpdate = {};
                if (avatarUrl !== undefined && avatarUrl.trim() !== "")
                    dataUpdate.avatarUrl = avatarUrl.trim();
                else if (avatarUrl !== undefined && avatarUrl.trim() === "")
                    dataUpdate.avatarUrl = null;

                if (bannerUrl !== undefined && bannerUrl.trim() !== "")
                    dataUpdate.bannerUrl = bannerUrl.trim();
                else if (bannerUrl !== undefined && bannerUrl.trim() === "")
                    dataUpdate.bannerUrl = null;

                if (shopName !== undefined && shopName.trim() !== "")
                    dataUpdate.shopName = shopName.trim();
                if (
                    shopDescription !== undefined &&
                    shopDescription.trim() !== ""
                )
                    dataUpdate.shopDescription = shopDescription.trim();

                await prisma.shop.update({
                    where: { id: shop.id },
                    data: dataUpdate,
                });
                return res.json(
                    enterpriseResponse.cosmetic("Store Info updated."),
                );
            }

            res.status(400).json({ error: "Invalid cosmetic type." });
        } catch (err) {
            res.status(500).json({ error: "Cosmetics terminal failure." });
        }
    },
);

/**
 * @swagger
 * /api/enterprise/withdraw:
 *   post:
 *     tags: [enterprise]
 *     summary: Request a crypto withdrawal from the vendor vault (min $50).
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [cryptoAddress, network, amount]
 *             properties:
 *               cryptoAddress: { type: string }
 *               network: { type: string }
 *               amount: { type: number, minimum: 50 }
 *     responses:
 *       200:
 *         description: Withdrawal created.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       400:
 *         description: Below minimum or insufficient balance.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
    "/withdraw",
    authenticateToken,
    ...validate(enterpriseValidators.withdraw),
    async (req, res) => {
        try {
            const { cryptoAddress, network, amount } = req.body;
            if (!cryptoAddress || !network || !amount)
                return res
                    .status(400)
                    .json({ error: "Missing withdrawal payload factors." });

            const user = await prisma.user.findUnique({
                where: { id: req.user.id },
            });
            const reqAmount = parseFloat(amount);

            if (reqAmount < 50)
                return res.status(400).json({
                    error: "Minimum withdrawal limit is exactly $50.00.",
                });
            if (reqAmount > user.vendorBalance)
                return res
                    .status(400)
                    .json({ error: "Insufficient Vault balance." });

            await prisma.user.update({
                where: { id: user.id },
                data: { vendorBalance: { decrement: reqAmount } },
            });

            const wd = await prisma.withdrawal.create({
                data: {
                    userId: user.id,
                    amount: reqAmount,
                    cryptoAddress,
                    network,
                    status: "PENDING",
                },
            });

            const text = `<b>[ 💸 NEW VENDOR WITHDRAWAL ]</b>\n\n<b>Vendor:</b> <code>${user.username}</code>\n<b>Amount (Fees Auto-Deducted):</b> $${reqAmount.toFixed(2)}\n<b>Network:</b> ${network}\n<b>Address:</b> <code>${cryptoAddress}</code>\n\n<i>Open the Admin Bot Dashboard to MARK PAID or REJECT.</i>`;
            await sendAdminTelegramAlert(text);

            return res.json(enterpriseResponse.withdrawCreated());
        } catch (err) {
            res.status(500).json({ error: "Vault lock exception." });
        }
    },
);

/**
 * @swagger
 * /api/enterprise/withdrawals:
 *   get:
 *     tags: [enterprise]
 *     summary: List the caller's withdrawal history.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Withdrawals list.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WithdrawalsResponse'
 */
router.get("/withdrawals", authenticateToken, async (req, res) => {
    try {
        const logs = await prisma.withdrawal.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: "desc" },
        });
        return res.json(enterpriseResponse.withdrawals(logs));
    } catch (err) {
        res.status(500).json({ error: "Database mapping failed." });
    }
});

/**
 * @swagger
 * /api/enterprise/products/{id}:
 *   put:
 *     tags: [enterprise]
 *     summary: Update an unsold product owned by the vendor.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productName, country, logContent, price]
 *             properties:
 *               productName: { type: string }
 *               country: { type: string }
 *               logContent: { type: string }
 *               price: { type: integer, minimum: 1 }
 *     responses:
 *       200:
 *         description: Updated.
 *       403:
 *         description: Unauthorized access.
 *       404:
 *         description: Product missing or foreign.
 */
router.put(
    "/products/:id",
    authenticateToken,
    ...validate(enterpriseValidators.editProduct),
    async (req, res) => {
        try {
            const user = await prisma.user.findUnique({
                where: { id: req.user.id },
                include: { shops: true },
            });
            if (user.shops.length === 0)
                return res.status(403).json({ error: "Unauthorized access." });
            const targetShopId = user.shops[0].id;

            const product = await prisma.product.findUnique({
                where: { id: req.params.id },
            });
            if (!product || product.shopId !== targetShopId) {
                return res.status(404).json({
                    error: "Target product not found or belongs to another vendor.",
                });
            }

            const { productName, country, logContent, price } = req.body;

            await prisma.product.update({
                where: { id: req.params.id },
                data: {
                    productName,
                    country,
                    logContent,
                    price: parseInt(price),
                },
            });

            res.json({ success: true, message: "Product updated successfully." });
        } catch (err) {
            res.status(500).json({
                error: "Failed to update product due to an internal error.",
            });
        }
    },
);

/**
 * @swagger
 * /api/enterprise/products/{id}:
 *   delete:
 *     tags: [enterprise]
 *     summary: Delete a single product owned by the vendor.
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
 *         description: Unauthorized access.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Product missing or foreign.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete(
    "/products/:id",
    authenticateToken,
    ...validate(enterpriseValidators.productIdParam),
    async (req, res) => {
        try {
            const user = await prisma.user.findUnique({
                where: { id: req.user.id },
                include: { shops: true },
            });
            if (user.shops.length === 0)
                return res.status(403).json({ error: "Unauthorized access." });
            const targetShopId = user.shops[0].id;

            const product = await prisma.product.findUnique({
                where: { id: req.params.id },
            });
            if (!product || product.shopId !== targetShopId) {
                return res.status(404).json({
                    error: "Target log vanished or belongs to another vendor.",
                });
            }

            await prisma.product.delete({ where: { id: req.params.id } });

            res.json(enterpriseResponse.productDeleted());
        } catch (err) {
            res.status(500).json({
                error: "Ledger cascade protection triggered. Payload might be attached to permanent stashes.",
            });
        }
    },
);

/**
 * @swagger
 * /api/enterprise/bulk-products:
 *   delete:
 *     tags: [enterprise]
 *     summary: Bulk delete all products in a given category owned by the caller.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [category]
 *             properties:
 *               category: { type: string }
 *     responses:
 *       200:
 *         description: Number of products deleted.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       400:
 *         description: Missing category target.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Unauthorized.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete(
    "/bulk-products",
    authenticateToken,
    ...validate(enterpriseValidators.bulkDelete),
    async (req, res) => {
        const { category } = req.body;
        if (!category)
            return res.status(400).json({ error: "Missing category target." });

        try {
            const user = await prisma.user.findUnique({
                where: { id: req.user.id },
                include: { shops: true },
            });
            if (user.shops.length === 0)
                return res.status(403).json({ error: "Unauthorized access." });
            const targetShopId = user.shops[0].id;

            const deletion = await prisma.product.deleteMany({
                where: {
                    shopId: targetShopId,
                    productName: category,
                },
            });

            res.json(enterpriseResponse.bulkDeleted(deletion.count, category));
        } catch (err) {
            res.status(500).json({
                error: "Bulk wipe operation blocked by internal references.",
            });
        }
    },
);

/**
 * @swagger
 * /api/enterprise/bulk-actions:
 *   post:
 *     tags: [enterprise]
 *     summary: Granular bulk actions for specific product IDs.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [action, productIds]
 *             properties:
 *               action: { type: string, enum: [DELETE, UPDATE_PRICE] }
 *               productIds: { type: array, items: { type: string } }
 *               newPrice: { type: integer }
 *     responses:
 *       200:
 *         description: Action executed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       400:
 *         description: Invalid parameters.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Unauthorized.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/bulk-actions", authenticateToken, async (req, res) => {
    const { action, productIds, newPrice } = req.body;
    if (
        !action ||
        !productIds ||
        !Array.isArray(productIds) ||
        productIds.length === 0
    ) {
        return res
            .status(400)
            .json({ error: "Missing or invalid bulk parameters." });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            include: { shops: true },
        });
        if (user.shops.length === 0)
            return res.status(403).json({ error: "Unauthorized access." });
        const targetShopId = user.shops[0].id;

        // Verify ownership
        const products = await prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { shopId: true },
        });

        const allOwned = products.every((p) => p.shopId === targetShopId);
        if (!allOwned || products.length !== productIds.length) {
            return res.status(403).json({
                error: "Some products do not belong to you or do not exist.",
            });
        }

        if (action === "DELETE") {
            const deletion = await prisma.product.deleteMany({
                where: { id: { in: productIds } },
            });
            return res.json({
                success: true,
                message: `Successfully deleted ${deletion.count} items.`,
                count: deletion.count,
            });
        } else if (action === "UPDATE_PRICE") {
            if (!newPrice || isNaN(newPrice) || newPrice < 1) {
                return res.status(400).json({ error: "Invalid new price." });
            }
            const update = await prisma.product.updateMany({
                where: { id: { in: productIds } },
                data: { price: parseInt(newPrice) },
            });
            return res.json({
                success: true,
                message: `Successfully updated ${update.count} items.`,
                count: update.count,
            });
        } else {
            return res.status(400).json({ error: "Invalid action." });
        }
    } catch (err) {
        logger.error(err);
        res.status(500).json({
            error: "Bulk action failed due to an internal error.",
        });
    }
});

module.exports = { path: "/api/enterprise", router };
