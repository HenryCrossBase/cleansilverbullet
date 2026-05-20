const { successResponse } = require("./common.response");

const marketResponse = {
    purchased: (message, extra = {}) => successResponse(message, extra),
    shops: (shops) => ({ shops }),
    accounts: (accounts) => ({ accounts }),
    shop: (shop) => ({ shop }),
    ticketCreated: () =>
        successResponse("Blind ticket securely dispatched to vendor."),
    reviewCreated: () =>
        successResponse("Verified buyer review explicitly authored."),
};

module.exports = { marketResponse };
