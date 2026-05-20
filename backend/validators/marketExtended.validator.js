const { body, param } = require("express-validator");

const marketExtendedValidators = {
    productIdParam: [
        param("id")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("Product id is required."),
    ],
    buy: [
        param("productId")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("Product id is required."),
        body("amount")
            .optional()
            .isInt({ min: 1 })
            .withMessage("Amount must be a positive integer."),
    ],
    dispute: [
        body("orderId")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("Missing payload"),
        body("target")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("Missing payload"),
    ],
    replaceLog: [
        body("disputeId")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("Invalid payload."),
        body("replacementLog")
            .isString()
            .trim()
            .isLength({ min: 1 })
            .withMessage("Invalid payload."),
    ],
};

module.exports = { marketExtendedValidators };
