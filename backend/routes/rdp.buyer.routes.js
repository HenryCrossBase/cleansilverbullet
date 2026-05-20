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

        const buyer = await prisma.user.findUnique({ where: { id: buyerId } });
        if (buyer.credits < priceUsd) {
            return res.status(400).json({ error: "Insufficient BLT balance." });
        }

        // We assume there's 1 main RDP Seller. For now, let's just find a user with "RDP_SELLER" rank
        // or fallback to the ADMIN who manages the platform if none exists.
        let seller = await prisma.user.findFirst({ where: { rank: "RDP_SELLER" } });
        if (!seller) {
            seller = await prisma.user.findFirst({ where: { rank: "ADMIN" }, orderBy: { createdAt: 'asc' } });
        }

        if (!seller) {
            return res.status(500).json({ error: "RDP Seller account not configured." });
        }

        // 60/40 Split
        const sellerRevenue = priceUsd * 0.60;

        await prisma.$transaction([
            // Deduct from buyer
            prisma.user.update({
                where: { id: buyerId },
                data: { credits: { decrement: priceUsd } }
            }),
            // Add to seller vendorBalance or credits. Assuming vendorBalance for 60%
            prisma.user.update({
                where: { id: seller.id },
                data: { vendorBalance: { increment: sellerRevenue } }
            }),
            // Create Order
            prisma.rDPOrder.create({
                data: {
                    buyerId,
                    sellerId: seller.id,
                    planId: plan.id,
                    status: "PENDING"
                }
            })
        ]);

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
