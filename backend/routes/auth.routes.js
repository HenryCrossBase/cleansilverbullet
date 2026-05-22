const express = require("express");
const fs = require("fs");
const rateLimit = require("express-rate-limit");
const otplib = require("otplib");
const { validate } = require("../validators/middleware");
const { authValidators } = require("../validators/auth.validator");
const { authResponse } = require("../models/responses/auth.response");
const { errorResponse } = require("../models/responses/common.response");
const {
    isValidEmail,
    isValidUsername,
    isValidPassword,
} = require("../models/validators/input.validator");

const {
    authenticateToken,
    signAuthToken,
    prisma,
    bcrypt,
    argon2,
    authRateLimiter,
    publicSubmitLimiter,
    upload,
    verifyHcaptcha,
    sendAdminTelegramAlert,
    getPublicKey,
    decryptBase64Payload,
    jwt,
    sendVendorTelegramAlert,
} = require("./shared");
const { getLogger } = require("../lib/logger");

const logger = getLogger("auth.routes");

const { JWT_SECRET, APP_BASE_URL } = require("../env");
const { sendVerificationEmail, sendRecoveryEmail } = require("../lib/mail");

const router = express.Router();

function getDeviceFromUA(ua) {
    if (!ua) return "Unknown Device";
    let os = "Unknown OS";
    let browser = "Unknown Browser";

    if (/windows phone/i.test(ua)) os = "Windows Phone";
    else if (/windows/i.test(ua)) os = "Windows";
    else if (/mac/i.test(ua)) os = "MacOS";
    else if (/linux/i.test(ua)) os = "Linux";
    else if (/android/i.test(ua)) os = "Android";
    else if (/ipad|iphone|ipod/i.test(ua)) os = "iOS";

    if (/edg/i.test(ua)) browser = "Edge";
    else if (/chrome|crios/i.test(ua)) browser = "Chrome";
    else if (/firefox|fxios/i.test(ua)) browser = "Firefox";
    else if (/safari/i.test(ua)) browser = "Safari";
    else if (/opera|opr/i.test(ua)) browser = "Opera";

    return `${os} - ${browser}`;
}

function getFlagEmoji(countryCode) {
    if (!countryCode || countryCode.length !== 2) return "🌍";
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map(char => 127397 + char.charCodeAt());
    return String.fromCodePoint(...codePoints);
}

/**
 * @swagger
 * /api/admin/upload-config:
 *   post:
 *     tags: [auth]
 *     summary: Upload an admin config (.espk) file.
 *     description: Admin-only. Accepts multipart/form-data with a config file, title, and description.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file: { type: string, format: binary }
 *               title: { type: string }
 *               description: { type: string }
 *     responses:
 *       201:
 *         description: Config uploaded.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       400:
 *         description: Invalid payload or missing file.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Admin clearance required.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Failed to allocate config to database.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
    "/admin/upload-config",
    authenticateToken,
    ...validate(authValidators.adminUploadConfig),
    (req, res) => {
        if (req.user.rank !== "ADMIN") {
            return res
                .status(403)
                .json({ error: "FORBIDDEN: Admin clearance required." });
        }

        upload(req, res, async (err) => {
            if (err) {
                return res.status(400).json({ error: err.message });
            }

            if (!req.file) {
                return res
                    .status(400)
                    .json({ error: "No .espk config file uploaded." });
            }

            const { title, description } = req.body;
            if (!title || !description) {
                await fs.promises.unlink(req.file.path).catch(() => { }); // Cleanup aborted file
                return res
                    .status(400)
                    .json({ error: "Title and Description are mandatory." });
            }

            try {
                const newConfig = await prisma.adminConfig.create({
                    data: {
                        title,
                        description,
                        fileName: req.file.filename,
                        fileSize: req.file.size,
                    },
                });

                return res
                    .status(201)
                    .json(authResponse.adminConfigUploaded(newConfig));
            } catch (dbError) {
                await fs.promises.unlink(req.file.path).catch(() => { });
                logger.error(dbError);
                return res
                    .status(500)
                    .json(
                        errorResponse("Failed to allocate config to database."),
                    );
            }
        });
    },
);

/**
 * @swagger
 * /api/auth/publicKey:
 *   get:
 *     tags: [auth]
 *     summary: Fetch the server RSA public key used to encrypt auth payloads.
 *     responses:
 *       200:
 *         description: Public key returned.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PublicKeyResponse'
 */
