const assert = require("node:assert/strict");
const { beforeEach, test } = require("node:test");

const { createTestContext, request } = require("./helpers/app");

let app;
let prisma;

beforeEach(() => {
    ({ app, prisma } = createTestContext());
});

test("register endpoint returns validator errors before business logic", async () => {
    const response = await request(app, "POST", "/api/auth/register", {
        body: { encryptedUsername: "" },
    });

    assert.equal(response.status, 400);
    assert.equal(response.body.error, "Username is required.");
    assert.equal(prisma.user.findFirst.calls.length, 0);
});

test("public stats endpoint returns aggregate market counters", async () => {
    prisma.user.count.mockResolvedValue(12);
    prisma.adminConfig.count.mockResolvedValue(3);
    prisma.shop.count.mockResolvedValue(2);
    prisma.product.count.mockResolvedValue(7);
    prisma.user.findFirst.mockResolvedValue({ username: "newbie" });
    prisma.user.findMany.mockResolvedValue([
        {
            username: "Silverbullet Core",
            nameColor: "#ffffff",
            nameEffect: "none",
        },
    ]);

    const response = await request(app, "GET", "/api/public/stats");

    assert.equal(response.status, 200);
    assert.equal(response.body.success, true);
    assert.equal(response.body.totalMembers, 12);
    assert.equal(response.body.totalThreads, 3);
    assert.equal(response.body.newestMember, "newbie");
    assert.equal(response.body.marketThreads, 2);
    assert.equal(response.body.marketPosts, 7);
    assert.equal(response.body.adminsOnline.length, 1);
});
