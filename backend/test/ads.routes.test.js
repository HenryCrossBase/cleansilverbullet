const assert = require("node:assert/strict");
const { beforeEach, test } = require("node:test");

const {
    assertRequiresAuth,
    createTestContext,
    request,
} = require("./helpers/app");

let app;
let prisma;

beforeEach(() => {
    ({ app, prisma } = createTestContext());
});

test("ad purchase requires a bearer token", async () => {
    await assertRequiresAuth(app, "POST", "/api/ads/purchase", {
        slotId: 1,
        durationDays: 14,
        imageUrl: "https://example.com/ad.png",
        targetUrl: "https://example.com",
    });
});

test("ad slots endpoint lists active slots", async () => {
    prisma.advertisement.findMany.mockImplementation(async (query) => {
        assert.equal(query.where.status, "ACTIVE");
        assert.ok(query.where.expiresAt.gt instanceof Date);
        return [
            {
                id: "ad-1",
                slotId: 1,
                imageUrl: "https://example.com/ad.png",
            },
        ];
    });

    const response = await request(app, "GET", "/api/ads/slots");

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.ads[0].id, "ad-1");
});

test("ad click endpoint increments click count", async () => {
    prisma.advertisement.update.mockImplementation(async (query) => {
        assert.deepEqual(query.where, { id: "ad-1" });
        assert.deepEqual(query.data, { clicks: { increment: 1 } });
        return { id: "ad-1", clicks: 1 };
    });

    const response = await request(app, "POST", "/api/ads/ad-1/click");

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
});
