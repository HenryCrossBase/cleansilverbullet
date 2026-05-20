const { beforeEach, test } = require("node:test");

const { assertRequiresAuth, createTestContext } = require("./helpers/app");

let app;

beforeEach(() => {
    ({ app } = createTestContext());
});

test("enterprise bid endpoint requires a bearer token", async () => {
    await assertRequiresAuth(app, "POST", "/api/enterprise/bid", {
        amount: 10,
    });
});
