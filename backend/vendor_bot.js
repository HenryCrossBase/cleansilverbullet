const TelegramBot = require("node-telegram-bot-api");
const { getLogger } = require("./lib/logger");
const prisma = require("./lib/prisma");
const { VENDOR_BOT_TOKEN } = require("./env");

const logger = getLogger("vendor_bot", { msgPrefix: "[vendor-bot] " });

if (!VENDOR_BOT_TOKEN) {
    throw new Error("FATAL: VENDOR_BOT_TOKEN is required to run vendor_bot.js");
}
const bot = new TelegramBot(VENDOR_BOT_TOKEN, { polling: true });

logger.info("Telegram vendor authenticator listening and armed.");

bot.onText(/\/(?:link|start) (.+)/, async (msg, match) => {
    const chatId = msg.chat.id.toString();
    const providedToken = match[1].trim();

    try {
        const user = await prisma.user.findUnique({
            where: { telegramLinkToken: providedToken },
        });

        if (!user) {
            bot.sendMessage(
                chatId,
                "❌ Invalid or expired linkage token. Please generate a new one from your Seller Sandbox.",
            );
            return;
        }

        // Token matches! Link the account.
        await prisma.user.update({
            where: { id: user.id },
            data: {
                telegramChatId: chatId,
                telegramLinkToken: null, // Burn the token safely
            },
        });

        const welcomeMessage = `✅ Authentication Successful!\n\nWelcome to the Silverbullet Vendor Network, <b>${user.username}</b> 🚀\n\nYour storefront is now securely locked to this device. I will automatically push critical alerts here whenever:\n💰 An item is purchased.\n🚨 A dispute is mapped against your payload.\n\nYou may now return to the Web Dashboard to finalize your configuration.`;

        bot.sendMessage(chatId, welcomeMessage, { parse_mode: "HTML" });
    } catch (err) {
        logger.error("Linkage Logic Failure:", err);
        bot.sendMessage(chatId, "⚠️ Internal database synchronization error.");
    }
});

bot.on("message", (msg) => {
    if (!msg.text) return;

    if (msg.text === "/start") {
        bot.sendMessage(
            msg.chat.id,
            "Welcome to Silverbullet Market place! 👋\n\nThis exact bot array is configured to notify you instantly once any items are sold from your configuration, or once a high-priority dispute is opened against you.\n\nTo map your device to your Store, please fetch your exact Payload Token from your Silverbullet Web Dashboard click the 'LINK' button directly!",
            { parse_mode: "Markdown" },
        );
        return;
    }

    if (!msg.text.startsWith("/link") && !msg.text.startsWith("/start ")) {
        bot.sendMessage(
            msg.chat.id,
            "To map your device to your Store, please click the authentication button directly on your dashboard.",
            { parse_mode: "Markdown" },
        );
    }
});

