const express = require("express");
const path = require("path");

const { UPLOAD_DIR } = require("./shared");

const subRoutes = [
    require("./auth.routes"),
    require("./user.routes"),
    require("./support.routes"),
    require("./billing.routes"),
    require("./configs.routes"),
    require("./market.routes"),
    require("./enterprise.routes"),
    require("./marketExtended.routes"),
    require("./ads.routes"),
    require("./requests.routes"),
    require("./dispute.routes"),
    require("./settings.routes"),
    require("./rdp.seller.routes"),
    require("./rdp.buyer.routes"),
    require("./checkers/checkers.routes"),
];

const router = express.Router();

router.use(
    "/api/downloads",
    (req, res, next) => {
        const ext = path.extname(req.path || "").toLowerCase();
        if (ext !== ".espk" && ext !== ".svb") {
            return res.status(403).json({ error: "Forbidden file type." });
        }
        return next();
    },
    express.static(path.join(__dirname, "../downloads"), {
        dotfiles: "deny",
        index: false,
    }),
    (req, res) => {
        res.status(404).json({ error: "File not found. Please upload the config again." });
    }
);

router.use("/api/admin", require("../admin.routes"));
for (const { path: mountPath, router: subRouter } of subRoutes) {
    router.use(mountPath, subRouter);
}

const PUBLIC_UPLOAD_EXTENSIONS = new Set([
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".webp",
    ".svg",
]);
router.use(
    "/uploads",
    (req, res, next) => {
        const ext = path.extname(req.path || "").toLowerCase();
        if (!PUBLIC_UPLOAD_EXTENSIONS.has(ext)) {
            return res.status(403).json({ error: "Forbidden file type." });
        }
        return next();
    },
    express.static(path.join(__dirname, "uploads"), {
        dotfiles: "deny",
        index: false,
        maxAge: "1h",
    }),
);


module.exports = router;
