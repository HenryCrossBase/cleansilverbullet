function stringSchema(example) {
    const schema = { type: "string" };
    if (example !== undefined) {
        schema.example = example;
    }
    return schema;
}

function booleanSchema(example) {
    const schema = { type: "boolean" };
    if (example !== undefined) {
        schema.example = example;
    }
    return schema;
}

function integerSchema(example) {
    const schema = { type: "integer" };
    if (example !== undefined) {
        schema.example = example;
    }
    return schema;
}

function numberSchema(example) {
    const schema = { type: "number" };
    if (example !== undefined) {
        schema.example = example;
    }
    return schema;
}

function unknownObjectSchema() {
    return {
        type: "object",
        additionalProperties: true,
    };
}

function arrayOfUnknownObjectsSchema() {
    return {
        type: "array",
        items: unknownObjectSchema(),
    };
}

function buildResponseSchemas() {
    return {
        Error: {
            type: "object",
            properties: {
                error: stringSchema("Something went wrong."),
            },
            required: ["error"],
            additionalProperties: false,
        },
        SuccessOnly: {
            type: "object",
            properties: {
                success: booleanSchema(true),
            },
            required: ["success"],
            additionalProperties: false,
        },
        SuccessMessage: {
            type: "object",
            properties: {
                success: booleanSchema(true),
                message: stringSchema("Operation completed successfully."),
            },
            required: ["success", "message"],
            additionalProperties: true,
        },
        SuccessData: {
            type: "object",
            properties: {
                success: booleanSchema(true),
                data: unknownObjectSchema(),
            },
            required: ["success"],
            additionalProperties: true,
        },
        PublicKeyResponse: {
            type: "object",
            properties: {
                publicKey: stringSchema("-----BEGIN PUBLIC KEY-----..."),
            },
            required: ["publicKey"],
            additionalProperties: false,
        },
        AuthTokenUserResponse: {
            type: "object",
            properties: {
                success: booleanSchema(true),
                message: stringSchema("Authentication successful."),
                token: stringSchema("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."),
                user: unknownObjectSchema(),
            },
            required: ["success", "message", "token", "user"],
            additionalProperties: true,
        },
        SuccessListResponse: {
            type: "object",
            properties: {
                success: booleanSchema(true),
                items: arrayOfUnknownObjectsSchema(),
            },
            required: ["success"],
            additionalProperties: true,
        },
        ShopsResponse: {
            type: "object",
            properties: {
                shops: arrayOfUnknownObjectsSchema(),
            },
            required: ["shops"],
            additionalProperties: false,
        },
        AccountsResponse: {
            type: "object",
            properties: {
                accounts: arrayOfUnknownObjectsSchema(),
            },
            required: ["accounts"],
            additionalProperties: false,
        },
        ShopResponse: {
            type: "object",
            properties: {
                shop: unknownObjectSchema(),
            },
            required: ["shop"],
            additionalProperties: false,
        },
        UserResponse: {
            type: "object",
            properties: {
                user: unknownObjectSchema(),
            },
            required: ["user"],
            additionalProperties: true,
        },
        UserProfileResponse: {
            type: "object",
            properties: {
                user: unknownObjectSchema(),
                stats: unknownObjectSchema(),
            },
            required: ["user", "stats"],
            additionalProperties: true,
        },
        NotificationsResponse: {
            type: "object",
            properties: {
                success: booleanSchema(true),
                notifications: arrayOfUnknownObjectsSchema(),
            },
            required: ["success", "notifications"],
            additionalProperties: false,
        },
        DepositsResponse: {
            type: "object",
            properties: {
                deposits: arrayOfUnknownObjectsSchema(),
            },
            required: ["deposits"],
            additionalProperties: false,
        },
        PurchasesResponse: {
            type: "object",
            properties: {
                purchases: arrayOfUnknownObjectsSchema(),
            },
            required: ["purchases"],
            additionalProperties: false,
        },
        LikeStatusResponse: {
            type: "object",
            properties: {
                success: booleanSchema(true),
                totalLikes: integerSchema(12),
                hasLiked: booleanSchema(false),
            },
            required: ["success", "totalLikes", "hasLiked"],
            additionalProperties: false,
        },
        ThreadWithRepliesResponse: {
            type: "object",
            properties: {
                threadData: unknownObjectSchema(),
                replies: arrayOfUnknownObjectsSchema(),
            },
            required: ["threadData", "replies"],
            additionalProperties: false,
        },
        ConfigsResponse: {
            type: "object",
            properties: {
                configs: arrayOfUnknownObjectsSchema(),
            },
            required: ["configs"],
            additionalProperties: false,
        },
        TicketResponse: {
            type: "object",
            properties: {
                success: booleanSchema(true),
                ticket: unknownObjectSchema(),
            },
            required: ["success", "ticket"],
            additionalProperties: false,
        },
        TicketsResponse: {
            type: "object",
            properties: {
                success: booleanSchema(true),
                tickets: arrayOfUnknownObjectsSchema(),
            },
            required: ["success", "tickets"],
            additionalProperties: false,
        },
        RequestsResponse: {
            type: "object",
            properties: {
                success: booleanSchema(true),
                requests: arrayOfUnknownObjectsSchema(),
            },
            required: ["success", "requests"],
            additionalProperties: false,
        },
        DisputeResponse: {
            type: "object",
            properties: {
                success: booleanSchema(true),
                dispute: unknownObjectSchema(),
            },
            required: ["success", "dispute"],
            additionalProperties: false,
        },
        DashboardSetupNeededResponse: {
            type: "object",
            properties: {
                success: booleanSchema(true),
                needsSetup: booleanSchema(true),
                globalDisputes: arrayOfUnknownObjectsSchema(),
            },
            required: ["success", "needsSetup", "globalDisputes"],
            additionalProperties: false,
        },
        DashboardResponse: {
            type: "object",
            properties: {
                success: booleanSchema(true),
            },
            required: ["success"],
            additionalProperties: true,
        },
        TelegramLinkStatusResponse: {
            type: "object",
            properties: {
                success: booleanSchema(true),
                linked: booleanSchema(true),
            },
            required: ["success", "linked"],
            additionalProperties: false,
        },
        TelegramTokenResponse: {
            type: "object",
            properties: {
                success: booleanSchema(true),
                linked: booleanSchema(false),
                token: stringSchema("telegram-bot-token"),
            },
            required: ["success", "linked", "token"],
            additionalProperties: false,
        },
        SetupDoneResponse: {
            type: "object",
            properties: {
                success: booleanSchema(true),
                shop: unknownObjectSchema(),
            },
            required: ["success", "shop"],
            additionalProperties: false,
        },
        WithdrawalsResponse: {
            type: "object",
            properties: {
                success: booleanSchema(true),
                withdrawals: arrayOfUnknownObjectsSchema(),
            },
            required: ["success", "withdrawals"],
            additionalProperties: false,
        },
        ProductResponse: {
            type: "object",
            properties: {
                success: booleanSchema(true),
                product: unknownObjectSchema(),
            },
            required: ["success", "product"],
            additionalProperties: false,
        },
        PurchaseLogResponse: {
            type: "object",
            properties: {
                success: booleanSchema(true),
                log: unknownObjectSchema(),
            },
            required: ["success", "log"],
            additionalProperties: false,
        },
        AdsSlotsResponse: {
            type: "object",
            properties: {
                success: booleanSchema(true),
                ads: arrayOfUnknownObjectsSchema(),
            },
            required: ["success", "ads"],
            additionalProperties: false,
        },
        CryptoInvoiceResponse: {
            type: "object",
            properties: {
                success: booleanSchema(true),
            },
            required: ["success"],
            additionalProperties: true,
        },
        PublicStatsResponse: {
            type: "object",
            properties: {
                success: booleanSchema(true),
                totalMembers: integerSchema(200),
                totalThreads: integerSchema(1200),
                newestMember: unknownObjectSchema(),
                freeConfigsThreads: integerSchema(50),
                freeConfigsPosts: integerSchema(300),
                marketThreads: integerSchema(120),
                marketPosts: integerSchema(900),
                adminsOnline: integerSchema(2),
            },
            required: [
                "success",
                "totalMembers",
                "totalThreads",
                "newestMember",
                "freeConfigsThreads",
                "freeConfigsPosts",
                "marketThreads",
                "marketPosts",
                "adminsOnline",
            ],
            additionalProperties: false,
        },
        GenericObjectResponse: unknownObjectSchema(),
    };
}

