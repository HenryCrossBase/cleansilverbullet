const { successResponse } = require("./common.response");

const disputeResponse = {
    opened: () => successResponse("Escrow Locked & Chat Thread Initiated."),
    detail: (dispute) => ({ success: true, dispute }),
    replied: () => successResponse("Message dispatched."),
    resolved: (action) =>
        successResponse(
            action === "APPROVE"
                ? "Refund triggered and ticket closed."
                : "Refund rejected and ticket closed.",
        ),
};

module.exports = { disputeResponse };
