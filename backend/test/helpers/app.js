const assert = require("node:assert/strict");
const http = require("node:http");
const Module = require("node:module");
const path = require("node:path");
const { Readable, Writable } = require("node:stream");

const jwt = require("jsonwebtoken");

const backendRoot = path.resolve(__dirname, "..", "..");
const prismaPath = path.join(backendRoot, "lib", "prisma.js");

function createMockFn(name) {
    const fn = (...args) => {
        fn.calls.push(args);
        if (!fn.impl) {
            return Promise.reject(new Error(`Unexpected prisma.${name} call`));
        }

        try {
            return Promise.resolve(fn.impl(...args));
        } catch (err) {
            return Promise.reject(err);
        }
    };

    fn.calls = [];
    fn.mockImplementation = (impl) => {
        fn.impl = impl;
        return fn;
    };
    fn.mockResolvedValue = (value) => fn.mockImplementation(() => value);
    fn.reset = () => {
        fn.calls = [];
        fn.impl = undefined;
    };

    return fn;
}

function createMockPrisma() {
    const modelMethods = {
        adminConfig: ["count", "create", "findMany", "findUnique"],
        advertisement: [
            "create",
            "deleteMany",
            "findFirst",
            "findMany",
            "update",
        ],
        configRating: [
            "aggregate",
            "count",
            "create",
            "findMany",
            "findUnique",
            "groupBy",
            "update",
        ],
        cryptoDeposit: [
            "aggregate",
            "create",
            "deleteMany",
            "findMany",
        ],
        customRequest: [
            "count",
            "create",
            "findMany",
            "findUnique",
            "update",
        ],
        dispute: [
            "count",
            "create",
            "findMany",
            "findUnique",
            "update",
            "updateMany",
        ],
        disputeMessage: ["count", "create", "findMany"],
        notification: [
            "create",
            "createMany",
            "delete",
            "findMany",
            "findUnique",
            "update",
            "updateMany",
        ],
        order: ["count", "create", "findFirst", "findMany", "findUnique"],
        product: [
            "count",
            "createMany",
            "delete",
            "deleteMany",
            "findMany",
            "findUnique",
            "update",
            "updateMany",
        ],
        productReview: [
            "aggregate",
            "count",
            "create",
            "findFirst",
            "findMany",
            "findUnique",
        ],
        profileLike: ["count", "create", "delete", "findUnique"],
        shop: [
            "count",
            "create",
            "findFirst",
            "findMany",
            "findUnique",
            "update",
            "updateMany",
        ],
        supportTicket: ["count", "create", "findMany", "findUnique"],
        threadLike: ["count", "create", "findMany", "findUnique"],
        ticket: ["create"],
        user: [
            "count",
            "create",
            "findFirst",
            "findMany",
            "findUnique",
            "update",
            "updateMany",
        ],
        withdrawal: ["count", "create", "findMany", "update"],
    };

    const prisma = {
        $transaction: createMockFn("$transaction"),
    };

    for (const [model, methods] of Object.entries(modelMethods)) {
        prisma[model] = {};
        for (const method of methods) {
            prisma[model][method] = createMockFn(`${model}.${method}`);
        }
    }

    prisma.$transaction.mockImplementation(async (operation) => {
        if (typeof operation === "function") return operation(prisma);
        if (Array.isArray(operation)) return Promise.all(operation);
        throw new Error("Unsupported transaction operation");
    });

    return prisma;
}

function purgeBackendModules() {
    for (const key of Object.keys(require.cache)) {
        if (
            key.startsWith(backendRoot) &&
            !key.includes(`${path.sep}node_modules${path.sep}`) &&
            !key.includes(`${path.sep}test${path.sep}`)
        ) {
            delete require.cache[key];
        }
    }
}

function installPrismaMock(prisma) {
    const moduleStub = new Module(prismaPath);
    moduleStub.filename = prismaPath;
    moduleStub.paths = Module._nodeModulePaths(path.dirname(prismaPath));
    moduleStub.loaded = true;
    moduleStub.exports = prisma;
    require.cache[prismaPath] = moduleStub;
}

