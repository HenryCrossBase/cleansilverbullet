const { body } = require("express-validator");

const billingValidators = {
    cryptoInvoice: [
        body("amountUsd")
            .isFloat({ min: 1 })
            .withMessage("Minimum deposit is legally strictly 1.00 USD."),
    ],
    buyUpgrade: [
        body("itemType")
            .isIn([
                "RANK_STARTER",
                "RANK_PRO",
                "RANK_PREMIUM",
                "RANK_ENTERPRISE",
                "SOFTWARE_ONLY",
                "SUB_BLUE_BADGE",
                "SUB_COSMETICS",
            ])
            .withMessage("Invalid product selection."),
        body("shopName")
            .optional()
            .isString()
            .isLength({ min: 1, max: 30 })
            .withMessage("Store name is required."),
    ],
};

module.exports = { billingValidators };
