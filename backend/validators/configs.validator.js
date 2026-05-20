const { body, param, query } = require("express-validator");

const configsValidators = {
    listQuery: [
        query("limit")
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage("Limit must be an integer between 1 and 100."),
    ],
    configIdParam: [
        param("id")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("Config id is required."),
    ],
    rateBody: [
        body("score")
            .isInt({ min: 1, max: 5 })
            .withMessage("Invalid rating dimension."),
    ],
};

module.exports = { configsValidators };