router.get("/auth/publicKey", async (req, res) => {
    const publicKey = await getPublicKey();
    res.status(200).json(authResponse.publicKey(publicKey));
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [auth]
 *     summary: Register a new user account.
 *     description: All sensitive fields are RSA-encrypted client-side using the key from /auth/publicKey. Protected by Cloudflare Turnstile.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [encryptedUsername, encryptedEmail, encryptedPassword, hCaptchaToken]
 *             properties:
 *               encryptedUsername: { type: string, description: Base64 RSA-encrypted username. }
 *               encryptedEmail: { type: string, description: Base64 RSA-encrypted email. }
 *               encryptedPassword: { type: string, description: Base64 RSA-encrypted password. }
 *               hCaptchaToken: { type: string, description: hCaptcha token. }
 *     responses:
 *       201:
 *         description: User registered successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       400:
 *         description: Invalid payload or taken credentials.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Captcha failed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
    "/auth/register",
    authRateLimiter,
    ...validate(authValidators.register),
    async (req, res) => {
        const {
            encryptedUsername,
            encryptedEmail,
            encryptedPassword,
            hCaptchaToken,
        } = req.body;
        if (
            !encryptedUsername ||
            !encryptedEmail ||
            !encryptedPassword ||
            !hCaptchaToken
        )
            return res.status(400).json({ error: "All fields are required." });

        const isValid = await verifyHcaptcha(hCaptchaToken);
        if (!isValid)
            return res
                .status(403)
                .json({ error: "Captcha verification failed." });

        let username, email, password;
        try {
            [username, email, password] = await Promise.all([
                decryptBase64Payload(encryptedUsername),
                decryptBase64Payload(encryptedEmail),
                decryptBase64Payload(encryptedPassword),
            ]);
        } catch (err) {
            return res
                .status(400)
                .json({ error: "Invalid encrypted payload." });
        }

        if (!isValidUsername(username)) {
            return res.status(400).json({
                error: "Username must be 3-24 characters and only contain letters, numbers, or underscores.",
            });
        }
        if (!isValidEmail(email)) {
            return res.status(400).json({ error: "Invalid email address." });
        }
        if (!isValidPassword(password)) {
            return res
                .status(400)
                .json({ error: "Password must be between 8 and 64 characters, containing at least one uppercase letter, one number, and one special character." });
        }

        try {
            const existingIdentity = await prisma.user.findFirst({
                where: { OR: [{ username }, { email }] },
                select: { username: true, email: true },
            });
            if (existingIdentity?.username === username) {
                return res.status(400).json({
                    error: "Username already taken, please choose another.",
                });
            }
            if (existingIdentity?.email === email) {
                return res
                    .status(400)
                    .json({ error: "Email already taken, please log in." });
            }

            const passwordHash = await argon2.hash(password);
            const newUser = await prisma.user.create({
                data: {
                    username,
                    email,
                    passwordHash,
                    rank: "UNVERIFIED",
                    credits: 0,
                },
            });

            // Generate Verification Token
            const token = jwt.sign(
                {
                    id: newUser.id,
                    email: newUser.email,
                    purpose: "VERIFY_EMAIL",
                },
                JWT_SECRET,
                { expiresIn: "24h" },
            );

            // Dispatch Verification Email
            sendVerificationEmail(email, username, token).catch(console.error);

            return res.status(201).json({
                success: true,
                message:
                    "Registration successful! Please check your email to verify your account.",
            });
        } catch (err) {
            logger.error(err);
            res.status(500).json({ error: "Internal Authentication Error." });
        }
    },
);

/**
 * @swagger
 * /api/auth/verify:
 *   get:
 *     tags: [auth]
 *     summary: Verify an email address via token link.
 *     parameters:
 *       - in: query
 *         name: token
 *         schema: { type: string }
 *     responses:
 *       302: { description: Redirects to login page with success or error query parameter. }
 */
router.get("/auth/verify", async (req, res) => {
    const { token } = req.query;
    if (!token)
        return res.redirect(`${APP_BASE_URL}/auth/login?error=invalid_token`);

    try {
        const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
        if (decoded.purpose !== "VERIFY_EMAIL")
            throw new Error("Invalid token purpose");

        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
        });
        if (!user || user.rank !== "UNVERIFIED") {
            return res.redirect(
                `${APP_BASE_URL}/auth/login?error=already_verified`,
            );
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { rank: "USER" },
        });

        res.redirect(`${APP_BASE_URL}/auth/login?verified=true`);
    } catch (err) {
        console.error("Email verification error:", err);
        res.redirect(`${APP_BASE_URL}/auth/login?error=expired_token`);
    }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [auth]
 *     summary: Log in with an encrypted email and password.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [encryptedEmail, encryptedPassword, hCaptchaToken]
 *             properties:
 *               encryptedEmail: { type: string }
 *               encryptedPassword: { type: string }
 *               hCaptchaToken: { type: string }
 *     responses:
 *       200:
 *         description: Authenticated; JWT returned.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthTokenUserResponse'
 *       401:
 *         description: Invalid credentials.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Captcha failed or account banned.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
    "/auth/login",
    authRateLimiter,
    ...validate(authValidators.login),
    async (req, res) => {
        const { encryptedEmail, encryptedPassword, hCaptchaToken } = req.body;
        const trustedDeviceToken = req.body.trustedDeviceToken || req.headers["x-trusted-device-token"];

        if (!encryptedEmail || !encryptedPassword || !hCaptchaToken)
            return res.status(400).json({ error: "All fields are required." });

        const isValid = await verifyHcaptcha(hCaptchaToken);
        if (!isValid)
            return res
                .status(403)
                .json({ error: "Captcha verification failed." });

        let email, password;
        try {
            [email, password] = await Promise.all([
                decryptBase64Payload(encryptedEmail),
                decryptBase64Payload(encryptedPassword),
            ]);
        } catch (err) {
            return res
                .status(400)
                .json({ error: "Invalid encrypted payload." });
        }

        if (!isValidEmail(email) || typeof password !== "string" || !password) {
            return res.status(400).json({ error: "Invalid login payload." });
        }

        try {
            const user = await prisma.user.findUnique({
                where: { email },
                select: {
                    id: true,
                    username: true,
                    rank: true,
                    adminRoles: true,
                    passwordHash: true,
                    bannedUntil: true,
                    banReason: true,
                    credits: true,
                    avatarUrl: true,
                    hasBlueBadge: true,
                    nameColor: true,
                    nameEffect: true,
                    telegramChatId: true,
                    twoFactorEnabled: true,
                },
            });
            if (!user)
                return res.status(401).json({ error: "Invalid credentials." });

            if (user.rank === "UNVERIFIED" || user.rank === "PENDING") {
                return res.status(403).json({
                    error: "Please check your email and verify your account before logging in.",
                });
            }

            if (user.bannedUntil && new Date(user.bannedUntil) > new Date()) {
                return res.status(403).json({
                    error: `Account suspended until ${new Date(user.bannedUntil).toLocaleDateString()} | Reason: ${user.banReason || "TOS Violation"}`,
                });
            }

            const isBcrypt = user.passwordHash.startsWith("$2");
            let isMatch = false;

            if (isBcrypt) {
                isMatch = await bcrypt.compare(password, user.passwordHash);
                if (isMatch) {
                    const newHash = await argon2.hash(password);
                    await prisma.user.update({
                        where: { id: user.id },
                        data: { passwordHash: newHash, lastOnline: new Date() }
                    });
                }
            } else {
                try {
                    isMatch = await argon2.verify(user.passwordHash, password);
                } catch (e) {
                    isMatch = false;
                }
            }

            if (!isMatch)
                return res.status(401).json({ error: "Invalid credentials." });

            if (user.twoFactorEnabled) {
                let isTrusted = false;
                if (trustedDeviceToken) {
                    try {
                        const decodedTrust = jwt.verify(trustedDeviceToken, JWT_SECRET, { algorithms: ["HS256"] });
                        if (decodedTrust.purpose === "TRUSTED_DEVICE" && decodedTrust.userId === user.id) {
                            isTrusted = true;
                        }
                    } catch (e) {
                        // Invalid or expired trusted token
                    }
                }

                if (!isTrusted) {
                    const tempToken = jwt.sign(
                        { id: user.id, is2FA: true },
                        JWT_SECRET,
                        { expiresIn: "5m" }
                    );
                    return res.status(200).json({
                        requires2FA: true,
                        tempToken,
                    });
                }
            }

            await prisma.user.update({
                where: { id: user.id },
                data: { lastOnline: new Date() },
            });

            if (user.telegramChatId) {
                const ip = req.headers["cf-connecting-ip"] || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "Unknown";
                const countryCode = req.headers["cf-ipcountry"] || "US";
                const flag = getFlagEmoji(countryCode);
                const uaRaw = req.headers["user-agent"] || "Unknown";
                const deviceStr = getDeviceFromUA(uaRaw);

                const msg = `🚨 <b>NEW LOGIN DETECTED</b>\n\n<b>Account:</b> <code>${user.username}</code>\n<b>IP Address:</b> <code>${ip}</code> ${flag}\n<b>Device:</b> <code>${deviceStr}</code>\n<b>User-Agent:</b> <code>${uaRaw}</code>\n\n<i>If this wasn't you, secure your account immediately!</i>`;
                sendVendorTelegramAlert(user.telegramChatId, msg).catch(() => { });
            }

            const token = signAuthToken(user);
            res.status(200).json(
                authResponse.loginSuccess(token, {
                    username: user.username,
                    rank: user.rank,
                    credits: user.credits,
                    avatarUrl: user.avatarUrl,
                    lastOnline: new Date(),
                    hasBlueBadge: user.hasBlueBadge,
                    nameColor: user.nameColor,
                    nameEffect: user.nameEffect,
                }),
            );
        } catch (err) {
            logger.error(err);
            res.status(500).json({ error: "Internal Authentication Error." });
        }
    },
);

