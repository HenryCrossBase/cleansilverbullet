const { successResponse } = require("./common.response");

const supportResponse = {
    ticketSubmitted: () =>
        successResponse("Support ticket submitted securely."),
    tickets: (tickets) => ({ success: true, tickets }),
    ticket: (ticket) => ({ success: true, ticket }),
};

module.exports = { supportResponse };
