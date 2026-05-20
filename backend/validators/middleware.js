const { validationResult } = require("express-validator");

function validate(rules) {
    return [
        ...rules,
        (req, res, next) => {
            const result = validationResult(req);
            if (result.isEmpty()) return next();

            const firstError = result.array({ onlyFirstError: true })[0];
            return res.status(400).json({ error: firstError.msg });
        },
    ];
}

module.exports = { validate };
