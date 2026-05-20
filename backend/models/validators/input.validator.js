const validator = require("validator");

function isValidEmail(email) {
    return (
        typeof email === "string" &&
        validator.isEmail(email) &&
        email.length <= 254
    );
}

function isValidUsername(username) {
    return (
        typeof username === "string" &&
        validator.matches(username, /^[A-Za-z0-9_]{3,24}$/)
    );
}

function isValidPassword(password) {
    if (typeof password !== "string") return false;
    
    // Strict Policy: 8-64 characters, 1 Uppercase, 1 Number, 1 Special Character
    const strictRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,64}$/;
    
    return validator.matches(password, strictRegex);
}

module.exports = {
    isValidEmail,
    isValidUsername,
    isValidPassword,
};
