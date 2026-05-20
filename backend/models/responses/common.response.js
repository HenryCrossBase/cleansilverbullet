function errorResponse(error) {
    return { error };
}

function successResponse(message, extra = {}) {
    if (message === undefined) {
        return { success: true, ...extra };
    }
    return { success: true, message, ...extra };
}

module.exports = {
    errorResponse,
    successResponse,
};
