"use client";

import CountrySelector from "@/components/CountrySelector";
import KineticText from "@/components/KineticText";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getApiMarketAccounts, getApiPublicStats } from "@/service/api";
import { Activity, Filter, Search, ShoppingCart, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type AdminOnline = {
    username: string;
    nameColor?: string;
    nameEffect?: string;
};

type PublicStats = {
    totalMembers: number;
    totalThreads: number;
    newestMember: string;
    freeConfigsThreads: number;
    freeConfigsPosts: number;
    marketThreads: number;
    marketPosts: number;
    adminsOnline: AdminOnline[];
};

type PublicStatsResponse = PublicStats & {
    success?: boolean;
};

type MarketAccount = {
    id: string | number;
    productName: string;
    description: string;
    country: string;
    price: number | string;
    createdAt: string | Date;
    shop?: {
        shopName: string;
        storeColor?: string;
        storeEffect?: string;
        isTrusted?: boolean;
    };
};

type MarketAccountsResponse = {
    accounts?: MarketAccount[];
};

type SortFilter = "latest" | "most_sold" | "price_asc" | "price_desc";

const ACCOUNT_PAGE_SIZE = 15;

const initialStats: PublicStats = {
    totalMembers: 0,
    totalThreads: 0,
    newestMember: "Loading...",
    freeConfigsThreads: 0,
    freeConfigsPosts: 0,
    marketThreads: 0,
    marketPosts: 0,
    adminsOnline: [],
};

export default function Home() {
    const router = useRouter();
    const [stats, setStats] = useState<PublicStats>(initialStats);
    const [accounts, setAccounts] = useState<MarketAccount[]>([]);
    const [loadingAccounts, setLoadingAccounts] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [countryFilter, setCountryFilter] = useState("All");
    const [sortFilter, setSortFilter] = useState<SortFilter>("latest");
    const [page, setPage] = useState(1);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [proxyModalTarget, setProxyModalTarget] = useState<any | null>(null);
    const [proxyType, setProxyType] = useState<"HTTP/S" | "SOCKS5">("HTTP/S");
    const [proxyString, setProxyString] = useState("");
    const [checkStatus, setCheckStatus] = useState<"IDLE" | "CHECKING" | "VALID" | "FAIL">("IDLE");

    async function fetchAccounts() {
        setLoadingAccounts(true);
        try {
            const params = {
                search: searchQuery,
                country: countryFilter,
                sort: sortFilter,
                limit: 200,
            } as Parameters<typeof getApiMarketAccounts>[0];
            const data = (await getApiMarketAccounts(
                params,
            )) as unknown as MarketAccountsResponse;

            setAccounts(data?.accounts || []);
            setPage(1);
        } catch {}
        setLoadingAccounts(false);
    }

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await fetch("/api/user/me", {
                    headers: {
                        Authorization: `Bearer ${document.cookie.replace(/(?:(?:^|.*;\s*)sb_token\s*\=\s*([^;]*).*$)|^.*$/, "$1")}`,
                    },
                });
                if (res.ok) {
                    const data = await res.json();
                    setCurrentUser(data.user);
                }
            } catch (err) {
                console.error(err);
            }
        };
        fetchUser();
        getApiPublicStats()
            .then((data) => {
                const d = data as unknown as PublicStatsResponse;
                if (d?.success) {
                    setStats(d);
                }
            })
            .catch(console.error);
    }, []);

    useEffect(() => {
        queueMicrotask(() => {
            fetchAccounts();
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [countryFilter, sortFilter]);

    const handleSearch = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        fetchAccounts();
    };

    const getFlag = (country: string): ReactNode => {
        if (!country || country === "Global" || country === "All")
            return <span className="text-[1.2rem]">🌐</span>;
        let code = country.toLowerCase().trim();
        if (code === "usa" || code === "united states") code = "us";
        if (
            code === "uk" ||
            code === "united kingdom" ||
            code === "great britain"
        )
            code = "gb";
        if (code === "canada") code = "ca";
        if (code === "australia" || code.startsWith("au")) code = "au";
        return (
            <Image
                src={`https://flagcdn.com/w40/${code}.png`}
                alt={country}
                width={24}
                height={16}
                sizes="24px"
                className="inline-block h-auto w-6 rounded-sm"
                onError={(e) => {
                    e.currentTarget.style.display = "none";
                }}
            />
        );
    };

    const totalPages = Math.ceil(accounts.length / ACCOUNT_PAGE_SIZE) || 1;
    const visibleAccounts = accounts.slice(
        (page - 1) * ACCOUNT_PAGE_SIZE,
        page * ACCOUNT_PAGE_SIZE,
    );

    return (
        <main className="min-h-[calc(100vh-var(--navbar-height))] pb-10 pt-6 sm:pb-12 md:pb-16">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(15rem,1fr)] xl:grid-cols-[minmax(0,8fr)_minmax(16rem,1fr)] lg:gap-8 px-2 sm:px-0">
                <div className="lg:col-start-1 lg:row-start-1">
                    <section className="mb-10 mt-20 sm:mt-24 flex flex-col items-center text-center px-4 w-full">
                        {/* Enhanced Green Brightness Animated Box */}
                        <div className="relative overflow-hidden mb-6 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-6 py-2 text-sm font-bold tracking-wide text-emerald-500 shadow-[0_0_20px_rgba(34,197,94,0.15)] sm:text-base">
                            <div
                                className="absolute inset-0 z-0 w-[200%] bg-gradient-to-r from-transparent via-white/20 to-transparent"
                                style={{
                                    animation: "shimmer 2.5s infinite linear",
                                }}
                            />
                            <span className="relative z-10">
                                The First P2P Marketplace In Cracking World
                            </span>
                        </div>

                        <h1 className="mb-4 text-2xl font-bold sm:text-3xl">
                            Welcome to <span className="text-silver">Silverbullet</span>
                        </h1>

                        <p className="mb-8 text-xs sm:text-sm text-muted-foreground max-w-2xl mx-auto">
                            Welcome to the Official SilverBullet Marketplace. Our primary goal is to completely protect our buyers and sellers by preserving absolute anonymity. We supply premium logs, free configs, and a highly secure automated escrow ecosystem.
                        </p>

                        <div className="flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row sm:gap-4">
                            <Button asChild size="lg" className="w-full sm:w-[180px] font-bold shadow-lg opacity-95 hover:opacity-100 transition-opacity">
                                <Link href="/market">Browse Marketplace</Link>
                            </Button>
                            <Button asChild size="lg" className="w-full sm:w-[180px] font-bold shadow-lg opacity-95 hover:opacity-100 transition-opacity">
                                <Link href="/rdp">Browse RDP Section</Link>
                            </Button>
                        </div>
                    </section>
                    
                    <div className="mb-1 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <h2 className="m-0 text-xl font-bold sm:text-[1.35rem]">
                            Recently Added Items
                        </h2>
                        <Button
                            asChild
                            variant="link"
                            className="justify-start px-0 sm:justify-end"
                        >
                            <Link href="/market/accounts">View All →</Link>
                        </Button>
                    </div>
                </div>
                
                <div className="lg:col-start-1 lg:row-start-2 flex flex-col gap-6">

                    <Card className="rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
                        <form
                            onSubmit={handleSearch}
                            className="flex flex-col gap-2 p-2 sm:flex-row sm:flex-wrap sm:items-center"
                        >
                            <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-2 sm:min-w-60">
                                <Search className="size-5 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="Search items..."
                                    value={searchQuery}
                                    onChange={(e) =>
                                        setSearchQuery(e.target.value)
                                    }
                                    className="h-auto border-0 bg-transparent p-0 text-[1.05rem] shadow-none focus-visible:ring-0"
                                />
                            </div>
                            <Separator
                                orientation="vertical"
                                className="hidden h-8 md:block"
                            />
                            <div className="flex items-center gap-3 px-4 py-2">
                                <Filter className="size-5 text-muted-foreground" />
                                <CountrySelector
                                    value={countryFilter}
                                    onChange={setCountryFilter}
                                />
                            </div>
                            <Separator
                                orientation="vertical"
                                className="hidden h-8 md:block"
                            />
                            <Select
                                value={sortFilter}
                                onValueChange={(value: SortFilter) =>
                                    setSortFilter(value)
                                }
                            >
                                <SelectTrigger className="w-full border-0 bg-transparent shadow-none focus:ring-0 sm:w-45">
                                    <SelectValue placeholder="Sort" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value="latest">
                                            Sort: Added
                                        </SelectItem>
                                        <SelectItem value="most_sold">
                                            Sort: Best Sellers
                                        </SelectItem>
                                        <SelectItem value="price_asc">
                                            Sort: Low Price
                                        </SelectItem>
                                        <SelectItem value="price_desc">
                                            Sort: High Price
                                        </SelectItem>
                                    </SelectGroup>
                                </SelectContent>
                            </Select>
                            <Button
                                type="submit"
                                className="w-full px-6 font-bold sm:w-auto"
                            >
                                SCAN
                            </Button>
                        </form>
                    </Card>

                    <Card className="overflow-hidden p-0">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow className="hover:bg-muted/50">
                                    <TableHead className="font-bold uppercase tracking-[1px] px-2 sm:px-3">
                                        Name
                                    </TableHead>
                                    <TableHead className="font-bold uppercase tracking-[1px] px-2 sm:px-3">
                                        Country
                                    </TableHead>
                                    <TableHead className="font-bold uppercase tracking-[1px] px-2 sm:px-3 hidden md:table-cell">
                                        Info
                                    </TableHead>
                                    <TableHead className="font-bold uppercase tracking-[1px] px-2 sm:px-3 hidden sm:table-cell">
                                        Shop
                                    </TableHead>
                                    <TableHead className="font-bold uppercase tracking-[1px] px-2 sm:px-3 hidden sm:table-cell">
                                        Added
                                    </TableHead>
                                    <TableHead className="font-bold uppercase tracking-[1px] px-2 sm:px-3">
                                        Price
                                    </TableHead>
                                    <TableHead className="text-center font-bold uppercase tracking-[1px] px-2 sm:px-3">
                                        Action
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loadingAccounts ? (
                                    Array.from({ length: 5 }).map(
                                        (_, index) => (
                                            <TableRow key={`loading_${index}`}>
                                                <TableCell>
                                                    <Skeleton className="h-5 w-28" />
                                                </TableCell>
                                                <TableCell>
                                                    <Skeleton className="h-5 w-full" />
                                                </TableCell>
                                                <TableCell className="hidden md:table-cell">
                                                    <Skeleton className="h-5 w-24" />
                                                </TableCell>
                                                <TableCell className="hidden sm:table-cell">
                                                    <Skeleton className="h-5 w-18" />
                                                </TableCell>
                                                <TableCell className="hidden sm:table-cell">
                                                    <Skeleton className="h-5 w-20" />
                                                </TableCell>
                                                <TableCell>
                                                    <Skeleton className="mx-auto h-9 w-28" />
                                                </TableCell>
                                            </TableRow>
                                        ),
                                    )
                                ) : accounts.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={8}
                                            className="p-12 text-center text-muted-foreground"
                                        >
                                            No items matched your criteria.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    visibleAccounts.map((acc) => (
                                        <TableRow
                                            key={`list_${acc.id}`}
                                            tabIndex={0}
                                            className="cursor-pointer"
                                            onClick={() =>
                                                router.push(
                                                    `/market/checkout/${acc.id}`,
                                                )
                                            }
                                            onKeyDown={(event) => {
                                                if (event.key === "Enter") {
                                                    router.push(
                                                        `/market/checkout/${acc.id}`,
                                                    );
                                                }
                                            }}
                                        >
                                            <TableCell className="font-extrabold px-2 sm:px-3">
                                                {acc.productName}
                                            </TableCell>
                                            <TableCell className="px-2 sm:px-3">
                                                <div className="flex items-center gap-2 font-semibold">
                                                    {getFlag(acc.country)}
                                                    <span className="truncate">{acc.country}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground px-2 sm:px-3 hidden md:table-cell py-3">
                                                <div className="flex flex-wrap gap-1.5 text-[0.75rem] leading-[1.3]">
                                                    {acc.description.split(/[,|]/).map((item, idx) => {
                                                        const cleanItem = item.trim();
                                                        if (!cleanItem) return null;
                                                        return (
                                                            <span key={idx} className="bg-background/80 border border-border/50 px-2 py-0.5 rounded-md truncate max-w-full inline-block">
                                                                {cleanItem}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                            </TableCell>
                                            <TableCell className="px-2 sm:px-3 hidden sm:table-cell py-3">
                                                {acc.shop ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <KineticText 
                                                            text={acc.shop.shopName}
                                                            effect={acc.shop.storeEffect || "none"}
                                                            className={cn(
                                                                acc.shop.storeEffect && acc.shop.storeEffect !== "none" && !acc.shop.storeEffect.startsWith("Kinetic:") ? acc.shop.storeEffect : "",
                                                                "font-bold text-sm truncate max-w-[100px]"
                                                            )}
                                                            style={{ color: acc.shop.storeColor || "var(--foreground)" }}
                                                        />
                                                        {acc.shop.isTrusted && (
                                                            <span title="Trusted Shop" className="text-emerald-500 text-xs shrink-0">★</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground text-sm">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="px-2 sm:px-3 text-muted-foreground font-medium hidden sm:table-cell py-3 whitespace-nowrap">
                                                {new Date(acc.createdAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="font-extrabold text-silver px-2 sm:px-3 whitespace-nowrap">
                                                {acc.price} BLT
                                            </TableCell>
                                            <TableCell className="text-center px-2 sm:px-3">
                                                <Button
                                                    size="sm"
                                                    className="w-full font-bold shadow-sm opacity-95 hover:opacity-100 transition-opacity"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        router.push(
                                                            `/market/checkout/${acc.id}`,
                                                        );
                                                    }}
                                                >
                                                    <ShoppingCart className="size-4 mr-2" />
                                                    Checkout
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>

                        {!loadingAccounts && accounts.length > 0 && (
                            <CardFooter className="flex flex-col items-stretch justify-between gap-3 border-t bg-muted/40 p-4 sm:flex-row sm:items-center">
                                <Button
                                    variant="outline"
                                    onClick={() =>
                                        setPage((p) => Math.max(1, p - 1))
                                    }
                                    disabled={page === 1}
                                >
                                    Previous
                                </Button>
                                <span className="text-center text-sm text-muted-foreground">
                                    Page {page} of {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    onClick={() =>
                                        setPage((p) =>
                                            Math.min(totalPages, p + 1),
                                        )
                                    }
                                    disabled={page >= totalPages}
                                >
                                    Next
                                </Button>
                            </CardFooter>
                        )}
                    </Card>
                </div>

                <aside className="lg:col-start-2 lg:row-start-2 relative h-full">
                    <div className="flex flex-col gap-6">
                        <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Activity className="size-4 text-silver" />
                                Market Place Statistics
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col gap-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                        Total Members
                                    </span>
                                    <span className="font-mono font-semibold">
                                        {stats.totalMembers.toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">
                                        Total Threads
                                    </span>
                                    <span className="font-mono font-semibold">
                                        {stats.totalThreads.toLocaleString()}
                                    </span>
                                </div>
                                <div className="flex justify-between gap-4">
                                    <span className="text-muted-foreground">
                                        Newest Member
                                    </span>
                                    <span className="text-silver">
                                        {stats.newestMember}
                                    </span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <Users className="size-4 text-silver" />
                                Admins Online
                                <Badge variant="secondary">
                                    {stats.adminsOnline.length}
                                </Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-wrap gap-2">
                                {stats.adminsOnline.length === 0 ? (
                                    <span className="text-sm text-muted-foreground">
                                        No administrators online.
                                    </span>
                                ) : (
                                    stats.adminsOnline.map((admin, idx) => (
                                        <KineticText
                                            key={admin.username}
                                            text={`[Admin] ${admin.username}${
                                                idx <
                                                stats.adminsOnline.length - 1
                                                    ? ","
                                                    : ""
                                            }`}
                                            effect={admin.nameEffect || "none"}
                                            className={cn(
                                                admin.nameEffect &&
                                                    admin.nameEffect !==
                                                        "none" &&
                                                    !admin.nameEffect.startsWith(
                                                        "Kinetic:",
                                                    )
                                                    ? admin.nameEffect
                                                    : "",
                                                "text-sm font-semibold",
                                            )}
                                            style={{
                                                color:
                                                    admin.nameColor ||
                                                    "var(--accent-red)",
                                            }}
                                        />
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                    </div>
                </aside>
            </div>
            <Dialog
                open={!!proxyModalTarget}
                onOpenChange={(open) => {
                    if (!open) {
                        setProxyModalTarget(null);
                        setCheckStatus("IDLE");
                        setProxyString("");
                    }
                }}
            >
                <DialogContent className="max-w-md border-border/30 bg-background/95 backdrop-blur-xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold uppercase tracking-wider text-foreground">
                            POF Checker Tool
                        </DialogTitle>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 mt-2">
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-semibold text-muted-foreground">Proxy Type</label>
                            <Select
                                value={proxyType}
                                onValueChange={(val: any) => setProxyType(val)}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="HTTP/S">HTTP / HTTPS</SelectItem>
                                    <SelectItem value="SOCKS5">SOCKS5</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex flex-col gap-2">
                            <label className="text-sm font-semibold text-muted-foreground">Proxy Format (host:port:user:pass)</label>
                            <Input 
                                placeholder="127.0.0.1:8080:user:pass" 
                                value={proxyString}
                                onChange={(e) => setProxyString(e.target.value)}
                            />
                        </div>
                        
                        {checkStatus === "VALID" && (
                            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-lg text-center font-bold">
                                VALID LOGIN
                            </div>
                        )}
                        {checkStatus === "FAIL" && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-center font-bold">
                                INVALID OR FAILED
                            </div>
                        )}

                        <Button
                            className="mt-2 w-full font-bold"
                            disabled={!proxyString || checkStatus === "CHECKING"}
                            onClick={async () => {
                                setCheckStatus("CHECKING");
                                try {
                                    const res = await fetch("/api/checkers/pof", {
                                        method: "POST",
                                        headers: {
                                            "Content-Type": "application/json",
                                            Authorization: `Bearer ${document.cookie.replace(/(?:(?:^|.*;\s*)sb_token\s*\=\s*([^;]*).*$)|^.*$/, "$1")}`
                                        },
                                        body: JSON.stringify({
                                            productId: proxyModalTarget?.id,
                                            proxyString,
                                            proxyType: proxyType.replace("/S", "")
                                        })
                                    });
                                    const d = await res.json();
                                    if (d.status === "VALID") {
                                        setCheckStatus("VALID");
                                        toast.success("Account is Valid!");
                                    } else {
                                        setCheckStatus("FAIL");
                                        toast.error("Account Invalid or Check Failed");
                                    }
                                } catch (e) {
                                    setCheckStatus("FAIL");
                                    toast.error("Network error during check");
                                }
                            }}
                        >
                            {checkStatus === "CHECKING" ? "Checking..." : "Launch Check"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

        </main>
    );
}
