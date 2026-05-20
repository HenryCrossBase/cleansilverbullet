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

test("marketplace buy endpoint requires a bearer token", async () => {
    await assertRequiresAuth(app, "POST", "/api/marketplace/buy", {
        productId: "p1",
    });
});

test("market accounts endpoint applies public filters and pagination", async () => {
    prisma.product.findMany.mockImplementation(async (query) => {
        assert.equal(query.where.category, "ACCOUNT");
        assert.equal(query.where.productName.contains, "netflix");
        assert.equal(query.where.country, "US");
        assert.deepEqual(query.orderBy, { sales: "desc" });
        assert.equal(query.skip, 24);
        assert.equal(query.take, 24);

        return [
            {
                id: "product-1",
                productName: "Netflix Account",
                description: "Streaming login",
                price: 10,
                stock: 3,
                category: "ACCOUNT",
                country: "US",
                sales: 9,
                createdAt: new Date("2026-01-01T00:00:00.000Z"),
                shopId: "shop-1",
                shop: {
                    shopName: "Media Shop",
                    storeColor: "#ffffff",
                    storeEffect: "none",
                    isTrusted: true,
                },
            },
        ];
    });

    const response = await request(
        app,
        "GET",
        "/api/market/accounts?search=netflix&country=US&sort=most_sold&page=1&limit=24",
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.accounts.length, 1);
    assert.equal(response.body.accounts[0].id, "product-1");
});
