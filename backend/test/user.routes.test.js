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

test("me endpoint requires a bearer token", async () => {
    await assertRequiresAuth(app, "GET", "/api/user/me");
});

test("me endpoint authenticates and strips password hashes", async () => {
    const user = mockAuthenticatedUser(prisma);
    const token = signUser(user);

    const response = await request(app, "GET", "/api/user/me", { token });

    assert.equal(response.status, 200);
    assert.equal(response.body.user.id, user.id);
    assert.equal(response.body.user.username, "alice");
    assert.equal(response.body.user.passwordHash, undefined);
    assert.equal(prisma.user.update.calls.length, 1);
});
