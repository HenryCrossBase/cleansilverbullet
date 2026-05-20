const { body, param } = require("express-validator");

const adsValidators = {
    purchase: [
        body("slotId")
            .isInt({ min: 1, max: 6 })
            .withMessage("Invalid slot ID."),
        body("durationDays").isIn([14, 30]).withMessage("Invalid duration."),
        body("imageUrl").isURL().withMessage("Invalid image URL."),
        body("targetUrl").isURL().withMessage("Invalid target URL."),
    ],
    click: [
        param("id")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("Ad id is required."),
    ],
};

module.exports = { adsValidators };