const verify2faLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 8,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many 2FA attempts. Please wait." },
});

router.post("/auth/login/verify-2fa", verify2faLimiter, async (req, res) => {
    try {
        const { tempToken, code, trustDevice } = req.body;
        if (!tempToken || !code) {
            return res.status(400).json({ error: "Token and code are required." });
        }

        let decoded;
        try {
            decoded = jwt.verify(tempToken, JWT_SECRET, { algorithms: ["HS256"] });
        } catch (err) {
            return res.status(401).json({ error: "Invalid or expired session token." });
        }

        if (!decoded.is2FA || !decoded.id) {
            return res.status(401).json({ error: "Invalid token structure." });
        }

        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: {
                id: true,
                username: true,
                rank: true,
                adminRoles: true,
                passwordHash: true,
                credits: true,
                avatarUrl: true,
                hasBlueBadge: true,
                nameColor: true,
                nameEffect: true,
                telegramChatId: true,
                twoFactorSecret: true,
                twoFactorEnabled: true,
            },
        });

        if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
            return res.status(400).json({ error: "2FA is not properly configured for this account." });
        }

        const isValid = otplib.verifySync({
            token: code,
            secret: user.twoFactorSecret,
            window: 1
        }).valid;

        if (!isValid) {
            return res.status(400).json({ error: "Invalid 2FA code." });
        }

        await prisma.user.update({
            where: { id: user.id },
            data: { lastOnline: new Date() },
        });

        if (user.telegramChatId) {
            const ip = req.headers["cf-connecting-ip"] || req.headers["x-forwarded-for"] || req.socket.remoteAddress || "Unknown";
            const countryCode = req.headers["cf-ipcountry"] || "US";
            const flag = getFlagEmoji(countryCode);
            const uaRaw = req.headers["user-agent"] || "Unknown";
            const deviceStr = getDeviceFromUA(uaRaw);

            const msg = `🚨 <b>NEW LOGIN DETECTED</b>\n\n<b>Account:</b> <code>${user.username}</code>\n<b>IP Address:</b> <code>${ip}</code> ${flag}\n<b>Device:</b> <code>${deviceStr}</code>\n<b>User-Agent:</b> <code>${uaRaw}</code>\n\n<i>If this wasn't you, secure your account immediately!</i>`;
            sendVendorTelegramAlert(user.telegramChatId, msg).catch(() => { });
        }

        const token = signAuthToken(user);
        const responsePayload = authResponse.loginSuccess(token, {
            username: user.username,
            rank: user.rank,
            credits: user.credits,
            avatarUrl: user.avatarUrl,
            lastOnline: new Date(),
            hasBlueBadge: user.hasBlueBadge,
            nameColor: user.nameColor,
            nameEffect: user.nameEffect,
        });

        if (trustDevice) {
            responsePayload.trustedDeviceToken = jwt.sign(
                { userId: user.id, purpose: "TRUSTED_DEVICE" },
                JWT_SECRET,
                { expiresIn: "30d" }
            );
        }

        res.status(200).json(responsePayload);
    } catch (err) {
        logger.error("2FA Verify Error:", err);
        res.status(500).json({ error: "Failed to verify 2FA code." });
    }
});

