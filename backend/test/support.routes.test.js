const { beforeEach, test } = require("node:test");

const { assertRequiresAuth, createTestContext } = require("./helpers/app");

let app;

beforeEach(() => {
    ({ app } = createTestContext());
});

test("support ticket endpoint requires a bearer token", async () => {
    await assertRequiresAuth(app, "POST", "/api/support/ticket", {
        subject: "Need help",
        message: "Please assist.",
    });
});
