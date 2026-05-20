const { successResponse } = require("./common.response");

const requestsResponse = {
    contactSubmitted: () =>
        successResponse("Transmission securely relayed to the administration."),
    requests: (requests) => ({ success: true, requests }),
    submitted: () =>
        successResponse(
            "Custom Request submitted to administration queue securely.",
        ),
    notified: () =>
        successResponse(
            "Buyer has been successfully notified via system protocol.",
        ),
};

module.exports = { requestsResponse };
