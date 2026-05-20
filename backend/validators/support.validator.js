const { body, param, query } = require("express-validator");

const supportValidators = {
    createTicket: [
        body("subject")
            .isString()
            .trim()
            .isLength({ min: 1, max: 200 })
            .withMessage("Invalid transmission payload."),
        body("message")
            .isString()
            .trim()
            .isLength({ min: 1, max: 5000 })
            .withMessage("Invalid transmission payload."),
    ],
    ticketsQuery: [
        query("page")
            .optional()
            .isInt({ min: 0 })
            .withMessage("Page must be a non-negative integer."),
        query("limit")
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage("Limit must be an integer between 1 and 100."),
    ],
    ticketIdParam: [
        param("id")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("Ticket id is required."),
    ],
};

module.exports = { supportValidators };
