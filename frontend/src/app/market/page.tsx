"use client";
import AdBanner from "@/components/AdBanner";
import { cn } from "@/lib/utils";
import { getApiShops } from "@/service/api";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

type Shop = {
    id: string | number;
    shopName: string;
    shopDescription: string;
    bannerUrl?: string | null;
    avatarUrl?: string | null;
    storeEffect?: string | null;
    storeColor?: string | null;
    isTrusted?: boolean;
    owner?: {
        username?: string;
        rank?: string;
    };
    _count: {
        products: number;
    };
};

type ShopsResponse = {
    shops?: Shop[];
};

export default function MarketPlace() {
    const [shops, setShops] = useState<Shop[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchShops = async () => {
            try {
                const data = (await getApiShops()) as unknown as ShopsResponse;
                setShops(data?.shops || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchShops();
    }, []);

    if (loading)
        return (
            <div className="py-16 text-center text-(--text-primary) sm:py-20">
                Decrypting Vendor Index...
            </div>
        );

    return (
        <div className="pb-10 pt-20 sm:pb-12 sm:pt-24 md:pb-16 md:pt-28">
            <AdBanner />
            <div className="mb-10 text-center sm:mb-12">
                <h1 className="mb-4 text-3xl font-mono text-(--text-primary) sm:text-4xl md:text-[2.5rem] leading-normal pt-1">
                    ENTERPRISE STOREFRONTS
                </h1>
                <p className="mx-auto max-w-150 text-sm text-(--text-muted) sm:text-base">
                    Welcome to the Silverbullet Marketplace. Only VIP Sellers are
                    authorized to operate storefronts. All transactions are
                    final.
                </p>
            </div>

            <div className="grid gap-4 grid-cols-[repeat(auto-fit,minmax(min(100%,18rem),1fr))] sm:gap-6 md:grid-cols-[repeat(auto-fit,minmax(20rem,1fr))] lg:gap-8">
                {shops.map((shop) => (
                    <Link
                        key={shop.id}
                        href={`/market/shop/${shop.id}`}
                        className="block no-underline"
                    >
                        <div
                            className="group flex flex-col rounded-2xl border border-border bg-card/80 shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-md transition-all duration-300 hover:-translate-y-1 hover:border-emerald-500/50 hover:shadow-[0_8px_30px_rgba(16,185,129,0.2)] overflow-hidden relative cursor-pointer min-h-[16rem]"
                            style={{
                                backgroundImage: shop.bannerUrl
                                    ? `url(${shop.bannerUrl})`
                                    : undefined,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                            }}
                        >
                            {shop.bannerUrl && (
                                <div className="absolute inset-0 bg-background/90 group-hover:bg-background/80 transition-colors z-0"></div>
                            )}

                            <div className="relative z-10 flex flex-col flex-1 p-5">
                                <div className="flex items-start gap-4">
                                    <div className="h-14 w-14 overflow-hidden rounded-xl border border-border/50 bg-background/50 shadow-inner shrink-0">
                                        <Image
                                            src={
                                                shop.avatarUrl &&
                                                shop.avatarUrl !==
                                                    "/default-avatar.png"
                                                    ? shop.avatarUrl.startsWith(
                                                          "http",
                                                      )
                                                        ? shop.avatarUrl
                                                        : `/${shop.avatarUrl}`
                                                    : "/default-avatar.png"
                                            }
                                            width={60}
                                            height={60}
                                            unoptimized
                                            className="w-full h-full object-cover"
                                            alt="Store Avatar"
                                            onError={(e) => {
                                                e.currentTarget.src =
                                                    "/default-avatar.png";
                                            }}
                                        />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="mb-1 flex items-center gap-2">
                                            <h3
                                                className={`text-lg font-bold truncate ${shop.storeEffect && shop.storeEffect !== "none" ? shop.storeEffect : ""}`}
                                                style={{
                                                    color:
                                                        shop.storeColor ===
                                                            "#ffffff" ||
                                                        !shop.storeColor
                                                            ? "var(--text-primary)"
                                                            : shop.storeColor,
                                                    textShadow:
                                                        !shop.storeEffect ||
                                                        shop.storeEffect ===
                                                            "none"
                                                            ? `0 0 10px ${shop.storeColor === "#ffffff" || !shop.storeColor ? "var(--text-primary)" : shop.storeColor}40`
                                                            : undefined,
                                                }}
                                            >
                                                {shop.shopName}
                                            </h3>
                                            {shop.isTrusted && (
                                                <span
                                                    className="flex items-center filter-[drop-shadow(0_0_5px_rgba(59,130,246,0.5))]"
                                                    title="Verified Store"
                                                >
                                                    <svg
                                                        width="16"
                                                        height="16"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <circle
                                                            cx="12"
                                                            cy="12"
                                                            r="10"
                                                            fill="#3b82f6"
                                                        />
                                                        <path
                                                            fill="none"
                                                            stroke="white"
                                                            strokeWidth="2"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            d="M8 12.5l3 3 5-6"
                                                        />
                                                    </svg>
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-muted-foreground text-xs">
                                                Vendor: <strong className="text-foreground">{shop.owner?.username}</strong>
                                            </span>
                                            <span
                                                className={cn(
                                                    "text-[#111827] text-[0.65rem] font-bold py-0.5 px-1.5 rounded uppercase tracking-widest",
                                                    shop.owner?.rank ===
                                                        "ENTERPRISE"
                                                        ? "bg-amber-500"
                                                        : shop.owner?.rank ===
                                                            "PRO"
                                                          ? "bg-blue-500"
                                                          : "bg-emerald-500",
                                                )}
                                            >
                                                {shop.owner?.rank}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <p className="mt-4 text-sm text-muted-foreground line-clamp-3">
                                    {shop.shopDescription}
                                </p>

                                <div className="flex-1"></div>

                                <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between">
                                    <div className="text-xs text-muted-foreground">
                                        <strong className="text-foreground text-sm">
                                            {shop._count.products}
                                        </strong>{" "}
                                        Active Goods
                                    </div>
                                    <div className="text-emerald-500 text-sm font-semibold flex items-center gap-1 transition-all">
                                        Enter Secure Shop &rarr;
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
