const { body, param, query } = require("express-validator");

const marketValidators = {
    buyBody: [
        body("productId")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("ProductID missing."),
    ],
    shopsQuery: [
        query("page").optional().isInt({ min: 0 }),
        query("limit").optional().isInt({ min: 1, max: 100 }),
    ],
    accountsQuery: [
        query("page").optional().isInt({ min: 0 }),
        query("limit").optional().isInt({ min: 1, max: 200 }),
        query("search").optional().isString(),
        query("country").optional().isString(),
        query("sort").optional().isString(),
    ],
    shopIdParam: [
        param("id")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("Shop id is required."),
    ],
    ticketCreate: [
        body("shopId")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("Invalid ticket payload."),
        body("message")
            .isString()
            .trim()
            .isLength({ min: 1, max: 5000 })
            .withMessage("Invalid ticket payload."),
    ],
    purchaseParam: [
        param("productId")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("Product id is required."),
    ],
    purchaseBody: [
        body("amount")
            .optional()
            .isInt({ min: 1 })
            .withMessage("Amount must be a positive integer."),
    ],
    review: [
        param("productId")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("Product id is required."),
        body("score")
            .isInt({ min: 1, max: 5 })
            .withMessage("Invalid scoring matrix."),
        body("orderId")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("Missing explicit receipt signature."),
    ],
};

module.exports = { marketValidators };