function schemaRef(name) {
    return { $ref: `#/components/schemas/${name}` };
}

function chooseSuccessSchema(pathKey, methodKey, operation = {}) {
    const summary = String(operation.summary || "").toLowerCase();
    const description = String(operation.description || "").toLowerCase();
    const haystack = `${summary} ${description} ${methodKey.toLowerCase()} ${pathKey.toLowerCase()}`;

    if (haystack.includes("publickey") || haystack.includes("public key")) {
        return schemaRef("PublicKeyResponse");
    }
    if (
        haystack.includes("login") ||
        haystack.includes("register") ||
        haystack.includes("jwt") ||
        haystack.includes("token")
    ) {
        return schemaRef("AuthTokenUserResponse");
    }
    if (haystack.includes("stats")) {
        return schemaRef("PublicStatsResponse");
    }
    if (haystack.includes("shop") && haystack.includes("list")) {
        return schemaRef("ShopsResponse");
    }
    if (haystack.includes("shop") && !haystack.includes("list")) {
        return schemaRef("ShopResponse");
    }
    if (haystack.includes("account")) {
        return schemaRef("AccountsResponse");
    }
    if (haystack.includes("profile")) {
        return schemaRef("UserProfileResponse");
    }
    if (haystack.includes("notifications")) {
        return schemaRef("NotificationsResponse");
    }
    if (haystack.includes("deposit")) {
        return schemaRef("DepositsResponse");
    }
    if (haystack.includes("purchases")) {
        return schemaRef("PurchasesResponse");
    }
    if (haystack.includes("tickets") && haystack.includes("list")) {
        return schemaRef("TicketsResponse");
    }
    if (haystack.includes("ticket")) {
        return schemaRef("TicketResponse");
    }
    if (haystack.includes("requests") && haystack.includes("list")) {
        return schemaRef("RequestsResponse");
    }
    if (haystack.includes("dispute")) {
        return schemaRef("DisputeResponse");
    }
    if (haystack.includes("dashboard") && haystack.includes("setup")) {
        return schemaRef("DashboardSetupNeededResponse");
    }
    if (haystack.includes("dashboard")) {
        return schemaRef("DashboardResponse");
    }
    if (haystack.includes("withdraw")) {
        return schemaRef("WithdrawalsResponse");
    }
    if (haystack.includes("product") && haystack.includes("detail")) {
        return schemaRef("ProductResponse");
    }
    if (haystack.includes("purchase") && haystack.includes("log")) {
        return schemaRef("PurchaseLogResponse");
    }
    if (haystack.includes("ads") || haystack.includes("slots")) {
        return schemaRef("AdsSlotsResponse");
    }
    if (haystack.includes("invoice") || haystack.includes("crypto")) {
        return schemaRef("CryptoInvoiceResponse");
    }

    if (methodKey.toLowerCase() === "get") {
        return schemaRef("GenericObjectResponse");
    }

    return schemaRef("SuccessMessage");
}

