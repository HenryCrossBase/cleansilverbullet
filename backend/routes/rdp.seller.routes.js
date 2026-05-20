const express = require("express");
const { authenticateToken, prisma } = require("./shared");
const { getLogger } = require("../lib/logger");

const logger = getLogger("rdp.seller.routes");
const router = express.Router();

// Middleware to ensure only the RDP seller can access these routes.
// We assume the user has a specific ID or rank for this.
// For now, let's assume any ENTERPRISE or ADMIN rank can access it,
// or we check a specific flag if we had one.
// The user said "aana seller 1 wehed", so we can just use a simple role check or even ID if provided later.
const isRDPSeller = async (req, res, next) => {
    // For now, allow ADMIN or users with a specific rank.
    if (req.user.rank === "ADMIN" || req.user.rank === "RDP_SELLER") {
        next();
    } else {
        res.status(403).json({ error: "Access denied. RDP Seller only." });
    }
};

router.use(authenticateToken);
router.use(isRDPSeller);

// Create Plan
router.post("/rdp/plans", async (req, res) => {
    try {
        const { name, country, description, ram, cpu, os, price } = req.body;
        const plan = await prisma.rDPPlan.create({
            data: { name, country, description, ram, cpu, os, price: parseInt(price) }
        });
        res.json({ success: true, plan });
    } catch (err) {
        logger.error("Error creating RDP plan", err);
        res.status(500).json({ error: "Failed to create plan." });
    }
});

// Get Plans
router.get("/rdp/plans", async (req, res) => {
    try {
        const plans = await prisma.rDPPlan.findMany({ orderBy: { createdAt: "desc" } });
        res.json({ plans });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch plans." });
    }
});

// Update Plan Status (Active/Inactive)
router.put("/rdp/plans/:id/status", async (req, res) => {
    try {
        const { isActive } = req.body;
        const plan = await prisma.rDPPlan.update({
            where: { id: req.params.id },
            data: { isActive }
        });
        res.json({ success: true, plan });
    } catch (err) {
        res.status(500).json({ error: "Failed to update plan status." });
    }
});

// Helper to map buyerId to username
const mapUsernamesToOrders = async (orders) => {
    const buyerIds = [...new Set(orders.map(o => o.buyerId))];
    const users = await prisma.user.findMany({
        where: { id: { in: buyerIds } },
        select: { id: true, username: true }
    });
    const userMap = users.reduce((acc, u) => ({ ...acc, [u.id]: u.username }), {});
    return orders.map(o => ({ ...o, buyerUsername: userMap[o.buyerId] || "Unknown" }));
};

// Get Orders (Anonymized Buyer - but Seller needs username now for the panel)
router.get("/rdp/orders", async (req, res) => {
    try {
        const orders = await prisma.rDPOrder.findMany({
            include: { plan: true },
            orderBy: { createdAt: "desc" }
        });
        
        const mappedOrders = await mapUsernamesToOrders(orders);
        res.json({ orders: mappedOrders });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch orders." });
    }
});

// Fulfill Order
router.put("/rdp/orders/:id/fulfill", async (req, res) => {
    try {
        const { rdpDetails, status, refundReason } = req.body; 
        // status could be PROCESSING, DELIVERED, REFUNDED_UNDELIVERABLE
        
        const order = await prisma.rDPOrder.findUnique({
            where: { id: req.params.id },
            include: { plan: true }
        });

        if (!order) return res.status(404).json({ error: "Order not found." });

        if (status === "REFUNDED_UNDELIVERABLE" || status === "REFUNDED") {
            // Process Refund
            const priceUsd = order.plan.price;
            const sellerRevenue = priceUsd * 0.60;
            
            await prisma.$transaction([
                // Refund buyer
                prisma.user.update({
                    where: { id: order.buyerId },
                    data: { credits: { increment: priceUsd } }
                }),
                // Deduct from seller
                prisma.user.update({
                    where: { id: req.user.id },
                    data: { vendorBalance: { decrement: sellerRevenue } }
                }),
                prisma.rDPOrder.update({
                    where: { id: req.params.id },
                    data: {
                        status: "REFUNDED",
                        rdpDetails: refundReason || "Undeliverable"
                    }
                }),
                prisma.auditLog.create({
                    data: {
                        adminId: req.user.id,
                        adminUsername: req.user.username,
                        action: "RDP_ORDER_REFUNDED",
                        target: order.id,
                        details: JSON.stringify({ reason: refundReason })
                    }
                })
            ]);

            return res.json({ success: true, message: "Order refunded." });
        }

        // Default to ACTIVE for delivered
        const newStatus = status === "DELIVERED" ? "ACTIVE" : (status || "PROCESSING");
        
        let expiresAt = order.expiresAt;
        if (newStatus === "ACTIVE" && !expiresAt) {
            expiresAt = new Date();
            expiresAt.setMonth(expiresAt.getMonth() + 1);
        }

        const updatedOrder = await prisma.rDPOrder.update({
            where: { id: req.params.id },
            data: {
                status: newStatus,
                rdpDetails,
                expiresAt
            }
        });

        if (newStatus === "ACTIVE") {
            await prisma.notification.create({
                data: {
                    userId: order.buyerId,
                    message: `Your RDP Order for ${order.id.substring(0,8)} has been delivered!`,
                    type: "SYSTEM",
                    link: "/rdp/manage"
                }
            });
            await prisma.auditLog.create({
                data: {
                    adminId: req.user.id,
                    adminUsername: req.user.username,
                    action: "RDP_ORDER_DELIVERED",
                    target: order.id,
                    details: JSON.stringify({ plan: order.plan.name })
                }
            });
        }

        res.json({ success: true, order: updatedOrder });
    } catch (err) {
        logger.error("Error fulfilling order", err);
        res.status(500).json({ error: "Failed to fulfill order." });
    }
});