// --- DAILY TELEMETRY CRON LOOP ---
async function runDailySummary() {
    const now = new Date();
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    try {
        const vendors = await prisma.user.findMany({
            where: { telegramChatId: { not: null } },
            select: {
                id: true,
                username: true,
                telegramChatId: true,
                customSplit: true,
                rank: true,
            },
        });

        if (!vendors.length) return;

        const vendorIds = vendors.map((v) => v.id);
        const shops = await prisma.shop.findMany({
            where: { ownerId: { in: vendorIds } },
            select: { id: true, ownerId: true },
        });

        const shopIdToOwnerId = new Map(shops.map((s) => [s.id, s.ownerId]));
        const shopIds = shops.map((s) => s.id);
        if (!shopIds.length) return;

        const products = await prisma.product.findMany({
            where: { shopId: { in: shopIds } },
            select: { id: true, shopId: true },
        });

        const productIdToVendorId = new Map();
        for (const product of products) {
            const ownerId = shopIdToOwnerId.get(product.shopId);
            if (ownerId) {
                productIdToVendorId.set(product.id, ownerId);
            }
        }

        const productIds = products.map((p) => p.id);
        if (!productIds.length) return;

        const [ordersToday, disputesToday] = await Promise.all([
            prisma.order.findMany({
                where: {
                    productId: { in: productIds },
                    createdAt: { gte: todayStart, lt: todayEnd },
                },
                select: { id: true, productId: true, pricePaid: true },
            }),
            prisma.dispute.findMany({
                where: {
                    vendorId: { in: vendorIds },
                    createdAt: { gte: todayStart, lt: todayEnd },
                },
                select: { orderId: true, vendorId: true, status: true },
            }),
        ]);

        const ordersByVendor = new Map();
        for (const order of ordersToday) {
            const vendorId = productIdToVendorId.get(order.productId);
            if (!vendorId) continue;
            const bucket = ordersByVendor.get(vendorId) || [];
            bucket.push(order);
            ordersByVendor.set(vendorId, bucket);
        }

        const disputesByVendor = new Map();
        for (const dispute of disputesToday) {
            const bucket = disputesByVendor.get(dispute.vendorId) || [];
            bucket.push(dispute);
            disputesByVendor.set(dispute.vendorId, bucket);
        }

        for (const vendor of vendors) {
            const vendorOrders = ordersByVendor.get(vendor.id) || [];
            const vendorDisputes = disputesByVendor.get(vendor.id) || [];

            const totalSalesCount = vendorOrders.length;
            const totalSalesPrice = vendorOrders.reduce(
                (acc, o) => acc + o.pricePaid,
                0,
            );

            const disputedOrderIds = new Set(
                vendorDisputes.map((d) => d.orderId),
            );
            const notReportedOrders = vendorOrders.filter(
                (o) => !disputedOrderIds.has(o.id),
            );
            const notReportedCount = notReportedOrders.length;
            const notReportedAmount = notReportedOrders.reduce(
                (acc, o) => acc + o.pricePaid,
                0,
            );

            const refundedDisputes = vendorDisputes.filter(
                (d) => d.status === "REFUND_APPROVED",
            );
            const refundedCount = refundedDisputes.length;
            const refundedAmount = vendorOrders
                .filter((o) => refundedDisputes.some((d) => d.orderId === o.id))
                .reduce((acc, o) => acc + o.pricePaid, 0);

            const notRefundedCount = totalSalesCount - refundedCount;
            const notRefundedAmount = totalSalesPrice - refundedAmount;

            const splitRate =
                vendor.customSplit !== null
                    ? vendor.customSplit
                    : (vendor.rank === "ENTERPRISE" || vendor.rank === "ADMIN")
                      ? 0.75
                      : vendor.rank === "PREMIUM"
                        ? 0.6
                        : 0.5;
            const earning = notRefundedAmount * splitRate;

            const dateStr = now.toDateString();

            const msg = `Dear <b>${vendor.username}</b>,\n\nYour sales summary of <b>${dateStr}</b> is:\n\nEarning = $${earning.toFixed(0)}\nTotal Sales Count = ${totalSalesCount}\nTotal Sales Price = $${totalSalesPrice.toFixed(0)}\nNot Reported Count = ${notReportedCount}\nNot Reported Amount = $${notReportedAmount.toFixed(0)}\nRefunded Count = ${refundedCount}\nRefunded Amount = $${refundedAmount.toFixed(0)}\nNot Refunded Count = ${notRefundedCount}\nNot Refunded Amount = $${notRefundedAmount.toFixed(0)}\n\nThanks.`;

            bot.sendMessage(vendor.telegramChatId, msg, {
                parse_mode: "HTML",
            }).catch(() => {});
        }
    } catch (e) {
        logger.error({ err: e }, "Daily summary cron failed");
    }
}

let lastDailyRunKey = "";
setInterval(async () => {
    const now = new Date();
    const runKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    if (
        now.getHours() === 23 &&
        now.getMinutes() === 59 &&
        runKey !== lastDailyRunKey
    ) {
        lastDailyRunKey = runKey;
        await runDailySummary();
    }
}, 60000);
