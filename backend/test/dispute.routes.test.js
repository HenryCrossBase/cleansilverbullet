const { beforeEach, test } = require("node:test");

const { assertRequiresAuth, createTestContext } = require("./helpers/app");

let app;

beforeEach(() => {
    ({ app } = createTestContext());
});

test("dispute report endpoint requires a bearer token", async () => {
    await assertRequiresAuth(app, "POST", "/api/market/dispute-report", {
        orderId: "order-1",
        initialMessage: "Issue",
    });
});
