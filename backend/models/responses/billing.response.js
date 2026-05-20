const { successResponse } = require("./common.response");

const billingResponse = {
    cryptoInvoice: (deposit) => ({ success: true, ...deposit }),
    upgradePurchased: () =>
        successResponse("Purchase completed successfully. Enjoy your upgrade!"),
};

module.exports = { billingResponse };
