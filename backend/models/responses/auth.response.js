const { successResponse } = require("./common.response");

const authResponse = {
    publicKey: (publicKey) => ({ publicKey }),
    adminConfigUploaded: (config) =>
        successResponse(
            "Silverbullet Config successfully compiled and published.",
            { config },
        ),
    registerSuccess: (token, user) =>
        successResponse("Welcome to Silverbullet.", { token, user }),
    loginSuccess: (token, user) =>
        successResponse("Authentication successful.", { token, user }),
    recoveryQueued: () =>
        successResponse(
            "If that email exists, an active recovery link has been pushed.",
        ),
    publicStats: ({
        totalMembers,
        totalThreads,
        newestMember,
        freeConfigsThreads,
        freeConfigsPosts,
        marketThreads,
        marketPosts,
        adminsOnline,
    }) => ({
        success: true,
        totalMembers,
        totalThreads,
        newestMember,
        freeConfigsThreads,
        freeConfigsPosts,
        marketThreads,
        marketPosts,
        adminsOnline,
    }),
    contactSubmitted: () =>
        successResponse(
            "Thank you! Your message has been safely delivered to our team.",
        ),
};

module.exports = { authResponse };
