const express = require("express");
const { prisma } = require("./shared");

const router = express.Router();

/**
 * @swagger
 * /api/settings/banner:
 *   get:
 *     tags: [settings]
 *     summary: Get the global banner settings.
 *     responses:
 *       200:
 *         description: Global banner settings.
 */
router.get("/banner", async (req, res) => {
    try {
        let settings = await prisma.systemSettings.findUnique({
            where: { id: "global" },
        });

        if (!settings) {
            settings = {
                bannerActive: false,
                bannerMessage: "",
                bannerColor: "bg-indigo-600",
            };
        }

        res.json({
            success: true,
            data: {
                active: settings.bannerActive,
                message: settings.bannerMessage,
                color: settings.bannerColor,
            },
        });
    } catch (err) {
        console.error("Error fetching global banner:", err);
        res.status(500).json({ error: "Failed to fetch settings." });
    }
});

module.exports = { path: "/api/settings", router };
