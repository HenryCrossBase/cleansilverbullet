const { body, param } = require("express-validator");

const enterpriseValidators = {
    bid: [body("amount").isFloat({ gt: 0 }).withMessage("Invalid bid logic.")],
    productBid: [
        body("productId").isString().trim().notEmpty().withMessage("Product ID is required."),
        body("amount").isFloat({ gt: 0 }).withMessage("Invalid bid amount.")
    ],
    categoryBid: [
        body("productName").isString().trim().notEmpty().withMessage("Category/Product Name is required."),
        body("amount").isFloat({ gt: 0 }).withMessage("Invalid bid amount.")
    ],
    setup: [
        body("shopName")
            .isString()
            .trim()
            .isLength({ min: 1, max: 30 })
            .withMessage("Store Name is required."),
        body("avatarUrl").optional().isString(),
        body("bannerUrl").optional().isString(),
    ],
    bulkPrice: [
        body("category")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("Missing bulk parameters."),
        body("newPrice")
            .isInt({ min: 1 })
            .withMessage("Missing bulk parameters."),
    ],
    createProducts: [
        body("productName").isString().trim().notEmpty(),
        body("price").isInt({ min: 1 }),
        body("logContent").isString().trim().notEmpty(),
        body("description").optional().isString(),
        body("category").optional().isString(),
        body("country").optional().isString(),
        body("isBulk").optional().isBoolean(),
    ],
    editProduct: [
        param("id").isString().trim().notEmpty(),
        body("productName").isString().trim().notEmpty().withMessage("Name required."),
        body("country").isString().trim().notEmpty().withMessage("Country required."),
        body("logContent").isString().trim().notEmpty().withMessage("Info/Log Content required."),
        body("price").isInt({ min: 1 }).withMessage("Valid price required."),
    ],
    buyCosmetic: [
        body("type")
            .isIn(["badge", "color_pass", "avatar_update"])
            .withMessage("Invalid cosmetic type."),
        body("hexColor")
            .optional()
            .matches(/^#[0-9A-Fa-f]{6}$/),
        body("effect").optional().isString(),
        body("avatarUrl").optional().isString(),
        body("bannerUrl").optional().isString(),
        body("shopName").optional().isString(),
        body("shopDescription").optional().isString().isLength({ max: 140 }).withMessage("Bio cannot exceed 140 characters."),
    ],
    withdraw: [
        body("cryptoAddress").isString().trim().notEmpty(),
        body("network").isString().trim().notEmpty(),
        body("amount").isFloat({ gt: 0 }),
    ],
    productIdParam: [
        param("id")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("Product id is required."),
    ],
    bulkDelete: [
        body("category")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("Missing category target."),
    ],
};

module.exports = { enterpriseValidators };
