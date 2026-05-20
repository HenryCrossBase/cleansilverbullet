const { body, param, query } = require("express-validator");

const USERNAME_RULE = /^[A-Za-z0-9_]{3,24}$/;

const userValidators = {
    notificationIdParam: [
        param("id")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("Notification id is required."),
    ],
    usernameParam: [
        param("username")
            .matches(USERNAME_RULE)
            .withMessage("Invalid username format."),
    ],
    changeUsername: [
        body("newUsername")
            .matches(USERNAME_RULE)
            .withMessage(
                "Username must be 3-24 characters and only include letters, numbers, or underscores.",
            ),
    ],
    changePassword: [
        body("oldPassword")
            .isString()
            .isLength({ min: 1, max: 128 })
            .withMessage("Current password is required."),
        body("newPassword")
            .isString()
            .isLength({ min: 6, max: 128 })
            .withMessage("New password must be between 6 and 128 characters."),
    ],
    avatarUrl: [
        body("avatarUrl")
            .optional({ nullable: true })
            .isString()
            .withMessage("Avatar URL must be a string."),
    ],
    depositsQuery: [
        query("page")
            .optional()
            .isInt({ min: 0 })
            .withMessage("Page must be a non-negative integer."),
        query("limit")
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage("Limit must be an integer between 1 and 100."),
    ],
    likeBody: [
        body("targetUsername")
            .matches(USERNAME_RULE)
            .withMessage("Invalid target username format."),
    ],
    bio: [
        body("bio")
            .isString()
            .isLength({ max: 120 })
            .withMessage("Bio must be a string with at most 120 characters."),
    ],
    buyCosmetic: [
        body("type")
            .isIn(["badge", "color_pass"])
            .withMessage("Invalid cosmetic type."),
        body("hexColor")
            .optional()
            .matches(/^#[0-9A-Fa-f]{6}$/)
            .withMessage("Invalid Hex Code."),
        body("effect")
            .optional()
            .isString()
            .isLength({ max: 64 })
            .withMessage("Effect must be a valid string."),
    ],
};

module.exports = { userValidators };