function ensureResponseContent(
    pathKey,
    methodKey,
    code,
    responseObj,
    operation,
) {
    const normalizedCode = Number.parseInt(String(code), 10);
    const isErrorCode =
        Number.isFinite(normalizedCode) && normalizedCode >= 400;

    const response = {
        ...responseObj,
    };

    if (!response.description) {
        response.description = isErrorCode
            ? "Request failed."
            : "Request completed successfully.";
    }

    if (response.content && response.content["application/json"]?.schema) {
        return response;
    }

    const schema = isErrorCode
        ? schemaRef("Error")
        : chooseSuccessSchema(pathKey, methodKey, operation);

    response.content = {
        ...(response.content || {}),
        "application/json": {
            ...(response.content?.["application/json"] || {}),
            schema,
        },
    };

    return response;
}

function normalizeResponseObject(code, rawResponse) {
    if (
        rawResponse &&
        typeof rawResponse === "object" &&
        !Array.isArray(rawResponse)
    ) {
        return rawResponse;
    }

    return {
        description:
            typeof rawResponse === "string"
                ? rawResponse
                : Number.parseInt(String(code), 10) >= 400
                  ? "Request failed."
                  : "Request completed successfully.",
    };
}

function attachResponseModels(spec) {
    if (!spec || typeof spec !== "object") {
        return spec;
    }

    const components = spec.components || {};
    spec.components = components;
    components.schemas = {
        ...buildResponseSchemas(),
        ...(components.schemas || {}),
    };

    const paths = spec.paths || {};
    for (const [pathKey, operations] of Object.entries(paths)) {
        if (!operations || typeof operations !== "object") {
            continue;
        }

        for (const [methodKey, operation] of Object.entries(operations)) {
            if (!operation || typeof operation !== "object") {
                continue;
            }

            const responses = operation.responses || {};
            const normalizedResponses = {};

            for (const [code, rawResponse] of Object.entries(responses)) {
                const responseObj = normalizeResponseObject(code, rawResponse);
                normalizedResponses[code] = ensureResponseContent(
                    pathKey,
                    methodKey,
                    code,
                    responseObj,
                    operation,
                );
            }

            if (Object.keys(normalizedResponses).length === 0) {
                normalizedResponses[200] = ensureResponseContent(
                    pathKey,
                    methodKey,
                    200,
                    {
                        description: "Request completed successfully.",
                    },
                    operation,
                );
            }

            operation.responses = normalizedResponses;
        }
    }

    return spec;
}

module.exports = {
    attachResponseModels,
};
