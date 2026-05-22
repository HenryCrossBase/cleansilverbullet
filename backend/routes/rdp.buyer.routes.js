const express = require("express");
const { authenticateToken, prisma } = require("./shared");
const { getLogger } = require("../lib/logger");

const logger = getLogger("rdp.buyer.routes");
const router = express.Router();

// Get active RDP plans
router.get("/rdp/plans", async (req, res) => {
    try {
        const plans = await prisma.rDPPlan.findMany({
            where: { isActive: true },
            orderBy: { createdAt: "desc" }
        });
        res.json({ plans });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch plans." });
    }
});

router.use(authenticateToken);

// Purchase RDP Plan
router.post("/rdp/purchase/:planId", async (req, res) => {
    try {
        const planId = req.params.planId;
        const buyerId = req.user.id;

        const plan = await prisma.rDPPlan.findUnique({ where: { id: planId } });
        if (!plan || !plan.isActive) {
            return res.status(404).json({ error: "Plan not found or inactive." });
        }

        const priceUsd = plan.price;

        let seller = await prisma.user.findFirst({ where: { rank: "RDP_SELLER" } });
        if (!seller) {
            seller = await prisma.user.findFirst({ where: { rank: "ADMIN" }, orderBy: { createdAt: 'asc' } });
        }
        if (!seller) {
            return res.status(500).json({ error: "RDP Seller account not configured." });
        }

        const sellerRevenue = priceUsd * 0.60;
        try {
            await prisma.$transaction(async (tx) => {
                const debited = await tx.user.updateMany({
                    where: { id: buyerId, credits: { gte: priceUsd } },
                    data: { credits: { decrement: priceUsd } }
                });
                if (debited.count === 0) {
                    throw new Error("INSUFFICIENT_BLT");
                }
                await tx.user.update({
                    where: { id: seller.id },
                    data: { vendorBalance: { increment: sellerRevenue } }
                });
                await tx.rDPOrder.create({
                    data: {
                        buyerId,
                        sellerId: seller.id,
                        planId: plan.id,
                        status: "PENDING"
                    }
                });
            }, { isolationLevel: "Serializable" });
        } catch (e) {
            if (e?.message === "INSUFFICIENT_BLT") {
                return res.status(400).json({ error: "Insufficient BLT balance." });
            }
            throw e;
        }

        res.json({ success: true, message: "Purchase successful. Awaiting fulfillment." });
    } catch (err) {
        logger.error("RDP Purchase Error", err);
        res.status(500).json({ error: "Purchase failed due to a server error." });
    }
});

// Get My Orders
router.get("/rdp/my-orders", async (req, res) => {
    try {
        const orders = await prisma.rDPOrder.findMany({
            where: { buyerId: req.user.id },
            include: { plan: true },
            orderBy: { createdAt: "desc" }
        });
        
        // Ensure seller identity is completely stripped before sending to client
        const safeOrders = orders.map(o => ({
            id: o.id,
            plan: o.plan,
            status: o.status,
            rdpDetails: o.rdpDetails,
            expiresAt: o.expiresAt,
            createdAt: o.createdAt
        }));

        res.json({ orders: safeOrders });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch your orders." });
    }
});

module.exports = { path: "/api", router };
