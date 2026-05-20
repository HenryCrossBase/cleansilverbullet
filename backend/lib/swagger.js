const path = require("path");
const swaggerUi = require("swagger-ui-express");
const swaggerJsdoc = require("swagger-jsdoc");
const listEndpoints = require("express-list-endpoints");
const { APP_BASE_URL, DOCS } = require("../env");
const { attachResponseModels } = require("./swaggerResponseSchemas");

const DOCS_PATH = "/docs";
const DOCS_JSON_PATH = "/docs.json";

function getServerUrl(req) {
    if (!req) return APP_BASE_URL;
    const proto = req.headers["x-forwarded-proto"] || req.protocol || "http";
    const host = req.get("host");
    if (!host) return APP_BASE_URL;
    return `${proto}://${host}`;
}

function deriveTag(routePath) {
    // /api/<segment>/... -> segment name, e.g. "auth", "market", "billing"
    const match = routePath.match(/^\/api\/([^/]+)/);
    if (match) return match[1];
    return "general";
}

function buildOperation(method, endpoint) {
    const middlewareNames = (endpoint.middlewares || [])
        .map((name) => String(name).toLowerCase())
        .filter(Boolean);

    const tag = deriveTag(endpoint.path);

    const operation = {
        tags: [tag],
        summary: `${method.toUpperCase()} ${endpoint.path}`,
        responses: {
            200: { description: "Request completed successfully." },
            400: { description: "Bad request." },
            401: { description: "Unauthorized." },
            500: { description: "Internal server error." },
        },
    };

    if (middlewareNames.includes("authenticatetoken")) {
        operation.security = [{ bearerAuth: [] }];
    }

    return operation;
}

function buildAutoSpec(app) {
    const endpoints = listEndpoints(app).filter(
        (endpoint) =>
            endpoint.path !== DOCS_PATH && endpoint.path !== DOCS_JSON_PATH,
    );

    const paths = {};
    for (const endpoint of endpoints) {
        if (!paths[endpoint.path]) {
            paths[endpoint.path] = {};
        }

        for (const method of endpoint.methods || []) {
            const normalizedMethod = String(method).toLowerCase();
            paths[endpoint.path][normalizedMethod] = buildOperation(
                normalizedMethod,
                endpoint,
            );
        }
    }

    return paths;
}

const BACKEND_ROOT = path.resolve(__dirname, "..");

const jsdocOptions = {
    definition: {
        openapi: "3.0.3",
        info: {
            title: "Silverbullet Backend API",
            version: "1.0.0",
            description:
                "Comprehensive API reference for the Silverbullet backend, generated from JSDoc @swagger annotations and Express route introspection.",
        },
        tags: [
            {
                name: "auth",
                description:
                    "Authentication, registration, public key, captcha-protected endpoints.",
            },
            {
                name: "user",
                description:
                    "Authenticated end-user operations: profile, notifications, cosmetics, purchases.",
            },
            {
                name: "support",
                description: "Support ticketing system.",
            },
            {
                name: "billing",
                description:
                    "Crypto invoices, platform upgrades and cosmetics purchases.",
            },
            {
                name: "configs",
                description:
                    "Admin-published configs (free tools), rating and liking.",
            },
            {
                name: "market",
                description:
                    "Marketplace: shops, products, purchases, reviews and disputes.",
            },
            {
                name: "enterprise",
                description:
                    "Vendor / enterprise storefront management, bids, withdrawals.",
            },
            {
                name: "ads",
                description:
                    "Advertisement slots, purchases and click tracking.",
            },
            {
                name: "requests",
                description:
                    "Custom tool requests and public contact transmissions.",
            },
            {
                name: "dispute",
                description: "Order dispute lifecycle (open, reply, resolve).",
            },
            {
                name: "admin",
                description:
                    "Administration panel endpoints (require admin permissions).",
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
            schemas: {},
        },
    },
    apis: [
        path.join(BACKEND_ROOT, "routes/*.js"),
        path.join(BACKEND_ROOT, "admin.routes.js"),
    ],
};

let cachedJsdocSpec = null;
function getJsdocSpec() {
    if (!cachedJsdocSpec) {
        cachedJsdocSpec = swaggerJsdoc(jsdocOptions);
    }
    return cachedJsdocSpec;
}

function buildSpec(app, req) {
    const autoPaths = buildAutoSpec(app);
    const jsdocSpec = getJsdocSpec();
    const jsdocPaths = (jsdocSpec && jsdocSpec.paths) || {};

    // Merge: start with auto-generated fallback, overlay JSDoc-documented operations.
    const merged = {};
    for (const p of Object.keys(autoPaths)) {
        merged[p] = { ...autoPaths[p] };
    }
    for (const p of Object.keys(jsdocPaths)) {
        merged[p] = { ...(merged[p] || {}), ...jsdocPaths[p] };
    }

    const spec = {
        ...jsdocSpec,
        servers: [{ url: getServerUrl(req) }],
        paths: merged,
    };

    return attachResponseModels(spec);
}

function setupSwagger(app) {
    if (!DOCS) {
        return;
    }

    app.get(DOCS_JSON_PATH, (req, res) => {
        res.json(buildSpec(app, req));
    });

    app.use(
        DOCS_PATH,
        swaggerUi.serve,
        swaggerUi.setup(null, {
            customSiteTitle: "Silverbullet API Docs",
            swaggerOptions: {
                url: DOCS_JSON_PATH,
                docExpansion: "none",
                displayRequestDuration: true,
            },
        }),
    );
}

module.exports = {
    setupSwagger,
};