/**
 * @swagger
 * /api/auth/recovery:
 *   post:
 *     tags: [auth]
 *     summary: Queue a password recovery request for the given email.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [encryptedEmail, hCaptchaToken]
 *             properties:
 *               encryptedEmail: { type: string }
 *               hCaptchaToken: { type: string }
 *     responses:
 *       200:
 *         description: Recovery queued.
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
 *       403:
 *         description: Captcha failed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
    "/auth/recovery",
    authRateLimiter,
    ...validate(authValidators.recovery),
    async (req, res) => {
        const { encryptedEmail, hCaptchaToken } = req.body;
        if (!encryptedEmail || !hCaptchaToken)
            return res
                .status(400)
                .json({ error: "Email and hCaptcha token required." });
        const isValid = await verifyHcaptcha(hCaptchaToken);
        if (!isValid)
            return res
                .status(403)
                .json({ error: "Captcha verification failed." });

        let email;
        try {
            email = await decryptBase64Payload(encryptedEmail);
        } catch (err) {
            return res
                .status(400)
                .json({ error: "Invalid encrypted payload." });
        }

        if (!isValidEmail(email)) {
            return res.status(400).json({ error: "Invalid email address." });
        }

        try {
            const user = await prisma.user.findUnique({ where: { email } });
            if (user) {
                // Generate a 15-minute secure token
                const token = jwt.sign(
                    { id: user.id, email: user.email, purpose: "RECOVERY" },
                    JWT_SECRET,
                    { expiresIn: "15m" },
                );

                // Dispatch Recovery Email
                sendRecoveryEmail(user.email, token).catch(console.error);
            }

            // Always return 200 to prevent email enumeration attacks
            return res.status(200).json(authResponse.recoveryQueued());
        } catch (err) {
            console.error("Recovery error:", err);
            return res.status(500).json({ error: "Failed to queue recovery." });
        }
    },
);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     tags: [auth]
 *     summary: Reset password using recovery token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, encryptedPassword, hCaptchaToken]
 *             properties:
 *               token: { type: string }
 *               encryptedPassword: { type: string }
 *               hCaptchaToken: { type: string }
 *     responses:
 *       200:
 *         description: Password updated.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       400:
 *         description: Invalid payload or token.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Captcha failed.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post("/auth/reset-password", authRateLimiter, async (req, res) => {
    const { token, encryptedPassword, hCaptchaToken } = req.body;
    if (!token || !encryptedPassword || !hCaptchaToken)
        return res.status(400).json({ error: "All fields are required." });

    const isValid = await verifyHcaptcha(hCaptchaToken);
    if (!isValid)
        return res.status(403).json({ error: "Captcha verification failed." });

    let password;
    try {
        password = await decryptBase64Payload(encryptedPassword);
    } catch (err) {
        return res.status(400).json({ error: "Invalid encrypted payload." });
    }

    if (!isValidPassword(password)) {
        return res
            .status(400)
            .json({
                error: "Password must be 8-15 characters, and include at least 1 uppercase letter, 1 number, and 1 special character.",
            });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ["HS256"] });
        if (decoded.purpose !== "RECOVERY")
            throw new Error("Invalid token purpose");

        const passwordHash = await argon2.hash(password);
        await prisma.user.update({
            where: { id: decoded.id },
            data: {
                passwordHash,
                passwordChangedAt: new Date(),
            },
        });

        return res
            .status(200)
            .json({ success: true, message: "Password updated successfully." });
    } catch (err) {
        console.error("Reset password error:", err);
        return res
            .status(400)
            .json({ error: "Invalid or expired recovery token." });
    }
});

/**
 * @swagger
 * /api/public/stats:
 *   get:
 *     tags: [auth]
 *     summary: Return public platform statistics (totals, online admins, etc.).
 *     responses:
 *       200:
 *         description: Public stats payload.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PublicStatsResponse'
 *       500:
 *         description: Failed to grab stats.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get("/public/stats", async (req, res) => {
    try {
        const [
            totalMembers,
            adminConfigCount,
            shopCount,
            productCount,
            newestUser,
            adminsOnline,
        ] = await Promise.all([
            prisma.user.count(),
            prisma.adminConfig.count(),
            prisma.shop.count(),
            prisma.product.count(),
            prisma.user.findFirst({
                orderBy: { createdAt: "desc" },
                select: { username: true },
            }),
            prisma.user.findMany({
                where: {
                    rank: "ADMIN",
                    lastOnline: { gte: new Date(Date.now() - 30 * 60000) },
                },
                select: {
                    username: true,
                    nameColor: true,
                    nameEffect: true,
                },
            }),
        ]);

        const totalThreads = adminConfigCount;

        res.json(
            authResponse.publicStats({
                totalMembers,
                totalThreads,
                newestMember: newestUser
                    ? newestUser.username
                    : "GhostProtocol",
                freeConfigsThreads: adminConfigCount,
                freeConfigsPosts: adminConfigCount,
                marketThreads: shopCount,
                marketPosts: productCount,
                adminsOnline,
            }),
        );
    } catch (err) {
        logger.error(err);
        res.status(500).json({ error: "Failed to grab stats" });
    }
});

/**
 * @swagger
 * /api/contact:
 *   post:
 *     tags: [auth]
 *     summary: Submit the public contact form; message is forwarded to admins via Telegram.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, subject, message]
 *             properties:
 *               email: { type: string, format: email }
 *               subject: { type: string, maxLength: 200 }
 *               message: { type: string, maxLength: 5000 }
 *     responses:
 *       200:
 *         description: Contact submitted.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessMessage'
 *       400:
 *         description: Invalid contact payload.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Delivery failure.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post(
    "/contact",
    publicSubmitLimiter,
    ...validate(authValidators.contact),
    async (req, res) => {
        const { email, subject, message } = req.body;
        if (!email || !subject || !message) {
            return res
                .status(400)
                .json({ error: "All fields are strictly required." });
        }
        if (
            !isValidEmail(email) ||
            String(subject).length > 200 ||
            String(message).length > 5000
        ) {
            return res.status(400).json({ error: "Invalid contact payload." });
        }

        const tgMessage = `<b>[ 🚨 PUBLIC CONTACT FORM ]</b>\n\n<b>Email:</b> <code>${email}</code>\n<b>Subject:</b> <code>${subject}</code>\n\n<b>Message:</b>\n<i>${message}</i>`;

        try {
            const sent = await sendAdminTelegramAlert(tgMessage);

            if (!sent) {
                throw new Error("Telegram API rejected transmission.");
            }

            res.json(authResponse.contactSubmitted());
        } catch (err) {
            logger.error("Contact Form Telegram Error:", err);
            res.status(500).json({
                error: "System encountered a temporary routing problem.",
            });
        }
    },
);

module.exports = { path: "/api", router };
