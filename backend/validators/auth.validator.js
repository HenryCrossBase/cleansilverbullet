const { body } = require("express-validator");

const authValidators = {
    adminUploadConfig: [
        body("title")
            .trim()
            .isLength({ min: 1, max: 120 })
            .withMessage("Title is required and must be under 120 characters."),
        body("description")
            .trim()
            .isLength({ min: 1, max: 4000 })
            .withMessage(
                "Description is required and must be under 4000 characters.",
            ),
    ],
    register: [
        body("encryptedUsername")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("Username is required."),
        body("encryptedEmail")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("Email is required."),
        body("encryptedPassword")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("Password is required."),
        body("hCaptchaToken")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("Captcha token is required."),
    ],
    login: [
        body("encryptedEmail")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("Email is required."),
        body("encryptedPassword")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("Password is required."),
        body("hCaptchaToken")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("Captcha token is required."),
    ],
    recovery: [
        body("encryptedEmail")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("Email is required."),
        body("hCaptchaToken")
            .isString()
            .trim()
            .notEmpty()
            .withMessage("Captcha token is required."),
    ],
    contact: [
        body("email")
            .isEmail()
            .withMessage("Invalid email address.")
            .normalizeEmail(),
        body("subject")
            .isString()
            .trim()
            .isLength({ min: 1, max: 200 })
            .withMessage(
                "Subject is required and must be under 200 characters.",
            ),
        body("message")
            .isString()
            .trim()
            .isLength({ min: 1, max: 5000 })
            .withMessage(
                "Message is required and must be under 5000 characters.",
            ),
    ],
};

module.exports = { authValidators };
