import { defineConfig } from "orval";

const backendPort = process.env.BACKEND_PORT || 3001;

const HTTP_METHODS = ["get", "post", "put", "patch", "delete", "head"];

function normalizeSpecForZod(spec: any) {
    if (!spec?.paths || typeof spec.paths !== "object") {
        return spec;
    }

    for (const pathItem of Object.values<any>(spec.paths)) {
        if (!pathItem || typeof pathItem !== "object") {
            continue;
        }

        for (const method of HTTP_METHODS) {
            const operation = pathItem?.[method];
            if (!operation || typeof operation !== "object") {
                continue;
            }

            if (
                !operation.responses ||
                typeof operation.responses !== "object"
            ) {
                operation.responses = { 200: { description: "OK" } };
                continue;
            }

            if (!operation.responses["200"]) {
                if (operation.responses["201"]) {
                    operation.responses["200"] = operation.responses["201"];
                } else {
                    const firstStatus = Object.keys(operation.responses)[0];
                    operation.responses["200"] = firstStatus
                        ? operation.responses[firstStatus]
                        : { description: "OK" };
                }
            }
        }
    }

    return spec;
}

export default defineConfig({
    app: {
        output: {
            client: "react-query",
            target: "./src/service/api/index.ts",
            mode: "single",
            clean: false,
            prettier: true,
            headers: false,
            override: {
                mutator: {
                    path: "./src/service/http.ts",
                    name: "orvalFetcher",
                },
            },
        },
        input: {
            target: `http://127.0.0.1:${backendPort}/docs.json`,
            validation: false,
        },
    },
    appZod: {
        output: {
            client: "zod",
            target: "./src/service/api/zod/index.ts",
            mode: "single",
            clean: false,
            prettier: true,
            headers: false,
            override: {
                zod: {
                    generate: {
                        body: true,
                        param: false,
                        query: false,
                        header: false,
                        response: false,
                    },
                },
            },
        },
        input: {
            target: `http://127.0.0.1:${backendPort}/docs.json`,
            validation: false,
            override: {
                transformer: normalizeSpecForZod,
            },
        },
    },
});
