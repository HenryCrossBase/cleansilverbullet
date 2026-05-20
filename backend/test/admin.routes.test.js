const { beforeEach, test } = require("node:test");

const { assertRequiresAuth, createTestContext } = require("./helpers/app");

let app;

beforeEach(() => {
    ({ app } = createTestContext());
});

test("admin telemetry requires a bearer token", async () => {
    await assertRequiresAuth(app, "GET", "/api/admin/telemetry");
});
