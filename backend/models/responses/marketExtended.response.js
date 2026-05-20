const { successResponse } = require("./common.response");

const marketExtendedResponse = {
    product: (product) => ({ success: true, product }),
    purchase: (log) => ({ success: true, log }),
    disputeOpened: (message) => successResponse(message),
    replacementQueued: () =>
        successResponse(
            "Log replacement attached. Awaiting Admin verification.",
        ),
};

module.exports = { marketExtendedResponse };
