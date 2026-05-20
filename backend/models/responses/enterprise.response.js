const { successResponse } = require("./common.response");

const enterpriseResponse = {
    bidPlaced: (amount) =>
        successResponse(
            `Successfully boosted Store Rank with $${amount.toFixed(2)}!`,
        ),
    dashboardSetupNeeded: (globalDisputes) => ({
        success: true,
        needsSetup: true,
        globalDisputes,
    }),
    dashboard: (payload) => ({ success: true, ...payload }),
    tgLinked: () => ({ success: true, linked: true }),
    tgToken: (token) => ({ success: true, linked: false, token }),
    setupDone: (shop) => ({ success: true, shop }),
    bulkPrice: (count) =>
        successResponse(`Successfully re-priced ${count} logs.`, {
            updatedCount: count,
        }),
    productsCreated: (count) =>
        successResponse(`${count} distinct assets injected to active market.`),
    cosmetic: (message) => successResponse(message),
    withdrawCreated: () =>
        successResponse("Funds processed to ESCROW payout target."),
    withdrawals: (withdrawals) => ({ success: true, withdrawals }),
    productDeleted: () =>
        successResponse("Target payload irrevocably destroyed."),
    bulkDeleted: (count, category) =>
        successResponse(
            `Successfully annihilated ${count} payloads in [${category}].`,
        ),
};

module.exports = { enterpriseResponse };
