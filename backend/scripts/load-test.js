require("dotenv").config();
const autocannon = require("autocannon");
const { getLogger } = require("../lib/logger");
const prisma = require("../lib/prisma");
const { signAuthToken } = require("../lib/auth");

const logger = getLogger("load_test", { msgPrefix: "[load-test] " });

const BASE_URL =
    process.env.LOAD_TEST_BASE_URL ||
    `http://127.0.0.1:${process.env.PORT || 3001}`;
const DURATION = Number(process.env.LOAD_TEST_DURATION || 8);
const CONNECTIONS = Number(process.env.LOAD_TEST_CONNECTIONS || 20);
const PIPELINING = Number(process.env.LOAD_TEST_PIPELINING || 1);

const PUBLIC_ENDPOINTS = [
    { name: "public-stats", path: "/api/public/stats" },
    { name: "configs", path: "/api/configs" },
    { name: "market-accounts", path: "/api/market/accounts" },
];

const ADMIN_ENDPOINTS = [
    { name: "admin-telemetry", path: "/api/admin/telemetry", auth: true },
];

function runBench({ path, headers = {} }) {
    return new Promise((resolve, reject) => {
        const instance = autocannon(
            {
                url: `${BASE_URL}${path}`,
                connections: CONNECTIONS,
                pipelining: PIPELINING,
                duration: DURATION,
                headers,
            },
            (err, result) => {
                if (err) return reject(err);
                resolve(result);
            },
        );

        autocannon.track(instance, { renderProgressBar: false });
    });
}

function summarize(result) {
    const throughputAverage =
        result.throughput && typeof result.throughput.average === "number"
            ? result.throughput.average
            : 0;
    const latencyP95 =
        typeof result.latency.p95 === "number"
            ? result.latency.p95
            : typeof result.latency.p99 === "number"
              ? result.latency.p99
              : result.latency.average;

    return {
        avgLatencyMs: Number(result.latency.average.toFixed(2)),
        p95LatencyMs: Number(latencyP95.toFixed(2)),
        reqPerSec: Number(result.requests.average.toFixed(2)),
        throughputMBps: Number((throughputAverage / (1024 * 1024)).toFixed(2)),
        non2xx: result.non2xx,
    };
}

async function getAdminAuthHeaders() {
    const adminUser = await prisma.user.findFirst({
        where: { rank: "ADMIN" },
        select: { id: true, username: true, rank: true, adminRoles: true },
    });

    if (!adminUser) return null;
    const token = signAuthToken(adminUser);
    return { Authorization: `Bearer ${token}` };
}

async function benchmarkPhase(label, endpoints, authHeaders = {}) {
    const results = {};
    for (const endpoint of endpoints) {
        const result = await runBench({
            path: endpoint.path,
            headers: endpoint.auth ? authHeaders : {},
        });
        results[endpoint.name] = summarize(result);
    }
    return { label, results };
}

async function main() {
    const adminHeaders = await getAdminAuthHeaders();
    const hasAdmin = Boolean(adminHeaders);

    logger.info(
        `target=${BASE_URL} duration=${DURATION}s connections=${CONNECTIONS}`,
    );
    if (!hasAdmin) {
        logger.info("no admin account found; admin telemetry will be skipped");
    }

    const publicBefore = await benchmarkPhase("before", PUBLIC_ENDPOINTS);
    const publicAfter = await benchmarkPhase("after", PUBLIC_ENDPOINTS);

    let adminBefore = null;
    let adminAfter = null;
    if (hasAdmin) {
        adminBefore = await benchmarkPhase(
            "before",
            ADMIN_ENDPOINTS,
            adminHeaders,
        );
        adminAfter = await benchmarkPhase(
            "after",
            ADMIN_ENDPOINTS,
            adminHeaders,
        );
    }

    logger.info("Load Test Summary");
    logger.info(
        { publicBefore, publicAfter, adminBefore, adminAfter },
        "load-test-results",
    );

    await prisma.$disconnect().catch(() => {});
}

main().catch(async (err) => {
    logger.error({ err }, "failed");
    await prisma.$disconnect().catch(() => {});
    process.exit(1);
});
