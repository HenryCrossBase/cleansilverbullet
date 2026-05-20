import { FetchError, FetchOptions, $fetch as ofetch } from "ofetch";

function getAuthToken(): string {
    if (typeof document === "undefined") return "";
    const tokenCookie = document.cookie
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith("sb_token="));
    if (!tokenCookie) return "";
    return decodeURIComponent(tokenCookie.slice("sb_token=".length));
}

// Base API URL — proxied through Next.js rewrites to the backend
const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

export const $fetch = ofetch.create({
    baseURL: BASE_URL,
    onRequest({ options }) {
        const token = getAuthToken();
        if (token) {
            options.headers.set("Authorization", `Bearer ${token}`);
        }
    },
});

export const fetcher = <T>(
    url: string,
    ops: FetchOptions<"json"> = {},
): Promise<T> => {
    return $fetch<T>(url, ops).catch((e: FetchError) => {
        if (e.status === 401) {
            if (typeof window !== "undefined") {
                window.location.href = "/auth/login";
            }
        }
        throw e;
    });
};

export const fetch = fetcher;

export type ErrorType<Error> = FetchError<{ detail: Error }>;
export type BodyType<BodyData> = BodyData;

type OrvalFetcherParams = FetchOptions<"json"> & {
    url: string;
    method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
    params?: Record<string, unknown>;
    data?: FetchOptions<"json">["body"];
};

export const orvalFetcher = async <T>({
    url,
    method,
    params,
    data: body,
}: OrvalFetcherParams): Promise<T> => {
    return fetcher<T>(url, {
        method,
        params,
        body,
    });
};

export default orvalFetcher;
