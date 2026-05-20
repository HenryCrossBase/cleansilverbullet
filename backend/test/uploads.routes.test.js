const assert = require("node:assert/strict");
const { beforeEach, test } = require("node:test");

const { createTestContext, request } = require("./helpers/app");

let app;

beforeEach(() => {
    ({ app } = createTestContext());
});

test("uploads route blocks non-public file extensions", async () => {
    const response = await request(app, "GET", "/uploads/archive.espk");

    assert.equal(response.status, 403);
    assert.equal(response.body.error, "Forbidden file type.");
});