// Get Renewals
router.get("/rdp/renewals", async (req, res) => {
    try {
        const in10Days = new Date();
        in10Days.setDate(in10Days.getDate() + 10);

        const orders = await prisma.rDPOrder.findMany({
            where: {
                status: "ACTIVE",
                expiresAt: { lte: in10Days }
            },
            include: { plan: true }
        });

        const mappedOrders = await mapUsernamesToOrders(orders);
        res.json({ orders: mappedOrders });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch renewals." });
    }
});

// Notify Buyer
router.post("/rdp/orders/:id/notify", async (req, res) => {
    try {
        const order = await prisma.rDPOrder.findUnique({
            where: { id: req.params.id },
            include: { plan: true }
        });

        if (!order) return res.status(404).json({ error: "Order not found." });

        await prisma.notification.create({
            data: {
                userId: order.buyerId,
                message: `URGENT: Your RDP server (${order.plan.name}) expires soon. Please recharge your BLT balance to avoid termination.`,
                type: "SYSTEM",
                link: "/deposit-history" // Or wherever they deposit
            }
        });

        res.json({ success: true, message: "Buyer notified successfully." });
    } catch (err) {
        res.status(500).json({ error: "Failed to notify buyer." });
    }
});

// Get Seller Balance
router.get("/rdp/balance", async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        res.json({ vendorBalance: user.vendorBalance });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch balance." });
    }
});

// Get Active Services
router.get("/rdp/services", async (req, res) => {
    try {
        const services = await prisma.rDPOrder.findMany({
            where: { status: { in: ["ACTIVE", "SUSPENDED"] } },
            include: { plan: true },
            orderBy: { createdAt: "desc" }
        });
        const mappedServices = await mapUsernamesToOrders(services);
        res.json({ services: mappedServices });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch services." });
    }
});

// Update Service
router.put("/rdp/services/:id", async (req, res) => {
    try {
        const { expiresAt, status, rdpDetails } = req.body;
        const service = await prisma.rDPOrder.update({
            where: { id: req.params.id },
            data: { expiresAt: new Date(expiresAt), status, rdpDetails }
        });
        res.json({ success: true, service });
    } catch (err) {
        res.status(500).json({ error: "Failed to update service." });
    }
});

// Get Customers
router.get("/rdp/customers", async (req, res) => {
    try {
        const orders = await prisma.rDPOrder.findMany({
            orderBy: { createdAt: "desc" }
        });
        
        // Group by buyerId
        const customersMap = {};
        for (const order of orders) {
            if (!customersMap[order.buyerId]) {
                customersMap[order.buyerId] = {
                    buyerId: order.buyerId,
                    totalOrders: 0,
                    activeRDPs: 0,
                    undeliverable: 0,
                    lastOrder: order.createdAt
                };
            }
            const c = customersMap[order.buyerId];
            c.totalOrders++;
            if (order.status === "ACTIVE") c.activeRDPs++;
            if (order.status === "REFUNDED") c.undeliverable++;
            if (new Date(order.createdAt) > new Date(c.lastOrder)) {
                c.lastOrder = order.createdAt;
            }
        }

        const buyerIds = Object.keys(customersMap);
        const users = await prisma.user.findMany({
            where: { id: { in: buyerIds } },
            select: { id: true, username: true }
        });
        
        const customers = Object.values(customersMap).map(c => {
            const user = users.find(u => u.id === c.buyerId);
            return { ...c, username: user ? user.username : "Unknown" };
        });

        res.json({ customers });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch customers." });
    }
});

// Get Logs
router.get("/rdp/logs", async (req, res) => {
    try {
        const logs = await prisma.auditLog.findMany({
            where: { action: { startsWith: "RDP_" } },
            orderBy: { createdAt: "desc" },
            take: 50
        });
        res.json({ logs });
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch logs." });
    }
});

module.exports = { path: "/api/seller", router };
