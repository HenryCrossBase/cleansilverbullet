"use client";

import CountrySelector from "@/components/CountrySelector";
import KineticText from "@/components/KineticText";
import { Button } from "@/components/ui/button";
import { Card, CardFooter } from "@/components/ui/card";
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
import { getApiMarketAccounts } from "@/service/api";
import { Filter, Search, ShoppingCart } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

type SortFilter = "latest" | "most_sold" | "price_asc" | "price_desc";
const ACCOUNT_PAGE_SIZE = 24;

export default function AccountsMarketplace() {
    const router = useRouter();
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [countryFilter, setCountryFilter] = useState("All");
    const [sortFilter, setSortFilter] = useState<SortFilter>("latest");
    const [page, setPage] = useState(1);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [proxyModalTarget, setProxyModalTarget] = useState<any | null>(null);
    const [proxyType, setProxyType] = useState<"HTTP/S" | "SOCKS5">("HTTP/S");
    const [proxyString, setProxyString] = useState("");
    const [checkStatus, setCheckStatus] = useState<"IDLE" | "CHECKING" | "VALID" | "FAIL">("IDLE");

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
        fetchAccounts();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [countryFilter, sortFilter]);

    const fetchAccounts = async () => {
        setLoading(true);
        try {
            const data: any = await getApiMarketAccounts({
                search: searchQuery,
                country: countryFilter,
                sort: sortFilter,
                limit: 100, // Fetch more for local pagination or adjust API
            } as any);
            setAccounts(data?.accounts || []);
            setPage(1);
        } catch {
            toast.error("Something went wrong");
        }
        setLoading(false);
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchAccounts();
    };

    const getFlag = (country: string) => {
        if (!country || country === "Global" || country === "All")
            return <span className="text-[1.2rem]">🌐</span>;
        
        let code = country.toLowerCase().trim();
        if (code === "usa" || code === "united states") code = "us";
        if (code === "uk" || code === "united kingdom" || code === "great britain") code = "gb";
        if (code === "canada") code = "ca";
        if (code === "australia" || code.startsWith("au")) code = "au";

        return (
            <Image
                src={`https://flagcdn.com/w40/${code}.png`}
                alt={country}
                width={24}
                height={16}
                sizes="24px"
                className="w-6 h-auto rounded-sm inline-block"
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
        <main className="min-h-[calc(100vh-var(--navbar-height))] px-6 pb-12 pt-24 sm:px-12 md:px-16 md:pt-28 max-w-[1600px] mx-auto">
            <div className="mb-12 text-center flex flex-col items-center">
                <h1 className="mb-4 text-3xl font-bold sm:text-5xl text-foreground">
                    Global Accounts Ledger
                </h1>
                <p className="mb-8 text-sm sm:text-lg text-muted-foreground max-w-2xl mx-auto">
                    High-density table access to premium extracted logs, combos, and enterprise accounts.
                </p>

                <Card className="w-full max-w-4xl rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.2)]">
                    <form
                        onSubmit={handleSearch}
                        className="flex flex-col gap-2 p-2 sm:flex-row sm:flex-wrap sm:items-center"
                    >
                        <div className="flex min-w-0 flex-1 items-center gap-3 px-4 py-2 sm:min-w-60">
                            <Search className="size-5 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder="Search target payloads..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="h-auto border-0 bg-transparent p-0 text-[1.05rem] shadow-none focus-visible:ring-0"
                            />
                        </div>
                        <Separator orientation="vertical" className="hidden h-8 md:block" />
                        <div className="flex items-center gap-3 px-4 py-2">
                            <Filter className="size-5 text-muted-foreground" />
                            <CountrySelector
                                value={countryFilter}
                                onChange={setCountryFilter}
                            />
                        </div>
                        <Separator orientation="vertical" className="hidden h-8 md:block" />
                        <Select
                            value={sortFilter}
                            onValueChange={(value: SortFilter) => setSortFilter(value)}
                        >
                            <SelectTrigger className="w-full border-0 bg-transparent shadow-none focus:ring-0 sm:w-45">
                                <SelectValue placeholder="Sort" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectGroup>
                                    <SelectItem value="latest">Sort: Added</SelectItem>
                                    <SelectItem value="most_sold">Sort: Best Sellers</SelectItem>
                                    <SelectItem value="price_asc">Sort: Low Price</SelectItem>
                                    <SelectItem value="price_desc">Sort: High Price</SelectItem>
                                </SelectGroup>
                            </SelectContent>
                        </Select>
                        <Button type="submit" className="w-full px-8 font-bold sm:w-auto text-base">
                            SCAN
                        </Button>
                    </form>
                </Card>
            </div>

            <Card className="overflow-hidden p-0 shadow-lg">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow className="hover:bg-muted/50">
                            <TableHead className="font-bold uppercase tracking-[1px] px-4">Name</TableHead>
                            <TableHead className="font-bold uppercase tracking-[1px] px-4">Country</TableHead>
                            <TableHead className="font-bold uppercase tracking-[1px] px-4 hidden lg:table-cell">Info</TableHead>
                            <TableHead className="font-bold uppercase tracking-[1px] px-4 hidden md:table-cell">Shop</TableHead>
                            <TableHead className="font-bold uppercase tracking-[1px] px-4 hidden sm:table-cell">Added</TableHead>
                            <TableHead className="font-bold uppercase tracking-[1px] px-4">Price</TableHead>
                            <TableHead className="text-center font-bold uppercase tracking-[1px] px-4">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 10 }).map((_, index) => (
                                <TableRow key={`loading_${index}`}>
                                    <TableCell className="px-4"><Skeleton className="h-6 w-32" /></TableCell>
                                    <TableCell className="px-4"><Skeleton className="h-6 w-full max-w-24" /></TableCell>
                                    <TableCell className="px-4 hidden lg:table-cell"><Skeleton className="h-6 w-48" /></TableCell>
                                    <TableCell className="px-4 hidden md:table-cell"><Skeleton className="h-6 w-24" /></TableCell>
                                    <TableCell className="px-4 hidden sm:table-cell"><Skeleton className="h-6 w-20" /></TableCell>
                                    <TableCell className="px-4"><Skeleton className="h-6 w-16" /></TableCell>
                                    <TableCell className="px-4 text-center"><Skeleton className="h-9 w-28 mx-auto" /></TableCell>
                                </TableRow>
                            ))
                        ) : accounts.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="p-16 text-center text-muted-foreground text-lg">
                                    No accounts matched your criteria.
                                </TableCell>
                            </TableRow>
                        ) : (
                            visibleAccounts.map((acc) => (
                                <TableRow
                                    key={`list_${acc.id}`}
                                    tabIndex={0}
                                    className="cursor-pointer transition-colors hover:bg-muted/30"
                                    onClick={() => router.push(`/market/shop/${acc.shopId}`)}
                                >
                                    <TableCell className="font-extrabold px-4 text-base">
                                        {acc.productName}
                                    </TableCell>
                                    <TableCell className="px-4">
                                        <div className="flex items-center gap-2 font-semibold">
                                            {getFlag(acc.country)}
                                            <span className="truncate">{acc.country}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground px-4 hidden lg:table-cell">
                                        <div className="flex flex-col gap-0.5 text-sm leading-snug">
                                            {acc.description.split(',').map((item: string, idx: number) => (
                                                <span key={idx} className="block whitespace-nowrap">
                                                    {item.trim()}
                                                </span>
                                            ))}
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 hidden md:table-cell">
                                        {acc.shop ? (
                                            <div className="flex items-center gap-1.5">
                                                <KineticText 
                                                    text={acc.shop.shopName}
                                                    effect={acc.shop.storeEffect || "none"}
                                                    className={cn(
                                                        acc.shop.storeEffect && acc.shop.storeEffect !== "none" && !acc.shop.storeEffect.startsWith("Kinetic:") ? acc.shop.storeEffect : "",
                                                        "font-bold text-[0.95rem] truncate max-w-[120px]"
                                                    )}
                                                    style={{ color: (acc.shop.storeColor === '#ffffff' || !acc.shop.storeColor) ? 'var(--foreground)' : acc.shop.storeColor }}
                                                />
                                                {acc.shop.isTrusted && (
                                                    <span title="Trusted Shop" className="text-emerald-500 text-sm shrink-0">★</span>
                                                )}
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground text-sm">-</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="px-4 text-muted-foreground font-medium hidden sm:table-cell whitespace-nowrap">
                                        {new Date(acc.createdAt).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="font-extrabold text-silver px-4 text-base whitespace-nowrap">
                                        {acc.price} BLT
                                    </TableCell>
                                    <TableCell className="text-center px-4">
                                        <Button
                                            size="sm"
                                            className="w-full sm:w-auto font-bold shadow-sm opacity-95 hover:opacity-100 transition-opacity"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                router.push(`/market/checkout/${acc.id}`);
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

                {!loading && accounts.length > 0 && (
                    <CardFooter className="flex flex-col items-stretch justify-between gap-3 border-t border-border/50 bg-muted/20 p-4 sm:flex-row sm:items-center">
                        <Button
                            variant="outline"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                        >
                            Previous
                        </Button>
                        <span className="text-center text-sm font-medium text-muted-foreground">
                            Page {page} of {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                        >
                            Next
                        </Button>
                    </CardFooter>
                )}
            </Card>

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
