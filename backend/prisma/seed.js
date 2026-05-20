const bcrypt = require("bcryptjs");
const { getLogger } = require("../lib/logger");
const prisma = require("../lib/prisma");

const logger = getLogger("prisma_seed", { msgPrefix: "[prisma-seed] " });

async function main() {
    logger.info("Wiping existing data for pristine test environment...");
    await prisma.product.deleteMany();
    await prisma.shop.deleteMany();
    await prisma.adminConfig.deleteMany();
    await prisma.user.deleteMany();

    const saltRounds = 10;
    const commonPasswordHash = await bcrypt.hash("silverbullet123", saltRounds);

    logger.info("Seeding Database Ranks & Users...");

    // Admins
    const admin = await prisma.user.create({
        data: {
            username: "SilverbulletCore",
            email: "admin@silverbullet.to",
            passwordHash: commonPasswordHash,
            rank: "ADMIN",
            credits: 9999999,
        },
    });

    // Free User
    await prisma.user.create({
        data: {
            username: "FreeLeaker",
            email: "free@silverbullet.to",
            passwordHash: commonPasswordHash,
            rank: "USER",
            credits: 0,
        },
    });

    // Enterprise Vendors (For the 4 Shops)
    const vendor1 = await prisma.user.create({
        data: {
            username: "EnterprisePlug",
            email: "vendor1@silverbullet.to",
            passwordHash: commonPasswordHash,
            rank: "SUPREME",
            credits: 15000,
            avatarUrl: "/default-avatar.png",
        },
    });
    const vendor2 = await prisma.user.create({
        data: {
            username: "ZeroDayLogs",
            email: "vendor2@silverbullet.to",
            passwordHash: commonPasswordHash,
            rank: "VIP",
            credits: 2500,
            avatarUrl: "/default-avatar.png",
        },
    });
    const vendor3 = await prisma.user.create({
        data: {
            username: "GhostProtocol",
            email: "vendor3@silverbullet.to",
            passwordHash: commonPasswordHash,
            rank: "SUPREME",
            credits: 89000,
            avatarUrl: "/default-avatar.png",
        },
    });
    const vendor4 = await prisma.user.create({
        data: {
            username: "DataBrokerInc",
            email: "vendor4@silverbullet.to",
            passwordHash: commonPasswordHash,
            rank: "VIP",
            credits: 600,
            avatarUrl: "/default-avatar.png",
        },
    });

    logger.info("Injecting 5 Fake Admin Configs...");
    const fakeConfigs = [
        {
            title: "Netflix Premium API Checker v2.5",
            desc: "Site: netflix.com\nCombo: Email:Pass\nCapture: Subscription = Premium",
            size: 8524,
            fname: "config-netflix-v2.espk",
        },
        {
            title: "Hulu Stealth Parser",
            desc: "Site: hulu.com\nCombo: Email:Pass\nProxy: IPV4 Residential Only",
            size: 3042,
            fname: "config-hulu.espk",
        },
        {
            title: "Spotify Family Auto-Upgrader",
            desc: "Site: spotify.com\nCombo: User:Pass\nCapture: Family Owner = True",
            size: 12053,
            fname: "config-spotify.espk",
        },
        {
            title: "Disney+ Raw Hit Ripper",
            desc: "Site: disneyplus.com\nCombo: Email:Pass\nProxy: Rotating Required",
            size: 6632,
            fname: "config-disney.espk",
        },
        {
            title: "NordVPN Secure Auth Bypass",
            desc: "Site: nordvpn.com\nCombo: Email:Pass\nRequires custom JSON parsing block.",
            size: 4501,
            fname: "config-nord.espk",
        },
    ];

    for (const c of fakeConfigs) {
        await prisma.adminConfig.create({
            data: {
                title: c.title,
                description: c.desc,
                fileName: c.fname,
                fileSize: c.size,
                adminName: "SilverbulletCore",
            },
        });
    }

    logger.info("Constructing 4 Enterprise Marketplace Shops...");

    // Shop 1
    const shop1 = await prisma.shop.create({
        data: {
            ownerId: vendor1.id,
            shopName: "The Phantom Marketplace",
            shopDescription:
                "Premium zero-day vulnerabilities and residential IPs. Escrow accepted.",
            views: 8904,
        },
    });
    await prisma.product.create({
        data: {
            shopId: shop1.id,
            productName: "1M Fresh Email:Pass Combo List",
            description: "Scraped physically from private databases.",
            price: 50,
        },
    });
    await prisma.product.create({
        data: {
            shopId: shop1.id,
            productName: "10k HQ Mixed Proxies",
            description: "Elite rotating proxies.",
            price: 120,
        },
    });

    // Shop 2
    const shop2 = await prisma.shop.create({
        data: {
            ownerId: vendor2.id,
            shopName: "ZeroDay Configurations",
            shopDescription:
                "Private custom configurations coded to bypass Datadome/Akamai.",
            views: 4032,
        },
    });
    await prisma.product.create({
        data: {
            shopId: shop2.id,
            productName: "Custom Target API Dev",
            description:
                "I will custom code any API endpoint for Silverbullet.",
            price: 500,
        },
    });

    // Shop 3
    const shop3 = await prisma.shop.create({
        data: {
            ownerId: vendor3.id,
            shopName: "Ghost Protocol Identifiers",
            shopDescription:
                "Fullz, data packets, and cloud network interceptors.",
            views: 15402,
        },
    });
    await prisma.product.create({
        data: {
            shopId: shop3.id,
            productName: "Aged Corporate Cloud Logs",
            description: "High-level access packets.",
            price: 850,
        },
    });
    await prisma.product.create({
        data: {
            shopId: shop3.id,
            productName: "Private Routing Matrix",
            description: "Unblockable tunneling script.",
            price: 300,
        },
    });

    // Shop 4
    const shop4 = await prisma.shop.create({
        data: {
            ownerId: vendor4.id,
            shopName: "Data Broker Syndicate",
            shopDescription: "Wholesale digital goods. Strictly high volume.",
            views: 923,
        },
    });
    await prisma.product.create({
        data: {
            shopId: shop4.id,
            productName: "Bulk Streaming Accounts",
            description: "10,000 mixed hits.",
            price: 100,
        },
    });

    logger.info("Entire Enterprise Ecosystem Seeded!");
    logger.info("-----------------------------------------");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
