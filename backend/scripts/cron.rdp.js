const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function processRDPRenewals() {
    console.log("[RDP Cron] Starting RDP Renewal check...");
    try {
        const now = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Find active orders expiring soon or already expired
        const expiringOrders = await prisma.rDPOrder.findMany({
            where: {
                status: "ACTIVE",
                expiresAt: {
                    lte: tomorrow // <= 24 hours from now
                }
            },
            include: { plan: true }
        });

        console.log(`[RDP Cron] Found ${expiringOrders.length} orders expiring soon.`);

        for (const order of expiringOrders) {
            const buyer = await prisma.user.findUnique({ where: { id: order.buyerId } });
            const seller = await prisma.user.findUnique({ where: { id: order.sellerId } });
            
            if (!buyer || !seller) continue;

            const planPrice = order.plan.price;

            // Check if it's strictly past expiration
            if (now > order.expiresAt) {
                // Time to renew
                if (buyer.credits >= planPrice) {
                    console.log(`[RDP Cron] Auto-renewing order ${order.id} for user ${buyer.username}`);
                    
                    const sellerRevenue = planPrice * 0.60;
                    
                    // New expiration = 1 month from current expiration
                    const newExpiresAt = new Date(order.expiresAt);
                    newExpiresAt.setMonth(newExpiresAt.getMonth() + 1);

                    await prisma.$transaction([
                        prisma.user.update({
                            where: { id: buyer.id },
                            data: { credits: { decrement: planPrice } }
                        }),
                        prisma.user.update({
                            where: { id: seller.id },
                            data: { vendorBalance: { increment: sellerRevenue } }
                        }),
                        prisma.rDPOrder.update({
                            where: { id: order.id },
                            data: { expiresAt: newExpiresAt }
                        })
                    ]);

                    await prisma.notification.create({
                        data: {
                            userId: buyer.id,
                            message: `Your RDP server (${order.plan.name}) was successfully auto-renewed. $${planPrice} BLT was deducted.`,
                            type: "SYSTEM",
                            link: "/rdp/manage"
                        }
                    });
                } else {
                    console.log(`[RDP Cron] Insufficient funds for order ${order.id}, marking as EXPIRED.`);
                    await prisma.rDPOrder.update({
                        where: { id: order.id },
                        data: { status: "EXPIRED" }
                    });

                    await prisma.notification.create({
                        data: {
                            userId: buyer.id,
                            message: `Your RDP server (${order.plan.name}) has EXPIRED due to insufficient BLT balance.`,
                            type: "SYSTEM",
                            link: "/rdp/manage"
                        }
                    });
                }
            }
        }
    } catch (err) {
        console.error("[RDP Cron] Error processing renewals:", err);
    }
}

// If run directly
if (require.main === module) {
    processRDPRenewals().then(() => {
        console.log("[RDP Cron] Finished.");
        process.exit(0);
    });
} else {
    module.exports = { processRDPRenewals };
}
