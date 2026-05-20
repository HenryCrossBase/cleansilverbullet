const { successResponse } = require("./common.response");

const adsResponse = {
    slots: (ads) => ({ success: true, ads }),
    purchased: (slotId, durationDays) =>
        successResponse(
            `Successfully purchased Slot #${slotId} for ${durationDays} Days.`,
        ),
    tracked: () => ({ success: true }),
};

module.exports = { adsResponse };
