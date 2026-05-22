const TelegramBot = require("node-telegram-bot-api");
const bcrypt = require("bcryptjs");
const { logAdminAudit } = require("./lib/audit");
const { getLogger } = require("./lib/logger");
const prisma = require("./lib/prisma");
const {
    ADMIN_BOT_TOKEN,
    ADMIN_CHAT_ID,
    ADMIN_USER_IDS,
    VENDOR_BOT_TOKEN,
} = require("./env");

const logger = getLogger("admin_bot", { msgPrefix: "[admin-bot] " });

if (!ADMIN_BOT_TOKEN) {
    throw new Error("FATAL: ADMIN_BOT_TOKEN is required to run admin_bot.js");
}
const bot = new TelegramBot(ADMIN_BOT_TOKEN, { polling: true });

// Absolute Security Lock - Bind solely to authorized ops chat
if (!ADMIN_CHAT_ID || ADMIN_USER_IDS.length === 0) {
    throw new Error(
        "FATAL: ADMIN_CHAT_ID and ADMIN_USER_IDS are required to run admin_bot.js safely",
    );
}

function getBotActor(from) {
    return {
        adminId: `tg:${from?.id || "unknown"}`,
        adminUsername:
            from?.username ||
            [from?.first_name, from?.last_name].filter(Boolean).join(" ") ||
            "telegram_admin",
    };
}

async function logBotAudit(from, action, target, details = {}) {
    const actor = getBotActor(from);
    await logAdminAudit({
        prisma,
        adminId: actor.adminId,
        adminUsername: actor.adminUsername,
        action,
        target,
        details,
        source: "ADMIN_BOT",
    });
}

// Internal Session Handler Map
const activeSessions = {};

// Root Navigation UI
const UI_MAIN_MENU = {
    reply_markup: {
        inline_keyboard: [
            [
                { text: "🕵️ Target Info", callback_data: "ACTION_INFO_USER" },
                {
                    text: "🧾 Pay History",
                    callback_data: "ACTION_PAYMENT_HISTORY",
                },
            ],
            [
                { text: "🏦 Add BLT", callback_data: "ACTION_ADD_BLT" },
                { text: "📉 Reduce BLT", callback_data: "ACTION_REDUCE_BLT" },
            ],
            [
                { text: "🏅 Change Rank", callback_data: "ACTION_CHANGE_RANK" },
                {
                    text: "💸 Change Split %",
                    callback_data: "ACTION_CHANGE_PERCENT",
                },
            ],
            [
                {
                    text: "🛡️ Set Admin Lvl",
                    callback_data: "ACTION_CHANGE_ADMIN_LEVEL",
                },
                {
                    text: "🛡️ Create Admin",
                    callback_data: "ACTION_CREATE_ADMIN",
                },
            ],
            [
                { text: "🔑 Change Pass", callback_data: "ACTION_CHANGE_PASS" },
                { text: "📧 Change Mail", callback_data: "ACTION_CHANGE_MAIL" },
            ],
            [
                { text: "👤 Change User", callback_data: "ACTION_CHANGE_USER" },
                { text: "🔨 Ban User", callback_data: "ACTION_BAN_USER" },
            ],
            [
                { text: "🔓 Unban User", callback_data: "ACTION_UNBAN_USER" },
                {
                    text: "⚖️ Open Disputes",
                    callback_data: "ACTION_CHECK_DISPUTES",
                },
            ],
            [
                { text: "📊 Global Telemetry", callback_data: "ACTION_STATUS" },
                {
                    text: "🎨 Assign Badges",
                    callback_data: "ACTION_ASSIGN_BADGES",
                },
            ],
            [
                { text: "👥 User Database", callback_data: "PAGE_USERS_0" },
                { text: "🖼️ Manage Ads", callback_data: "ACTION_MANAGE_ADS" },
            ],
            [
                {
                    text: "💰 Pending Withdrawals",
                    callback_data: "ACTION_CHECK_WITHDRAWALS",
                },
                {
                    text: "📝 Pending Signups",
                    callback_data: "ACTION_PENDING_USERS",
                },
            ],
        ],
    },
    parse_mode: "HTML",
};

bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from.id;
    if (chatId !== ADMIN_CHAT_ID && chatId !== userId) return;
    if (!ADMIN_USER_IDS.includes(userId)) return;

    const text = msg.text;
    if (!text) return;

    if (text.startsWith("/start")) {
        activeSessions[userId] = null; // Clear context
        return bot.sendMessage(
            chatId,
            `<b>[ SILVERBULLET CORE ]</b>\n\nWelcome to the specialized Administration Provisioning Terminal. Connections isolated and secured.\n\nPlease select an executable function:`,
            UI_MAIN_MENU,
        );
    }

    // Handle active states if they exist
    if (activeSessions[userId]) {
        const session = activeSessions[userId];

        if (session.step === "AWAITING_USERNAME") {
            session.username = text.trim();
            session.step = "AWAITING_EMAIL";
            return bot.sendMessage(
                chatId,
                `<b>[ SYSTEM ]</b> Context stored: <code>${session.username}</code>\n\nPlease provide the Administrator's secure Email Address:`,
                { parse_mode: "HTML" },
            );
        }

        if (session.step === "AWAITING_EMAIL") {
            if (!text.includes("@"))
                return bot.sendMessage(
                    chatId,
                    `<b>[ ERROR ]</b> Invalid email format. Try again.`,
                    { parse_mode: "HTML" },
                );
            session.email = text.trim().toLowerCase();
            session.step = "AWAITING_PASSWORD";
            return bot.sendMessage(
                chatId,
                `<b>[ SYSTEM ]</b> Context stored: <code>${session.email}</code>\n\nPlease construct a high-entropy Password for this identity:`,
                { parse_mode: "HTML" },
            );
        }

        if (session.step === "AWAITING_PASSWORD") {
            const password = text;
            if (password.length < 6)
                return bot.sendMessage(
                    chatId,
                    `<b>[ ERROR ]</b> Password must be at least 6 characters. Try again:`,
                    { parse_mode: "HTML" },
                );
            activeSessions[userId] = null; // Flush immediately for security

            bot.sendMessage(
                chatId,
                `<b>⚙️ Processing Database Encryption...</b>`,
                { parse_mode: "HTML" },
            );

            try {
                const existingUser = await prisma.user.findFirst({
                    where: {
                        OR: [
                            { username: session.username },
                            { email: session.email },
                        ],
                    },
                });

                if (existingUser) {
                    return bot.sendMessage(
                        chatId,
                        `<b>[ FATAL ]</b> An identity utilizing that Username or Email already governs a space in internal storage. Rebooting menu...`,
                        UI_MAIN_MENU,
                    );
                }

                const passwordHash = await bcrypt.hash(password, 12);
                await prisma.user.create({
                    data: {
                        username: session.username,
                        email: session.email,
                        passwordHash: passwordHash,
                        rank: "ADMIN",
                        adminRoles: "1",
                        credits: 999999,
                        nameColor: "#ef4444",
                        hasBlueBadge: true,
                    },
                });

                await logBotAudit(msg.from, "CREATE_ADMIN", session.username, {
                    email: session.email,
                });

                bot.sendMessage(
                    chatId,
                    `<b>✅ ADMINISTRATOR DEPLOYED SUCCESSFULLY</b>\n\n<b>Username:</b> ${session.username}\n<b>Email:</b> ${session.email}\n<b>Password:</b> <i>[REDACTED]</i>\n\nAesthetic settings optimized. They may now sign-in strictly through standard access panels.`,
                    UI_MAIN_MENU,
                );
            } catch (err) {
                logger.error("[ FATAL ERROR ]", err);
                bot.sendMessage(
                    chatId,
                    `<b>[ FATAL ERROR ]</b> Database transaction completely rejected. Internal crash.`,
                    UI_MAIN_MENU,
                );
            }
        }

        if (session.step === "AWAITING_BAN_USERNAME") {
            const username = text.trim();
            session.banUsername = username;
            session.step = "AWAITING_BAN_DAYS";
            return bot.sendMessage(
                chatId,
                `<b>[ ACCOUNT LOCKDOWN ]</b>\n\nTarget Identity Validated: <code>${username}</code>\n\nEnter duration of suspension in <b>Days</b> (Must be a numeric value):`,
                { parse_mode: "HTML" },
            );
        }

        if (session.step === "AWAITING_BAN_DAYS") {
            const numDays = parseInt(text.trim());
            if (isNaN(numDays) || numDays <= 0)
                return bot.sendMessage(chatId, `Invalid integer. Try again.`);
            session.banDays = numDays;
            session.step = "AWAITING_BAN_REASON";
            return bot.sendMessage(
                chatId,
                `<b>[ ACCOUNT LOCKDOWN ]</b>\n\nBan duration set to: <code>${numDays} Days</code>\n\nPlease enter the public Reason. This will be openly visible to the user upon attempting login:`,
                { parse_mode: "HTML" },
            );
        }

        if (session.step === "AWAITING_BAN_REASON") {
            const reason = text;
            activeSessions[userId] = null; // Clear
            bot.sendMessage(chatId, `<b>⚙️ EXECUTING ENFORCEMENT...</b>`, {
                parse_mode: "HTML",
            });

            try {
                const hit = await prisma.user.findFirst({
                    where: { username: session.banUsername },
                });
                if (!hit) {
                    return bot.sendMessage(
                        chatId,
                        `<b>[ ERROR ]</b> Target user not found within records.`,
                        UI_MAIN_MENU,
                    );
                }

                const expiry = new Date();
                expiry.setDate(expiry.getDate() + session.banDays);

                await prisma.user.update({
                    where: { id: hit.id },
                    data: { bannedUntil: expiry, banReason: reason },
                });
                await logBotAudit(msg.from, "BAN_USER", hit.username, {
                    days: session.banDays,
                    reason,
                    expiry: expiry.toISOString(),
                });
                return bot.sendMessage(
                    chatId,
                    `<b>✅ USER PERMANENTLY LOCKED</b>\n\n<code>Target:</code> ${hit.username}\n<code>Lift Date:</code> ${expiry.toLocaleDateString()}\n<code>Reason:</code> ${reason}`,
                    UI_MAIN_MENU,
                );
            } catch (e) {
                bot.sendMessage(
                    chatId,
                    `Failed to update user identity.`,
                    UI_MAIN_MENU,
                );
            }
        }

        if (session.step === "AWAITING_UNBAN_USERNAME") {
            const username = text.trim();
            activeSessions[userId] = null;

            try {
                const hit = await prisma.user.findFirst({
                    where: { username },
                });
                if (!hit) {
                    return bot.sendMessage(
                        chatId,
                        `<b>[ ERROR ]</b> Target user not found within records.`,
                        UI_MAIN_MENU,
                    );
                }

                await prisma.user.update({
                    where: { id: hit.id },
                    data: { bannedUntil: null, banReason: null },
                });
                await logBotAudit(msg.from, "UNBAN_USER", hit.username, {});
                return bot.sendMessage(
                    chatId,
                    `<b>✅ ACCESS RESTORED</b>\n\nUser <code>${hit.username}</code> has had their constraints successfully purged.`,
                    UI_MAIN_MENU,
                );
            } catch (e) {
                bot.sendMessage(chatId, `Failed to unban user.`, UI_MAIN_MENU);
            }
        }

        if (session.step === "AWAITING_BADGE_USERNAME") {
            const targetUsername = text.trim();
            activeSessions[userId] = null;
            try {
                const hit = await prisma.user.findFirst({
                    where: { username: targetUsername },
                });
                if (!hit)
                    return bot.sendMessage(
                        chatId,
                        `<b>[ FATAL ]</b> Identity void.`,
                        UI_MAIN_MENU,
                    );

                const badges = hit.customBadges || "";
                const opts = {
                    parse_mode: "HTML",
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: badges.includes("DEV")
                                        ? "✅ DEV"
                                        : "DEV",
                                    callback_data: `BDG|DEV|${hit.id}`,
                                },
                                {
                                    text: badges.includes("LGBTQ")
                                        ? "✅ LGBTQ+"
                                        : "LGBTQ+",
                                    callback_data: `BDG|LGBTQ|${hit.id}`,
                                },
                            ],
                            [
                                {
                                    text: badges.includes("BUG_HUNTER")
                                        ? "✅ BUG HUNTER"
                                        : "BUG HUNTER",
                                    callback_data: `BDG|BUG_HUNTER|${hit.id}`,
                                },
                                {
                                    text: badges.includes("GHOST")
                                        ? "✅ GHOST"
                                        : "GHOST",
                                    callback_data: `BDG|GHOST|${hit.id}`,
                                },
                            ],
                            [
                                {
                                    text: "🧹 CLEAR ALL BADGES",
                                    callback_data: `BDG|CLEAR|${hit.id}`,
                                },
                            ],
                            [
                                {
                                    text: "✅ Apply Configuration & Return",
                                    callback_data: `ACTION_MAIN_MENU`,
                                },
                            ],
                        ],
                    },
                };
                return bot.sendMessage(
                    chatId,
                    `<b>[ COSMETIC OVERRIDE ]</b>\n\nTarget locked: <code>${hit.username}</code>\n\nSelect the distinct badges to toggle on/off for this identity:`,
                    opts,
                );
            } catch (e) {
                return bot.sendMessage(
                    chatId,
                    `<b>[ FATAL ]</b> Logic completely failed.`,
                    UI_MAIN_MENU,
                );
            }
        }

        /* --- NEW MASSIVE ADMIN SUITE STATE HANDLERS --- */
        if (session.step === "AWAITING_INFO_USERNAME") {
            const user = await prisma.user.findUnique({
                where: { username: text.trim() },
                include: { shops: true },
            });
            activeSessions[userId] = null;
            if (!user)
                return bot.sendMessage(
                    chatId,
                    `<b>[ ERROR ]</b> Target missing.`,
                    UI_MAIN_MENU,
                );
            return bot.sendMessage(
                chatId,
                `<b>[ 🕵️ DOSSIER: ${user.username} ]</b>\n\nRank: <code>${user.rank}</code>\nBLT Balance: <code>${user.credits}</code>\nVault Balance: <code>$${user.vendorBalance}</code>\nVendor Licensed: <code>${user.shops.length > 0 ? "YES" : "NO"}</code>\nAdmin Level: <code>${user.adminLevel}</code>\nCustom Split %: <code>${user.customSplit || "DEFAULT"}</code>\nBanned: <code>${user.bannedUntil ? "YES" : "NO"}</code>`,
                UI_MAIN_MENU,
            );
        }

        if (session.step === "AWAITING_PAY_USERNAME") {
            const user = await prisma.user.findUnique({
                where: { username: text.trim() },
            });
            if (!user) {
                activeSessions[userId] = null;
                return bot.sendMessage(
                    chatId,
                    `<b>[ ERROR ]</b> Target missing.`,
                    UI_MAIN_MENU,
                );
            }
            activeSessions[userId] = null;
            const deps = await prisma.cryptoDeposit.findMany({
                where: { userId: user.id },
                orderBy: { createdAt: "desc" },
                take: 10,
            });
            let rep = `<b>[ 🧾 PAYMENTS: ${user.username} ]</b>\n\n`;
            deps.forEach(
                (d) =>
                    (rep += `• <code>$${d.amountUsd}</code> [${d.status}] - ${d.createdAt.toLocaleDateString()}\n`),
            );
            if (deps.length === 0) rep += "<i>No transactions recorded.</i>";
            return bot.sendMessage(chatId, rep, UI_MAIN_MENU);
        }

        if (session.step === "AWAITING_ADD_BLT_USER") {
            session.targetUser = text.trim();
            session.step = "AWAITING_ADD_BLT_AMT";
            return bot.sendMessage(
                chatId,
                `Target locked: <code>${session.targetUser}</code>\n\nEnter literal BLT integer amount to <b>ADD</b>:`,
                { parse_mode: "HTML" },
            );
        }
        if (session.step === "AWAITING_ADD_BLT_AMT") {
            const amt = parseInt(text.trim());
            activeSessions[userId] = null;
            if (isNaN(amt) || amt <= 0)
                return bot.sendMessage(
                    chatId,
                    `<b>[ ERROR ]</b> Invalid integer.`,
                    UI_MAIN_MENU,
                );
            try {
                const u = await prisma.user.findFirst({
                    where: { username: session.targetUser },
                });
                if (!u)
                    return bot.sendMessage(
                        chatId,
                        `<b>[ FATAL ]</b> Target user missing.`,
                        UI_MAIN_MENU,
                    );

                await prisma.$transaction([
                    prisma.user.update({
                        where: { id: u.id },
                        data: { credits: { increment: amt } },
                    }),
                    prisma.notification.create({
                        data: {
                            userId: u.id,
                            message: `The Administration has graciously credited your account with <b>${amt} BLT</b>.`,
                            type: "BALANCE",
                            link: "/deposit-history",
                        },
                    }),
                ]);
                await logBotAudit(msg.from, "ADD_BLT", u.username, {
                    amount: amt,
                });
                bot.sendMessage(
                    chatId,
                    `<b>✅ SUCCESS</b>\nAdded ${amt} BLT to ${session.targetUser} and pushed notification.`,
                    UI_MAIN_MENU,
                );
            } catch (e) {
                bot.sendMessage(
                    chatId,
                    `<b>[ FATAL ]</b> Failed.`,
                    UI_MAIN_MENU,
                );
            }
        }

        if (session.step === "AWAITING_REDUCE_BLT_USER") {
            session.targetUser = text.trim();
            session.step = "AWAITING_REDUCE_BLT_AMT";
            return bot.sendMessage(
                chatId,
                `Target locked: <code>${session.targetUser}</code>\n\nEnter literal BLT integer amount to <b>REDUCE</b>:`,
                { parse_mode: "HTML" },
            );
        }
        if (session.step === "AWAITING_REDUCE_BLT_AMT") {
            const amt = parseInt(text.trim());
            activeSessions[userId] = null;
            if (isNaN(amt) || amt <= 0)
                return bot.sendMessage(
                    chatId,
                    `<b>[ ERROR ]</b> Invalid integer.`,
                    UI_MAIN_MENU,
                );
            try {
                const trgUser = await prisma.user.findUnique({
                    where: { username: session.targetUser },
                });
                if (!trgUser) throw new Error("Not Found");
                const finalBal = Math.max(0, trgUser.credits - amt);

                await prisma.user.update({
                    where: { username: session.targetUser },
                    data: { credits: finalBal },
                });
                await logBotAudit(msg.from, "REDUCE_BLT", session.targetUser, {
                    amount: amt,
                });
                bot.sendMessage(
                    chatId,
                    `<b>✅ SUCCESS</b>\nRemoved ${amt} BLT from ${session.targetUser}`,
                    UI_MAIN_MENU,
                );
            } catch (e) {
                bot.sendMessage(
                    chatId,
                    `<b>[ FATAL ]</b> Failed.`,
                    UI_MAIN_MENU,
                );
            }
        }

        if (session.step === "AWAITING_RANK_USER") {
            session.targetUser = text.trim();
            return bot.sendMessage(
                chatId,
                `Target locked: <code>${session.targetUser}</code>\n\nSelect the explicit Rank to assign:`,
                {
                    parse_mode: "HTML",
                    reply_markup: {
                        inline_keyboard: [
                            [
                                {
                                    text: "USER",
                                    callback_data: "SET_RANK_USER",
                                },
                                {
                                    text: "STARTER",
                                    callback_data: "SET_RANK_STARTER",
                                },
                                { text: "PRO", callback_data: "SET_RANK_PRO" },
                            ],
                            [
                                {
                                    text: "PREMIUM",
                                    callback_data: "SET_RANK_SYNDICATE",
                                },
                                {
                                    text: "ENTERPRISE",
                                    callback_data: "SET_RANK_ENTERPRISE",
                                },
                            ],
                            [
                                {
                                    text: "🔙 Cancel & Return",
                                    callback_data: "ACTION_MAIN_MENU",
                                },
                            ],
                        ],
                    },
                },
            );
        }

        if (session.step === "AWAITING_PERCENT_USER") {
            session.targetUser = text.trim();
            session.step = "AWAITING_PERCENT_VAL";
            return bot.sendMessage(
                chatId,
                `Target locked: <code>${session.targetUser}</code>\n\nEnter Split Multiplier (e.g. <code>0.90</code> for 90%). Type 'clear' to reset:`,
                { parse_mode: "HTML" },
            );
        }
        if (session.step === "AWAITING_PERCENT_VAL") {
            const raw = text.trim();
            const val = raw.toLowerCase() === "clear" ? null : parseFloat(raw);
            activeSessions[userId] = null;

            if (val !== null && (!Number.isFinite(val) || val < 0 || val > 1)) {
                return bot.sendMessage(
                    chatId,
                    `<b>[ ERROR ]</b> Split must be between 0.00 and 1.00, or 'clear' to reset.`,
                    { parse_mode: "HTML" },
                );
            }

            try {
                await prisma.user.update({
                    where: { username: session.targetUser },
                    data: { customSplit: val },
                });
                await logBotAudit(
                    msg.from,
                    "CHANGE_SPLIT",
                    session.targetUser,
                    { split: val },
                );
                bot.sendMessage(
                    chatId,
                    `<b>✅ SUCCESS</b>\nSplit logic overridden globally.`,
                    UI_MAIN_MENU,
                );
            } catch (e) {
                bot.sendMessage(
                    chatId,
                    `<b>[ FATAL ]</b> Failed.`,
                    UI_MAIN_MENU,
                );
            }
        }

        if (session.step === "AWAITING_ADMIN_LVL_USER") {
            session.targetUser = text.trim();
            session.step = "AWAITING_ADMIN_ROLES";
            session.selectedRoles = [];
            const count = session.targetUser.split(",").length;
            const kb = [
                [
                    { text: "⬜ Owner", callback_data: "TOGGLE_ROLE_0" },
                    { text: "⬜ Co-Owner", callback_data: "TOGGLE_ROLE_1" },
                ],
                [
                    { text: "⬜ Mod", callback_data: "TOGGLE_ROLE_2" },
                    { text: "⬜ Support", callback_data: "TOGGLE_ROLE_3" },
                ],
                [{ text: "✅ Apply Titles (0)", callback_data: "APPLY_ROLES" }],
                [
                    {
                        text: "🔙 Cancel & Return",
                        callback_data: "ACTION_MAIN_MENU",
                    },
                ],
            ];
            return bot.sendMessage(
                chatId,
                `Targets locked: <code>${session.targetUser}</code> (${count} users)\n\nSelect the explicit Admin Titles to assign:`,
                { parse_mode: "HTML", reply_markup: { inline_keyboard: kb } },
            );
        }

        if (session.step === "AWAITING_PASS_USER") {
            session.targetUser = text.trim();
            session.step = "AWAITING_PASS_VAL";
            return bot.sendMessage(
                chatId,
                `Target locked: <code>${session.targetUser}</code>\n\nEnter explicit new Password:`,
                { parse_mode: "HTML" },
            );
        }
        if (session.step === "AWAITING_PASS_VAL") {
            const p = text.trim();
            if (p.length < 6)
                return bot.sendMessage(
                    chatId,
                    `<b>[ ERROR ]</b> Password must be 6+ chars.`,
                    { parse_mode: "HTML" },
                );
            activeSessions[userId] = null;
            try {
                const hash = await bcrypt.hash(p, 12);
                await prisma.user.update({
                    where: { username: session.targetUser },
                    data: { passwordHash: hash },
                });
                await logBotAudit(
                    msg.from,
                    "CHANGE_PASSWORD",
                    session.targetUser,
                    {},
                );
                bot.sendMessage(
                    chatId,
                    `<b>✅ SUCCESS</b>\nPassword completely rewritten and encrypted.`,
                    UI_MAIN_MENU,
                );
            } catch (e) {
                bot.sendMessage(
                    chatId,
                    `<b>[ FATAL ]</b> Failed.`,
                    UI_MAIN_MENU,
                );
            }
        }

        if (session.step === "AWAITING_MAIL_USER") {
            session.targetUser = text.trim();
            session.step = "AWAITING_MAIL_VAL";
            return bot.sendMessage(
                chatId,
                `Target locked: <code>${session.targetUser}</code>\n\nEnter explicit new Email:`,
                { parse_mode: "HTML" },
            );
        }
        if (session.step === "AWAITING_MAIL_VAL") {
            const m = text.trim();
            if (!m.includes("@"))
                return bot.sendMessage(
                    chatId,
                    `<b>[ ERROR ]</b> Invalid email.`,
                    { parse_mode: "HTML" },
                );
            activeSessions[userId] = null;
            try {
                const existing = await prisma.user.findUnique({
                    where: { email: m.toLowerCase() },
                });
                if (existing)
                    return bot.sendMessage(
                        chatId,
                        `<b>[ FATAL ]</b> Email taken.`,
                        UI_MAIN_MENU,
                    );
                await prisma.user.update({
                    where: { username: session.targetUser },
                    data: { email: m.toLowerCase() },
                });
                await logBotAudit(
                    msg.from,
                    "CHANGE_EMAIL",
                    session.targetUser,
                    { newEmail: m },
                );
                bot.sendMessage(
                    chatId,
                    `<b>✅ SUCCESS</b>\nEmail mapping overridden.`,
                    UI_MAIN_MENU,
                );
            } catch (e) {
                bot.sendMessage(
                    chatId,
                    `<b>[ FATAL ]</b> Failed.`,
                    UI_MAIN_MENU,
                );
            }
        }

        if (session.step === "AWAITING_USER_USER") {
            session.targetUser = text.trim();
            session.step = "AWAITING_USER_VAL";
            return bot.sendMessage(
                chatId,
                `Target locked: <code>${session.targetUser}</code>\n\nEnter explicit new Username:`,
                { parse_mode: "HTML" },
            );
        }
        if (session.step === "AWAITING_USER_VAL") {
            const u = text.trim();
            if (u.length < 3)
                return bot.sendMessage(
                    chatId,
                    `<b>[ ERROR ]</b> Username must be 3+ chars.`,
                    { parse_mode: "HTML" },
                );
            activeSessions[userId] = null;
            try {
                const existing = await prisma.user.findFirst({
                    where: { username: { equals: u, mode: "insensitive" } },
                });
                if (existing)
                    return bot.sendMessage(
                        chatId,
                        `<b>[ FATAL ]</b> Username taken.`,
                        UI_MAIN_MENU,
                    );
                await prisma.user.update({
                    where: { username: session.targetUser },
                    data: { username: u },
                });
                await logBotAudit(
                    msg.from,
                    "CHANGE_USERNAME",
                    session.targetUser,
                    { newUsername: u },
                );
                bot.sendMessage(
                    chatId,
                    `<b>✅ SUCCESS</b>\nUsername globally rewritten mapping to: ${u}.`,
                    UI_MAIN_MENU,
                );
            } catch (e) {
                bot.sendMessage(
                    chatId,
                    `<b>[ FATAL ]</b> Failed.`,
                    UI_MAIN_MENU,
                );
            }
        }

        if (session.step === "AWAITING_TICKET_REPLY") {
            const replyText = text;
            activeSessions[userId] = null;
            try {
                const ticket = await prisma.supportTicket.findUnique({
                    where: { id: session.ticketId },
                });
                if (ticket) {
                    await prisma.$transaction([
                        prisma.supportTicket.update({
                            where: { id: session.ticketId },
                            data: {
                                status: "ANSWERED",
                                messages: {
                                    create: {
                                        senderId: "ADMIN_MODULE",
                                        senderRank: "ADMIN",
                                        message: replyText,
                                    },
                                },
                            },
                        }),
                        prisma.notification.create({
                            data: {
                                userId: ticket.userId,
                                message: `The Administration has formally responded to Support Ticket <code>#${ticket.id.substring(0, 8)}</code>.`,
                                type: "TICKET",
                                link: "/support",
                            },
                        }),
                    ]);
                    await logBotAudit(
                        msg.from,
                        "TICKET_REPLY",
                        session.ticketId,
                        { ticketUserId: ticket.userId },
                    );
                }
                bot.sendMessage(
                    chatId,
                    `<b>✅ TICKET ANSWERED</b>\n\nReply injected successfully into ticket <code>${session.ticketId}</code>.`,
                    UI_MAIN_MENU,
                );
            } catch (e) {
                bot.sendMessage(
                    chatId,
                    `<b>[ FATAL ]</b> Failed to dispatch reply.`,
                    UI_MAIN_MENU,
                );
            }
        }
    }
});

