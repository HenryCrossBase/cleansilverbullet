import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
    const publicPaths = [
        "/auth/login",
        "/auth/register",
        "/auth/recovery",
        "/privacy",
        "/tos",
        "/why-us",
    ];

    if (
        request.nextUrl.pathname.startsWith("/_next") ||
        request.nextUrl.pathname.startsWith("/api") ||
        request.nextUrl.pathname.match(/\.(png|jpg|jpeg|gif|svg|ico)$/i)
    ) {
        return NextResponse.next();
    }

    if (publicPaths.includes(request.nextUrl.pathname)) {
        return NextResponse.next();
    }

    const token = request.cookies.get("sb_token");

    if (!token) {
        const loginUrl = new URL("/auth/login", request.url);
        return NextResponse.redirect(loginUrl);
    }

    if (request.nextUrl.pathname.startsWith("/admin")) {
        try {
            const parts = token.value.split(".");
            if (parts.length !== 3) throw new Error("Invalid token");
            const base64Url = parts[1];
            const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split("")
                    .map(function (c) {
                        return (
                            "%" +
                            ("00" + c.charCodeAt(0).toString(16)).slice(-2)
                        );
                    })
                    .join(""),
            );

            const payload = JSON.parse(jsonPayload);
            if (payload.rank !== "ADMIN") {
                const vendorUrl = new URL("/vendor/dashboard", request.url);
                return NextResponse.redirect(vendorUrl);
            }
        } catch {
            const loginUrl = new URL("/auth/login", request.url);
            return NextResponse.redirect(loginUrl);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
