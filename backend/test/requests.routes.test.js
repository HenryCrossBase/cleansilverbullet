const assert = require("node:assert/strict");
const { beforeEach, test } = require("node:test");

const { createTestContext, request } = require("./helpers/app");

let app;
let prisma;

beforeEach(() => {
    ({ app, prisma } = createTestContext());
});

test("requests endpoint returns approved requests with masked usernames", async () => {
    prisma.customRequest.findMany.mockImplementation(async (query) => {
        assert.deepEqual(query.where, { status: "APPROVED" });
        assert.deepEqual(query.include, {
            user: { select: { username: true } },
        });

        return [
            {
                id: "request-1",
                title: "Custom Tool",
                description: "Need a custom workflow.",
                createdAt: new Date("2026-01-01T00:00:00.000Z"),
                user: { username: "alice" },
            },
        ];
    });

    const response = await request(app, "GET", "/api/requests");

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.requests[0].requestor, "al*ce");
});
