const assert = require("node:assert/strict");
const { beforeEach, test } = require("node:test");

const {
    assertRequiresAuth,
    createTestContext,
    mockAuthenticatedUser,
    request,
    signUser,
} = require("./helpers/app");

let app;
let prisma;

beforeEach(() => {
    ({ app, prisma } = createTestContext());
});

test("crypto invoice endpoint requires a bearer token", async () => {
    await assertRequiresAuth(app, "POST", "/api/crypto/invoice", {
        amountUsd: 10,
    });
});

test("crypto invoice endpoint creates a pending deposit for authenticated users", async () => {
    const user = mockAuthenticatedUser(prisma);
    const token = signUser(user);

    prisma.cryptoDeposit.create.mockImplementation(async (query) => {
        assert.equal(query.data.userId, user.id);
        assert.equal(query.data.amountUsd, 12.75);
        assert.equal(query.data.bulletsReceived, 12);
        assert.equal(query.data.status, "PENDING");
        assert.equal(query.data.purchaseType, "BULLETS");
        assert.match(query.data.payLink, /^https:\/\/oxapay\.com\/checkout\?/);
        assert.deepEqual(Object.keys(query.select).sort(), [
            "amountUsd",
            "bulletsReceived",
            "createdAt",
            "id",
            "payLink",
            "status",
            "trackId",
        ]);

        return {
            id: "deposit-1",
            amountUsd: 12.75,
            bulletsReceived: 12,
            trackId: query.data.trackId,
            payLink: query.data.payLink,
            status: "PENDING",
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
        };
    });

    const response = await request(app, "POST", "/api/crypto/invoice", {
        token,
        body: { amountUsd: 12.75 },
    });

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.id, "deposit-1");
    assert.equal(response.body.bulletsReceived, 12);
});
