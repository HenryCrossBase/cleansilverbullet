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

test("configs list endpoint requires a bearer token", async () => {
    await assertRequiresAuth(app, "GET", "/api/configs");
});

test("configs endpoint returns configs ordered by latest activity", async () => {
    const user = mockAuthenticatedUser(prisma);
    const token = signUser(user);

    prisma.adminConfig.findMany.mockResolvedValue([
        {
            id: "config-new",
            title: "New",
            description: "New config",
            fileName: "new.espk",
            fileSize: 64,
            adminName: "Admin",
            createdAt: new Date("2026-01-02T00:00:00.000Z"),
        },
        {
            id: "config-old",
            title: "Old",
            description: "Old config",
            fileName: "old.espk",
            fileSize: 32,
            adminName: "Admin",
            createdAt: new Date("2026-01-01T00:00:00.000Z"),
        },
    ]);
    prisma.configRating.groupBy.mockResolvedValue([
        {
            configId: "config-old",
            _max: { createdAt: new Date("2026-01-03T00:00:00.000Z") },
        },
    ]);

    const response = await request(app, "GET", "/api/configs?limit=5", {
        token,
    });

    assert.equal(response.status, 200);
    assert.deepEqual(
        response.body.configs.map((config) => config.id),
        ["config-old", "config-new"],
    );
    assert.equal(prisma.adminConfig.findMany.calls[0][0].take, 5);
});