// Inline Callback Dispatcher
bot.on("callback_query", async (query) => {
    const chatId = query.message.chat.id;
    const userId = query.from.id;
    if (chatId !== ADMIN_CHAT_ID) return;
    if (!ADMIN_USER_IDS.includes(userId)) return;
    const action = query.data;

    // Cleanup old buttons to make the chat read cleanly
    bot.answerCallbackQuery(query.id);

    if (action === "ACTION_MAIN_MENU") {
        activeSessions[userId] = null;
        return bot.editMessageText(
            `<b>[ SILVERBULLET CORE ]</b>\n\nWelcome to the specialized Administration Provisioning Terminal. Connections isolated and secured.\n\nPlease select an executable function:`,
            {
                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: "HTML",
                reply_markup: UI_MAIN_MENU.reply_markup,
            },
        );
    }

    const rootOpt = {
        chat_id: chatId,
        message_id: query.message.message_id,
        parse_mode: "HTML",
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: "🔙 Cancel & Return",
                        callback_data: "ACTION_MAIN_MENU",
                    },
                ],
            ],
        },
    };
    if (action === "ACTION_INFO_USER") {
        activeSessions[userId] = {
            step: "AWAITING_INFO_USERNAME",
            rootMsgId: query.message.message_id,
        };
        bot.editMessageText(
            `<b>[ 🕵️ TARGET DOSSIER ]</b>\nEnter the precise Username:`,
            rootOpt,
        );
    }
    if (action === "ACTION_PAYMENT_HISTORY") {
        activeSessions[userId] = {
            step: "AWAITING_PAY_USERNAME",
            rootMsgId: query.message.message_id,
        };
        bot.editMessageText(
            `<b>[ 🧾 PAYMENT INTEL ]</b>\nEnter Target Username:`,
            rootOpt,
        );
    }
    if (action === "ACTION_ADD_BLT") {
        activeSessions[userId] = {
            step: "AWAITING_ADD_BLT_USER",
            rootMsgId: query.message.message_id,
        };
        bot.editMessageText(
            `<b>[ 🏦 DEPOSIT BLT ]</b>\nEnter Target Username:`,
            rootOpt,
        );
    }
    if (action === "ACTION_REDUCE_BLT") {
        activeSessions[userId] = {
            step: "AWAITING_REDUCE_BLT_USER",
            rootMsgId: query.message.message_id,
        };
        bot.editMessageText(
            `<b>[ 📉 WITHDRAW BLT ]</b>\nEnter Target Username:`,
            rootOpt,
        );
    }
    if (action === "ACTION_CHANGE_RANK") {
        activeSessions[userId] = {
            step: "AWAITING_RANK_USER",
            rootMsgId: query.message.message_id,
        };
        bot.editMessageText(
            `<b>[ 🏅 RANK OVERRIDE ]</b>\nEnter Target Username:`,
            rootOpt,
        );
    }
    if (action === "ACTION_CHANGE_PERCENT") {
        activeSessions[userId] = {
            step: "AWAITING_PERCENT_USER",
            rootMsgId: query.message.message_id,
        };
        bot.editMessageText(
            `<b>[ 💸 SPLIT OVERRIDE ]</b>\nEnter Target Username:`,
            rootOpt,
        );
    }
    if (action === "ACTION_ASSIGN_BADGES") {
        activeSessions[userId] = {
            step: "AWAITING_BADGE_USERNAME",
            rootMsgId: query.message.message_id,
        };
        bot.editMessageText(
            `<b>[ 🎨 COSMETIC BADGES ]</b>\nEnter Target Username:`,
            rootOpt,
        );
    }
    if (action === "ACTION_CHANGE_ADMIN_LEVEL") {
        try {
            const admins = await prisma.user.findMany({
                where: { rank: "ADMIN" },
                select: { username: true },
            });
            activeSessions[userId] = {
                step: "AWAITING_ADMIN_LVL_USER",
                selected: [],
            };
            let kb = [];
            for (let i = 0; i < admins.length; i += 2) {
                let row = [];
                row.push({
                    text: `⬜ ${admins[i].username}`,
                    callback_data: `TOGGLE_ADM_${admins[i].username}`,
                });
                if (admins[i + 1])
                    row.push({
                        text: `⬜ ${admins[i + 1].username}`,
                        callback_data: `TOGGLE_ADM_${admins[i + 1].username}`,
                    });
                kb.push(row);
            }
            kb.push([
                {
                    text: "✅ Proceed to Select Level",
                    callback_data: "PROCEED_ADM_LVL",
                },
            ]);
            kb.push([
                {
                    text: "🔙 Cancel & Return",
                    callback_data: "ACTION_MAIN_MENU",
                },
            ]);
            bot.editMessageText(
                `<b>[ 🛡️ ADMIN CLEARANCE ]</b>\n\nSelect the Admins from the list below, or type Target Username(s) separated by commas:\n\n<i>Currently Selected: None</i>`,
                {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: "HTML",
                    reply_markup: { inline_keyboard: kb },
                },
            );
        } catch (e) {
            bot.sendMessage(chatId, `Database Error.`, UI_MAIN_MENU);
        }
    }
    if (action === "ACTION_CHANGE_PASS") {
        activeSessions[userId] = { step: "AWAITING_PASS_USER" };
        bot.sendMessage(
            chatId,
            `<b>[ 🔑 PASSWORD OVERRIDE ]</b>\nEnter Target Username:`,
            { parse_mode: "HTML" },
        );
    }
    if (action === "ACTION_CHANGE_MAIL") {
        activeSessions[userId] = { step: "AWAITING_MAIL_USER" };
        bot.sendMessage(
            chatId,
            `<b>[ 📧 EMAIL OVERRIDE ]</b>\nEnter Target Username:`,
            { parse_mode: "HTML" },
        );
    }
    if (action === "ACTION_CHANGE_USER") {
        activeSessions[userId] = { step: "AWAITING_USER_USER" };
        bot.sendMessage(
            chatId,
            `<b>[ 👤 IDENTITY OVERRIDE ]</b>\nEnter Current Target Username:`,
            { parse_mode: "HTML" },
        );
    }

    if (action === "ACTION_CREATE_ADMIN") {
        activeSessions[userId] = {
            step: "AWAITING_USERNAME",
            rootMsgId: query.message.message_id,
        };
        bot.editMessageText(
            `<b>[ CONFIGURATION WIZARD INITIATED ]</b>\n\nPlease specify the primary Username for this Admin Identity (This will be globally displayed in standard UIs):`,
            rootOpt,
        );
    }

    if (action === "ACTION_BAN_USER") {
        activeSessions[userId] = {
            step: "AWAITING_BAN_USERNAME",
            rootMsgId: query.message.message_id,
        };
        bot.editMessageText(
            `<b>[ 🔨 TARGET ACQUISITION ]</b>\n\nPlease input the exact Username of the violator you wish to securely lock out of the Silverbullet Gateway:`,
            rootOpt,
        );
    }

    if (action === "ACTION_UNBAN_USER") {
        activeSessions[userId] = {
            step: "AWAITING_UNBAN_USERNAME",
            rootMsgId: query.message.message_id,
        };
        bot.editMessageText(
            `<b>[ 🔓 LIFT DIRECTIVE ]</b>\n\nPlease input the exact Username of the account you forcefully isolated:`,
            rootOpt,
        );
    }

    if (action === "ACTION_PENDING_USERS") {
        try {
            const pendingUsers = await prisma.user.findMany({
                where: { rank: "PENDING" },
                select: { id: true, username: true, createdAt: true },
                orderBy: { createdAt: "asc" },
                take: 50
            });
            if (pendingUsers.length === 0) {
                return bot.editMessageText(
                    `<b>[ 📝 PENDING SIGNUPS ]</b>\n\nNo users are currently awaiting approval.`,
                    rootOpt,
                );
            }
            let kb = [];
            for (const u of pendingUsers) {
                kb.push([{ text: `✅ Approve ${u.username}`, callback_data: `APPROVE_USER_${u.id}` }]);
            }
            kb.push([{ text: "🔙 Cancel & Return", callback_data: "ACTION_MAIN_MENU" }]);
            
            return bot.editMessageText(
                `<b>[ 📝 PENDING SIGNUPS ]</b>\n\nFound ${pendingUsers.length} users awaiting manual approval:\nSelect a user to approve them immediately.`,
                {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: "HTML",
                    reply_markup: { inline_keyboard: kb },
                }
            );
        } catch (e) {
            return bot.sendMessage(chatId, `<b>[ FATAL ]</b> Database Error.`, UI_MAIN_MENU);
        }
    }

    if (action.startsWith("APPROVE_USER_")) {
        const targetId = action.split("APPROVE_USER_")[1];
        try {
            const u = await prisma.user.findUnique({ where: { id: targetId } });
            if (!u || u.rank !== "PENDING") {
                return bot.editMessageText(`<b>[ ERROR ]</b> User not found or already approved.`, rootOpt);
            }
            await prisma.user.update({
                where: { id: targetId },
                data: { rank: "USER" }
            });
            await logBotAudit(query.from, "APPROVE_USER", u.username, {});
            return bot.editMessageText(
                `<b>✅ USER APPROVED</b>\n\nUser <code>${u.username}</code> has been approved and can now access the platform.`,
                rootOpt
            );
        } catch (e) {
            return bot.sendMessage(chatId, `<b>[ FATAL ]</b> Failed to approve user.`, UI_MAIN_MENU);
        }
    }

    if (action === "ACTION_STATUS") {
        try {
            const adminCount = await prisma.user.count({
                where: { rank: "ADMIN" },
            });
            const userCount = await prisma.user.count();
            const vendorCount = await prisma.shop.count();
            const buyerCount = userCount - vendorCount; // Active consumers

            // Calculate UTC 00:00 reset metrics
            const midnight = new Date();
            midnight.setHours(0, 0, 0, 0);

            const deposits = await prisma.cryptoDeposit.aggregate({
                where: { status: "COMPLETED", createdAt: { gte: midnight } },
                _sum: { amountUsd: true },
            });
            const dailyGross = deposits._sum.amountUsd || 0;

            const purchases = await prisma.order.findMany({
                where: { createdAt: { gte: midnight } },
            });

            let platformProfit = 0;
            let totalVolume = 0;
            for (const order of purchases) {
                totalVolume += order.pricePaid;
                const product = await prisma.product.findUnique({
                    where: { id: order.productId },
                    include: { shop: { include: { owner: true } } },
                });
                if (product && product.shop && product.shop.owner) {
                    const ev = product.shop.owner;
                    let split = 0.5;
                    if (ev.customSplit !== null) split = ev.customSplit;
                    else if (ev.rank === "ENTERPRISE" || ev.rank === "ADMIN") split = 0.75;
                    else if (ev.rank === "PREMIUM")
                        split = 0.6;
                    platformProfit += order.pricePaid * (1 - split);
                } else {
                    platformProfit += order.pricePaid; // Unknown vendor = 100% platform absorb
                }
            }

            const text =
                `<b>📊 Global Market Telemetry</b>\n\n` +
                `👥 <b>Unranked Buyers:</b> <code>${buyerCount}</code>\n` +
                `🏪 <b>Active Vendors:</b> <code>${vendorCount}</code>\n` +
                `🛡️ <b>Administrators:</b> <code>${adminCount}</code>\n\n` +
                `💰 <b>Platform Profit (Since 00:00):</b> <code>$${platformProfit.toFixed(2)}</code>\n` +
                `📈 <b>Total Market Volume (Since 00:00):</b> <code>$${totalVolume.toFixed(2)}</code>\n\n` +
                `<i>Connection Latency: Secure</i>`;

            bot.editMessageText(text, rootOpt);
        } catch {
            bot.answerCallbackQuery(query.id, {
                text: `Database cluster unavailable.`,
                show_alert: true,
            });
        }
    }

    if (action.startsWith("PAGE_USERS_")) {
        const page = parseInt(action.split("_")[2]);
        try {
            const pageSize = 10;
            const users = await prisma.user.findMany({
                orderBy: { createdAt: "desc" },
                skip: page * pageSize,
                take: pageSize,
            });
            const totalUsers = await prisma.user.count();
            const totalPages = Math.ceil(totalUsers / pageSize) || 1;

            let userBtns = [];
            for (const u of users) {
                let tag = "";
                if (u.bannedUntil) tag = " [BANNED]";
                userBtns.push([
                    {
                        text: `${u.username}${tag}`,
                        callback_data: `VIEW_USER_${u.id}`,
                    },
                ]);
            }

            let navRow = [];
            if (page > 0)
                navRow.push({
                    text: "◀️",
                    callback_data: `PAGE_USERS_${page - 1}`,
                });
            navRow.push({
                text: `Page ${page + 1} / ${totalPages}`,
                callback_data: "IGNORE",
            });
            if (page < totalPages - 1)
                navRow.push({
                    text: "▶️",
                    callback_data: `PAGE_USERS_${page + 1}`,
                });
            if (navRow.length > 0) userBtns.push(navRow);

            userBtns.push([
                { text: "🔙 Main Menu", callback_data: "ACTION_MAIN_MENU" },
            ]);

            bot.editMessageText(
                `<b>[ 👥 GLOBAL IDENTITY DATABASE ]</b>\n\nPage <b>${page + 1}</b> / <b>${totalPages}</b>\nSelect an identity to intercept its root details.`,
                {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: "HTML",
                    reply_markup: { inline_keyboard: userBtns },
                },
            );
        } catch (err) {
            bot.answerCallbackQuery(query.id, {
                text: `Database error.`,
                show_alert: true,
            });
        }
    }

    if (action.startsWith("VIEW_USER_")) {
        const targetId = action.substring("VIEW_USER_".length);
        try {
            const user = await prisma.user.findUnique({
                where: { id: targetId },
            });
            if (!user)
                return bot.answerCallbackQuery(query.id, {
                    text: `Target missing.`,
                    show_alert: true,
                });

            const text =
                `<b>[ 🕵️ EXTRACTED TARGET INTEL ]</b>\n\n` +
                `<b>Username:</b> ${user.username}\n` +
                `<b>Email:</b> <code>${user.email}</code>\n` +
                `<b>ID:</b> <code>${user.id}</code>\n` +
                `<b>Rank:</b> ${user.rank}\n` +
                `<b>BLT Credits:</b> $${user.credits.toFixed(2)}\n` +
                `<b>Vendor Balance:</b> $${user.vendorBalance.toFixed(2)}\n` +
                `<b>Join Date:</b> ${user.createdAt.toLocaleDateString()}\n` +
                `<b>Last Online:</b> ${user.lastOnline.toLocaleString()}\n` +
                `<b>Banned:</b> ${user.bannedUntil ? "YES (" + user.banReason + ")" : "NO"}\n`;

            bot.editMessageText(text, {
                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: "HTML",
                reply_markup: {
                    inline_keyboard: [
                        [
                            {
                                text: "🔙 Return to Database",
                                callback_data: "PAGE_USERS_0",
                            },
                        ],
                    ],
                },
            });
        } catch (e) {
            bot.answerCallbackQuery(query.id, {
                text: `DB Error.`,
                show_alert: true,
            });
        }
    }

    if (action === "ACTION_CHECK_DISPUTES") {
        try {
            const openDisputes = await prisma.dispute.findMany({
                where: { status: "OPEN" },
                orderBy: { createdAt: "asc" },
                take: 10,
            });
            const totalCount = await prisma.dispute.count({
                where: { status: "OPEN" },
            });

            if (totalCount === 0) {
                return bot.editMessageText(
                    `<b>[ ⚖️ ARBITRATION QUEUE ]</b>\n\nThere are currently zero open disputes pending your action.`,
                    {
                        chat_id: chatId,
                        message_id: query.message.message_id,
                        parse_mode: "HTML",
                        reply_markup: UI_MAIN_MENU.reply_markup,
                    },
                );
            }

            let report = `<b>[ ⚖️ ARBITRATION QUEUE ]</b>\n\n`;
            report += `<b>Total Backlog:</b> ${totalCount} Active Tickets\n\n`;
            report += `<b>Top Priority (Oldest 10):</b>\n`;

            for (const d of openDisputes) {
                report += `• Order <code>#${d.orderId}</code> (Opened: ${new Date(d.createdAt).toLocaleDateString()})\n`;
            }

            bot.editMessageText(report, {
                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: "HTML",
                reply_markup: UI_MAIN_MENU.reply_markup,
            });
        } catch (e) {
            bot.answerCallbackQuery(query.id, {
                text: `Failed to sequence active discrepancies.`,
                show_alert: true,
            });
        }
    }

    if (action === "ACTION_MANAGE_ADS") {
        try {
            const ads = await prisma.advertisement.findMany({
                where: { status: "ACTIVE" },
                include: { vendor: true },
            });
            if (ads.length === 0)
                return bot.answerCallbackQuery(query.id, {
                    text: "No active ads running.",
                    show_alert: true,
                });

            let kb = [];
            ads.forEach((ad) => {
                kb.push([
                    {
                        text: `[Slot ${ad.slotId}] ${ad.vendor.username} - ${ad.targetUrl.substring(0, 15)}...`,
                        callback_data: `VIEW_AD_${ad.id}`,
                    },
                ]);
            });
            kb.push([
                { text: "🔙 Main Menu", callback_data: "ACTION_MAIN_MENU" },
            ]);

            bot.editMessageText(
                `<b>[ 🖼️ ADVERTISEMENT MANAGEMENT ]</b>\n\nSelect an active Advertisement to inspect or terminate:`,
                {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: "HTML",
                    reply_markup: { inline_keyboard: kb },
                },
            );
        } catch (e) {
            bot.answerCallbackQuery(query.id, {
                text: "DB Error.",
                show_alert: true,
            });
        }
    }

    if (action.startsWith("VIEW_AD_")) {
        const adId = action.substring("VIEW_AD_".length);
        try {
            const ad = await prisma.advertisement.findUnique({
                where: { id: adId },
                include: { vendor: true },
            });
            if (!ad)
                return bot.answerCallbackQuery(query.id, {
                    text: "Missing Ad.",
                    show_alert: true,
                });

            let kb = [
                [
                    {
                        text: "🗑️ TERMINATE AD",
                        callback_data: `DELETE_AD_${ad.id}`,
                    },
                ],
                [
                    {
                        text: "🔙 Return to Ads",
                        callback_data: "ACTION_MANAGE_ADS",
                    },
                ],
            ];

            const text =
                `<b>[ 🖼️ AD INTERCEPTION ]</b>\n\n` +
                `<b>Vendor:</b> <code>${ad.vendor.username}</code>\n` +
                `<b>Slot ID:</b> <code>${ad.slotId}</code>\n` +
                `<b>Clicks:</b> <code>${ad.clicks}</code>\n` +
                `<b>Expires:</b> ${ad.expiresAt ? ad.expiresAt.toLocaleDateString() : "Never"}\n\n` +
                `<b>Target URL:</b> <code>${ad.targetUrl}</code>\n` +
                `<b>Image URL:</b> <code>${ad.imageUrl}</code>`;

            bot.editMessageText(text, {
                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: "HTML",
                reply_markup: { inline_keyboard: kb },
                disable_web_page_preview: true,
            });
        } catch (e) {
            bot.answerCallbackQuery(query.id, {
                text: "DB Error.",
                show_alert: true,
            });
        }
    }

    if (action.startsWith("DELETE_AD_")) {
        const adId = action.substring("DELETE_AD_".length);
        try {
            await prisma.advertisement.delete({ where: { id: adId } });
            await logBotAudit(query.from, "DELETE_AD", adId, {});
            bot.answerCallbackQuery(query.id, {
                text: "Ad permanently terminated.",
                show_alert: true,
            });

            const ads = await prisma.advertisement.findMany({
                where: { status: "ACTIVE" },
                include: { vendor: true },
            });
            let kb = [];
            ads.forEach((ad) => {
                kb.push([
                    {
                        text: `[Slot ${ad.slotId}] ${ad.vendor.username}`,
                        callback_data: `VIEW_AD_${ad.id}`,
                    },
                ]);
            });
            kb.push([
                { text: "🔙 Main Menu", callback_data: "ACTION_MAIN_MENU" },
            ]);

            bot.editMessageText(
                `<b>[ 🖼️ ADVERTISEMENT MANAGEMENT ]</b>\n\nAd Terminated Successfully. Current active ads:`,
                {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: "HTML",
                    reply_markup: { inline_keyboard: kb },
                },
            );
        } catch (e) {
            bot.answerCallbackQuery(query.id, {
                text: "DB Error.",
                show_alert: true,
            });
        }
    }

    if (action === "ACTION_CHECK_WITHDRAWALS") {
        try {
            const wds = await prisma.withdrawal.findMany({
                where: { status: "PENDING" },
                orderBy: { createdAt: "asc" },
                include: { user: true },
            });

            if (wds.length === 0) {
                return bot.editMessageText(
                    `<b>[ 💸 WITHDRAWAL QUEUE ]</b>\n\nNo pending withdrawal requests.`,
                    {
                        chat_id: chatId,
                        message_id: query.message.message_id,
                        parse_mode: "HTML",
                        reply_markup: UI_MAIN_MENU.reply_markup,
                    },
                );
            }

            let kb = [];
            let report = `<b>[ 💸 PENDING WITHDRAWALS ]</b>\n\n`;

            for (let i = 0; i < Math.min(wds.length, 5); i++) {
                const wd = wds[i];
                report += `• <b>Order ID:</b> <code>${wd.id.substring(0, 8)}</code>\n`;
                report += `  Target: <code>${wd.user.username}</code>\n`;
                report += `  Net Amount (Pre-Calculated/Subtracts Done): <b>$${wd.amount.toFixed(2)}</b>\n`;
                report += `  Network: <b>${wd.network}</b>\n`;
                report += `  Address: <code>${wd.cryptoAddress}</code>\n\n`;

                kb.push([
                    {
                        text: `✅ Mark Paid (#${wd.id.substring(0, 8)})`,
                        callback_data: `WD_PAY|${wd.id}`,
                    },
                    {
                        text: `❌ Deny (#${wd.id.substring(0, 8)})`,
                        callback_data: `WD_REJ|${wd.id}`,
                    },
                ]);
            }

            kb.push([
                {
                    text: "🔙 Return to Main Menu",
                    callback_data: "ACTION_MAIN_MENU",
                },
            ]);
            bot.editMessageText(report, {
                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: "HTML",
                reply_markup: { inline_keyboard: kb },
            });
        } catch (e) {
            bot.answerCallbackQuery(query.id, {
                text: `Failed to fetch withdrawals.`,
                show_alert: true,
            });
        }
    }

    if (action.startsWith("WD_PAY|") || action.startsWith("WD_REJ|")) {
        const parts = action.split("|");
        const wdId = parts[1];
        const isPay = action.startsWith("WD_PAY|");

        try {
            const wd = await prisma.withdrawal.findUnique({
                where: { id: wdId },
                include: { user: true },
            });
            if (!wd || wd.status !== "PENDING")
                return bot.answerCallbackQuery(query.id, {
                    text: "Already handled or invalid.",
                    show_alert: true,
                });

            if (isPay) {
                await prisma.withdrawal.update({
                    where: { id: wdId },
                    data: { status: "SENT" },
                });
                await logBotAudit(query.from, "WITHDRAWAL_APPROVE", wdId, {
                    amount: wd.amount,
                    network: wd.network,
                });
                bot.sendMessage(
                    chatId,
                    `<b>✅ WITHDRAWAL FULFILLED</b>\n\nOrder <code>${wdId.substring(0, 8)}</code> marked as SENT in vendor's dashboard.`,
                    { parse_mode: "HTML" },
                );

                if (wd.user && wd.user.telegramChatId) {
                    if (!VENDOR_BOT_TOKEN) {
                        logger.error("VENDOR_BOT_TOKEN not set");
                        return;
                    }
                    const vText = `<b>[ 💸 PAYMENT DISPATCHED ]</b>\n\nYour withdrawal request for <b>$${wd.amount.toFixed(2)}</b> over the <b>${wd.network}</b> network has been officially processed & paid out by the Silverbullet Administration.\n\nThank you for doing business!`;
                    fetch(
                        `https://api.telegram.org/bot${VENDOR_BOT_TOKEN}/sendMessage`,
                        {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                chat_id: wd.user.telegramChatId,
                                text: vText,
                                parse_mode: "HTML",
                            }),
                        },
                    ).catch(() => {});
                }
            } else {
                // Deny and refund
                await prisma.$transaction([
                    prisma.withdrawal.update({
                        where: { id: wdId },
                        data: { status: "REJECTED" },
                    }),
                    prisma.user.update({
                        where: { id: wd.userId },
                        data: { vendorBalance: { increment: wd.amount } },
                    }),
                ]);
                await logBotAudit(query.from, "WITHDRAWAL_REJECT", wdId, {
                    amount: wd.amount,
                    network: wd.network,
                });
                bot.sendMessage(
                    chatId,
                    `<b>❌ WITHDRAWAL REJECTED</b>\n\nOrder <code>${wdId.substring(0, 8)}</code> rejected and Vault balance refunded.`,
                    { parse_mode: "HTML" },
                );
            }

            bot.answerCallbackQuery(query.id, {
                text: isPay ? "Marked as Paid!" : "Refunded & Denied!",
            });
        } catch (e) {
            bot.answerCallbackQuery(query.id, {
                text: `Transaction exception.`,
                show_alert: true,
            });
        }
    }

    if (action.startsWith("BDG|")) {
        const parts = action.split("|");
        const badge = parts[1];
        const targetId = parts[2];
        try {
            const u = await prisma.user.findUnique({ where: { id: targetId } });
            if (!u)
                return bot.answerCallbackQuery(query.id, {
                    text: "User phantom.",
                    show_alert: true,
                });

            let currentBadgesStr = u.customBadges || "";
            let badgesArray = currentBadgesStr
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);

            if (badge === "CLEAR") {
                badgesArray = [];
            } else {
                if (badgesArray.includes(badge))
                    badgesArray = badgesArray.filter((b) => b !== badge);
                else badgesArray.push(badge);
            }

            const newBadgesStr =
                badgesArray.length > 0 ? badgesArray.join(",") : null;
            await prisma.user.update({
                where: { id: targetId },
                data: { customBadges: newBadgesStr },
            });
            await logBotAudit(query.from, "ASSIGN_BADGES", u.username, {
                badges: newBadgesStr,
                mode: badge === "CLEAR" ? "clear" : "toggle",
            });

            const badges = newBadgesStr || "";
            const newKb = {
                inline_keyboard: [
                    [
                        {
                            text: badges.includes("DEV") ? "✅ DEV" : "DEV",
                            callback_data: `BDG|DEV|${targetId}`,
                        },
                        {
                            text: badges.includes("LGBTQ")
                                ? "✅ LGBTQ+"
                                : "LGBTQ+",
                            callback_data: `BDG|LGBTQ|${targetId}`,
                        },
                    ],
                    [
                        {
                            text: badges.includes("BUG_HUNTER")
                                ? "✅ BUG HUNTER"
                                : "BUG HUNTER",
                            callback_data: `BDG|BUG_HUNTER|${targetId}`,
                        },
                        {
                            text: badges.includes("GHOST")
                                ? "✅ GHOST"
                                : "GHOST",
                            callback_data: `BDG|GHOST|${targetId}`,
                        },
                    ],
                    [
                        {
                            text: "🧹 CLEAR ALL BADGES",
                            callback_data: `BDG|CLEAR|${targetId}`,
                        },
                    ],
                    [
                        {
                            text: "✅ Apply Configuration & Return",
                            callback_data: `ACTION_MAIN_MENU`,
                        },
                    ],
                ],
            };

            await bot.editMessageReplyMarkup(newKb, {
                chat_id: chatId,
                message_id: query.message.message_id,
            });
            bot.answerCallbackQuery(query.id, {
                text: badge === "CLEAR" ? "Badges WIPED" : `Toggled ${badge}`,
            });
        } catch (e) {
            bot.answerCallbackQuery(query.id, {
                text: "Database error.",
                show_alert: true,
            });
        }
    }

    if (action.startsWith("SET_RANK_")) {
        const VALID_RANKS = [
            "USER",
            "STARTER",
            "PRO",
            "PREMIUM",
            "ENTERPRISE",
            "ADMIN",
        ];
        const rank = action.split("SET_RANK_")[1];
        if (!VALID_RANKS.includes(rank))
            return bot.sendMessage(
                chatId,
                `<b>[ ERROR ]</b> Invalid rank array literal.`,
                UI_MAIN_MENU,
            );
        const session = activeSessions[userId];
        if (!session || !session.targetUser)
            return bot.sendMessage(chatId, `Session expired. Start over.`);
        const tb = session.targetUser;
        activeSessions[userId] = null;
        try {
            const hitUser = await prisma.user.findFirst({
                where: { username: { equals: tb, mode: "insensitive" } },
            });
            if (!hitUser)
                return bot.sendMessage(
                    chatId,
                    `<b>[ ERROR ]</b> Target user not found: ${tb}`,
                    UI_MAIN_MENU,
                );
            await prisma.user.update({
                where: { id: hitUser.id },
                data: { rank: rank },
            });
            await logBotAudit(query.from, "CHANGE_RANK", hitUser.username, {
                rank,
            });
            bot.sendMessage(
                chatId,
                `<b>✅ SUCCESS</b>\nRank rewritten to ${rank}`,
                UI_MAIN_MENU,
            );
        } catch (e) {
            bot.sendMessage(
                chatId,
                `<b>[ FATAL ]</b> Failed: ${e.message}`,
                UI_MAIN_MENU,
            );
        }
    }

    if (action.startsWith("TOGGLE_ADM_")) {
        const u = action.substring("TOGGLE_ADM_".length);
        const session = activeSessions[userId];
        if (!session || session.step !== "AWAITING_ADMIN_LVL_USER")
            return bot.answerCallbackQuery(query.id, {
                text: "Session expired.",
            });

        if (session.selected.includes(u))
            session.selected = session.selected.filter((x) => x !== u);
        else session.selected.push(u);

        const admins = await prisma.user.findMany({
            where: { rank: "ADMIN" },
            select: { username: true },
        });
        let kb = [];
        for (let i = 0; i < admins.length; i += 2) {
            let row = [];
            const a1 = admins[i].username;
            row.push({
                text: `${session.selected.includes(a1) ? "✅" : "⬜"} ${a1}`,
                callback_data: `TOGGLE_ADM_${a1}`,
            });
            if (admins[i + 1]) {
                const a2 = admins[i + 1].username;
                row.push({
                    text: `${session.selected.includes(a2) ? "✅" : "⬜"} ${a2}`,
                    callback_data: `TOGGLE_ADM_${a2}`,
                });
            }
            kb.push(row);
        }
        kb.push([
            {
                text: `✅ Proceed (${session.selected.length})`,
                callback_data: "PROCEED_ADM_LVL",
            },
        ]);

        bot.editMessageText(
            `<b>[ 🛡️ ADMIN CLEARANCE ]</b>\n\nSelect the Admins from the list below, or type Target Username(s) separated by commas:\n\n<i>Currently Selected: ${session.selected.length > 0 ? session.selected.join(", ") : "None"}</i>`,
            {
                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: "HTML",
                reply_markup: { inline_keyboard: kb },
            },
        );
    }

    if (action === "PROCEED_ADM_LVL") {
        const session = activeSessions[userId];
        if (!session || session.step !== "AWAITING_ADMIN_LVL_USER")
            return bot.answerCallbackQuery(query.id, {
                text: "Session expired.",
            });
        if (session.selected.length === 0)
            return bot.answerCallbackQuery(query.id, {
                text: "Select at least one admin!",
                show_alert: true,
            });

        session.targetUser = session.selected.join(",");
        session.step = "AWAITING_ADMIN_ROLES";
        session.selectedRoles = [];
        const kb = [
            [
                { text: "⬜ Owner", callback_data: "TOGGLE_ROLE_0" },
                { text: "⬜ Co-Owner", callback_data: "TOGGLE_ROLE_1" },
            ],
            [
                { text: "⬜ Mod", callback_data: "TOGGLE_ROLE_2" },
                { text: "⬜ Support", callback_data: "TOGGLE_ROLE_3" },
            ],
            [{ text: "✅ Apply Titles (0)", callback_data: "APPLY_ROLES" }],
        ];
        bot.editMessageText(
            `Targets locked: <code>${session.targetUser}</code> (${session.selected.length} users)\n\nSelect the explicit Admin Titles to assign:`,
            {
                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: "HTML",
                reply_markup: { inline_keyboard: kb },
            },
        );
    }

    // Phase 25: Custom Requests Interception
    if (action.startsWith("APPROVEREQ_")) {
        const crId = action.split("APPROVEREQ_")[1];
        try {
            await prisma.customRequest.update({
                where: { id: crId },
                data: { status: "APPROVED" },
            });
            await logBotAudit(query.from, "REQUEST_APPROVE", crId, {});
            return bot.editMessageText(
                `<b>✅ CUSTOM REQUEST APPROVED</b>\n\nRequest <code>${crId}</code> has been pushed to the public board.`,
                {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: "HTML",
                },
            );
        } catch (e) {
            return bot.sendMessage(chatId, `Database error on Request.`);
        }
    }

    if (action.startsWith("REJECTREQ_")) {
        const crId = action.split("REJECTREQ_")[1];
        try {
            await prisma.customRequest.update({
                where: { id: crId },
                data: { status: "REJECTED" },
            });
            await logBotAudit(query.from, "REQUEST_REJECT", crId, {});
            return bot.editMessageText(
                `<b>❌ CUSTOM REQUEST REJECTED</b>\n\nRequest <code>${crId}</code> has been denied and hidden.`,
                {
                    chat_id: chatId,
                    message_id: query.message.message_id,
                    parse_mode: "HTML",
                },
            );
        } catch (e) {
            return bot.sendMessage(chatId, `Database error on Request.`);
        }
    }

    if (action.startsWith("TOGGLE_ROLE_")) {
        const roleStr = action.split("TOGGLE_ROLE_")[1];
        const session = activeSessions[userId];
        if (!session || session.step !== "AWAITING_ADMIN_ROLES")
            return bot.answerCallbackQuery(query.id, {
                text: "Session expired.",
            });

        if (session.selectedRoles.includes(roleStr))
            session.selectedRoles = session.selectedRoles.filter(
                (x) => x !== roleStr,
            );
        else session.selectedRoles.push(roleStr);

        const kb = [
            [
                {
                    text: `${session.selectedRoles.includes("0") ? "✅" : "⬜"} Owner`,
                    callback_data: "TOGGLE_ROLE_0",
                },
                {
                    text: `${session.selectedRoles.includes("1") ? "✅" : "⬜"} Co-Owner`,
                    callback_data: "TOGGLE_ROLE_1",
                },
            ],
            [
                {
                    text: `${session.selectedRoles.includes("2") ? "✅" : "⬜"} Mod`,
                    callback_data: "TOGGLE_ROLE_2",
                },
                {
                    text: `${session.selectedRoles.includes("3") ? "✅" : "⬜"} Support`,
                    callback_data: "TOGGLE_ROLE_3",
                },
            ],
            [
                {
                    text: `✅ Apply Titles (${session.selectedRoles.length})`,
                    callback_data: "APPLY_ROLES",
                },
            ],
        ];
        bot.editMessageText(
            `Targets locked: <code>${session.targetUser}</code>\n\nSelect the explicit Admin Titles to assign:`,
            {
                chat_id: chatId,
                message_id: query.message.message_id,
                parse_mode: "HTML",
                reply_markup: { inline_keyboard: kb },
            },
        );
    }

    if (action === "APPLY_ROLES") {
        const session = activeSessions[userId];
        if (!session || session.step !== "AWAITING_ADMIN_ROLES")
            return bot.answerCallbackQuery(query.id, {
                text: "Session expired.",
            });
        if (!session.selectedRoles || session.selectedRoles.length === 0)
            return bot.sendMessage(
                chatId,
                `<b>[ ERROR ]</b> Must select at least 1 explicit role. Zero-role arrays bypass system locks.`,
                UI_MAIN_MENU,
            );

        const usernames = session.targetUser
            .split(",")
            .map((u) => u.trim())
            .filter((u) => u);
        const rolesStr = session.selectedRoles.join(",");
        activeSessions[userId] = null;

        try {
            const result = await prisma.user.updateMany({
                where: { username: { in: usernames } },
                data: { adminRoles: rolesStr, rank: "ADMIN" },
            });
            await logBotAudit(
                query.from,
                "SET_ADMIN_ROLES",
                usernames.join(","),
                { roles: session.selectedRoles.map((r) => Number(r)) },
            );
            bot.sendMessage(
                chatId,
                `<b>✅ SUCCESS</b>\nTitles mapped exactly to [${rolesStr}] for ${result.count} users.`,
                UI_MAIN_MENU,
            );
        } catch (e) {
            logger.error("[ FATAL ERROR ]", e);
            bot.sendMessage(
                chatId,
                `<b>[ FATAL ]</b> Failed to rewrite clearance loops.`,
                UI_MAIN_MENU,
            );
        }
    }

    if (action.startsWith("TICK_REPLY|")) {
        const ticketId = action.split("|")[1];
        activeSessions[userId] = { step: "AWAITING_TICKET_REPLY", ticketId };
        bot.sendMessage(
            chatId,
            `<b>[ ✍️ TICKET REPLY ]</b>\n\nEnter your response for ticket <code>${ticketId}</code>:`,
            {
                parse_mode: "HTML",
                reply_markup: { force_reply: true },
            },
        );
    }

    if (action.startsWith("TICK_CLOSE|")) {
        const ticketId = action.split("|")[1];
        try {
            await prisma.supportTicket.update({
                where: { id: ticketId },
                data: { status: "CLOSED" },
            });
            await logBotAudit(query.from, "TICKET_CLOSE", ticketId, {});
            bot.answerCallbackQuery(query.id, {
                text: "Ticket successfully closed.",
                show_alert: true,
            });
            bot.sendMessage(
                chatId,
                `<b>❌ TICKET CLOSED</b>\n\nTicket <code>${ticketId}</code> has been marked as resolved.`,
                UI_MAIN_MENU,
            );
        } catch (e) {
            bot.answerCallbackQuery(query.id, {
                text: "Failed to close ticket.",
                show_alert: true,
            });
        }
    }
});

bot.on("polling_error", (error) => {
    // Suppress stale query errors
    if (error.message && error.message.includes("query is too old")) return;
    logger.error(
        { code: error.code, message: error.message },
        "Telegram error",
    );
});

logger.info("Admin authenticator listening and armed.");
