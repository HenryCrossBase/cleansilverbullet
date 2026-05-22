import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
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
            const apiBase =
                process.env.NEXT_PUBLIC_API_PROXY_URL ||
                process.env.NEXT_PUBLIC_API_BASE_URL ||
                "";
            const meRes = await fetch(`${apiBase}/api/user/me`, {
                headers: { Authorization: `Bearer ${token.value}` },
                cache: "no-store",
            });
            if (!meRes.ok) {
                const loginUrl = new URL("/auth/login", request.url);
                return NextResponse.redirect(loginUrl);
            }
            const me = (await meRes.json()) as { user?: { rank?: string } };
            if (me?.user?.rank !== "ADMIN") {
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