function loadApp(prisma) {
    process.env.NODE_ENV = "test";
    process.env.DOCS = "false";
    process.env.JWT_SECRET = "route-test-secret";
    process.env.REDIS_URL = "";

    purgeBackendModules();
    installPrismaMock(prisma);

    return require("../../server").createApp();
}

function createTestContext() {
    const prisma = createMockPrisma();
    const app = loadApp(prisma);
    return { app, prisma };
}

function signUser(user) {
    return jwt.sign(
        {
            id: user.id,
            username: user.username,
            rank: user.rank,
            adminRoles: user.adminRoles || null,
        },
        process.env.JWT_SECRET,
        { algorithm: "HS256", expiresIn: "1h" },
    );
}

function mockAuthenticatedUser(prisma, overrides = {}) {
    const user = {
        id: "user-1",
        username: "alice",
        rank: "USER",
        adminRoles: null,
        bannedUntil: null,
        banReason: null,
        email: "alice@example.com",
        credits: 50,
        avatarUrl: "/default-avatar.png",
        bio: "No biography provided.",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        lastOnline: new Date("2026-01-02T00:00:00.000Z"),
        hasBlueBadge: false,
        nameColor: "#ffffff",
        nameEffect: "none",
        passwordHash: "hashed-password",
        ...overrides,
    };

    prisma.user.findUnique.mockImplementation(async ({ where, select }) => {
        if (where?.id !== user.id) return null;

        if (select?.bannedUntil !== undefined) {
            return {
                id: user.id,
                username: user.username,
                rank: user.rank,
                adminRoles: user.adminRoles,
                bannedUntil: user.bannedUntil,
                banReason: user.banReason,
            };
        }

        return { ...user };
    });
    prisma.user.update.mockResolvedValue({ ...user });

    return user;
}

async function request(app, method, requestPath, options = {}) {
    const headers = { host: "127.0.0.1", ...(options.headers || {}) };
    let bodyText = "";

    if (options.token) {
        headers.authorization = `Bearer ${options.token}`;
    }

    if (options.body !== undefined) {
        bodyText = JSON.stringify(options.body);
        headers["content-type"] = "application/json";
        headers["content-length"] = Buffer.byteLength(bodyText);
    }

    const req = new Readable({ read() {} });
    req.method = method;
    req.url = requestPath;
    req.originalUrl = requestPath;
    req.headers = headers;
    req.httpVersion = "1.1";
    req.httpVersionMajor = 1;
    req.httpVersionMinor = 1;
    req.socket = new Writable({
        write(_chunk, _encoding, callback) {
            callback();
        },
    });
    req.socket.encrypted = false;
    req.socket.remoteAddress = "127.0.0.1";
    req.connection = req.socket;

    const chunks = [];
    const res = new http.ServerResponse(req);
    const socket = new Writable({
        write(chunk, _encoding, callback) {
            chunks.push(Buffer.from(chunk));
            callback();
        },
    });
    socket.writable = true;
    res.assignSocket(socket);

    return new Promise((resolve, reject) => {
        res.once("finish", () => {
            const raw = Buffer.concat(chunks).toString("utf8");
            const headerEnd = raw.indexOf("\r\n\r\n");
            const responseBody =
                headerEnd === -1 ? raw : raw.slice(headerEnd + 4);
            let body = null;

            if (responseBody) {
                try {
                    body = JSON.parse(responseBody);
                } catch (err) {
                    reject(err);
                    return;
                }
            }

            resolve({
                status: res.statusCode,
                headers: res.getHeaders(),
                body,
            });
        });
        res.once("error", reject);

        app.handle(req, res);

        if (bodyText) {
            req.push(bodyText);
        }
        req.push(null);
    });
}

async function assertRequiresAuth(app, method, requestPath, body) {
    const response = await request(app, method, requestPath, { body });

    assert.equal(response.status, 401);
    assert.equal(response.body.error, "Missing bearer token.");
}

module.exports = {
    assertRequiresAuth,
    createTestContext,
    mockAuthenticatedUser,
    request,
    signUser,
};
