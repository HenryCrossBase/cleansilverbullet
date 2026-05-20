const { createClient } = require("redis");
const { AUTH_CACHE_KEY_PREFIX, REDIS_URL } = require("../env");

let clientPromise = null;
let disabledReason = null;

function getRedisUrl() {
    return REDIS_URL;
}

function isEnabled() {
    return Boolean(getRedisUrl()) && !disabledReason;
}

async function getClient() {
    if (disabledReason) return null;
    const redisUrl = getRedisUrl();
    if (!redisUrl) return null;

    if (!clientPromise) {
        clientPromise = (async () => {
            const client = createClient({ url: redisUrl });
            client.on("error", (err) => {
                disabledReason = err?.message || "Redis client error";
            });
            try {
                await client.connect();
                return client;
            } catch (err) {
                disabledReason = err?.message || "Redis connection failed";
                try {
                    await client.disconnect();
                } catch (_e) {}
                return null;
            }
        })();
    }

    const client = await clientPromise;
    if (!client || disabledReason) return null;
    return client;
}

async function getJson(key) {
    const client = await getClient();
    if (!client) return null;
    try {
        const value = await client.get(key);
        return value ? JSON.parse(value) : null;
    } catch (_err) {
        return null;
    }
}

async function setJson(key, value, ttlSeconds = 60) {
    const client = await getClient();
    if (!client) return false;
    try {
        await client.set(key, JSON.stringify(value), { EX: ttlSeconds });
        return true;
    } catch (_err) {
        return false;
    }
}

async function del(key) {
    const client = await getClient();
    if (!client) return false;
    try {
        await client.del(key);
        return true;
    } catch (_err) {
        return false;
    }
}

async function invalidateUser(userId) {
    if (!userId) return false;
    return del(`${AUTH_CACHE_KEY_PREFIX}${userId}`);
}

function getAuthCacheKey(userId) {
    return `${AUTH_CACHE_KEY_PREFIX}${userId}`;
}

module.exports = {
    del,
    getAuthCacheKey,
    getClient,
    getJson,
    invalidateUser,
    isEnabled,
    setJson,
};
