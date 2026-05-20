const { body, param } = require("express-validator");

const requestsValidators = {
    contact: [
        body("email").isEmail().withMessage("Invalid contact payload."),
        body("subject")
            .optional()
            .isString()
            .isLength({ max: 200 })
            .withMessage("Invalid contact payload."),
        body("message")
            .isString()
            .trim()
            .isLength({ min: 1, max: 5000 })
            .withMessage("Invalid contact payload."),
    ],
    submit: [
        body("title")
            .isString()
            .trim()
            .isLength({ min: 1, max: 150 })
            .withMessage("Invalid request payload size."),
        body("description")
            .isString()
            .trim()
            .isLength({ min: 1, max: 5000 })
            .withMessage("Invalid request payload size."),
    ],
    notifyParam: [
        param("id")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("Request id is required."),
    ],
};

module.exports = { requestsValidators };
