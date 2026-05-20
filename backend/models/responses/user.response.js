const { successResponse } = require("./common.response");

const userResponse = {
    profile: (user, stats) => ({ user, stats }),
    me: (user) => ({ user }),
    notifications: (notifications) => ({ success: true, notifications }),
    actionSuccess: (message, extra = {}) => successResponse(message, extra),
    likeStatus: (totalLikes, hasLiked) => ({
        success: true,
        totalLikes,
        hasLiked,
    }),
    deposits: (deposits) => ({ deposits }),
    purchases: (purchases) => ({ purchases }),
};

module.exports = { userResponse };
