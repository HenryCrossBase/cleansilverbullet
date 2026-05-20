const { successResponse } = require("./common.response");

const configsResponse = {
    configs: (configs) => ({ configs }),
    thread: (threadData, replies) => ({ threadData, replies }),
    rated: () => successResponse("Rating injected."),
    liked: () => successResponse("Like injected."),
    status: (payload) => payload,
};

module.exports = { configsResponse };
