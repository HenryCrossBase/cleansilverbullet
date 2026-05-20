const { body, param } = require("express-validator");

const disputeValidators = {
    report: [
        body("orderId")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("Order id is required."),
        body("initialMessage")
            .isString()
            .trim()
            .isLength({ min: 1 })
            .withMessage(
                "An initial message is strictly required to open a dispute.",
            ),
    ],
    orderIdParam: [
        param("orderId")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("Order id is required."),
    ],
    reply: [
        body("message")
            .isString()
            .trim()
            .isLength({ min: 1 })
            .withMessage("Message empty."),
    ],
    resolve: [
        body("action")
            .isIn(["APPROVE", "REJECT"])
            .withMessage("Invalid resolution action."),
    ],
};

module.exports = { disputeValidators };
