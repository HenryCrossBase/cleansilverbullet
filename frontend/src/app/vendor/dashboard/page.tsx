"use client";
import CountrySelector, { COUNTRIES } from "@/components/CountrySelector";
import KineticText from "@/components/KineticText";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Lock, Package, Star, Trophy, Zap } from "lucide-react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
const getFlagForCountry = (countryName: string) => {
    if (!countryName) return null;
    if (countryName.toLowerCase() === "all" || countryName.toLowerCase() === "all regions") return <span className="text-base leading-none mr-2">🌍</span>;
    if (countryName.toLowerCase() === "global" || countryName.toLowerCase() === "global / mixed") return <span className="text-base leading-none mr-2">🌐</span>;

    const country = COUNTRIES.find((c) => c.name.toLowerCase() === countryName.toLowerCase() || c.code.toLowerCase() === countryName.toLowerCase());
    if (country && country.code.length === 2) {
        return (
            <Image
                src={`https://flagcdn.com/w20/${country.code.toLowerCase()}.png`}
                alt={country.code}
                width={16}
                height={12}
                sizes="16px"
                className="h-3 w-4 rounded-sm object-cover mr-2"
            />
        );
    }
    return null;
};

function DashboardContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [enterpriseData, setEnterpriseData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [viewerCode, setViewerCode] = useState<any>(null);
    const [activeTab, setActiveTab] = useState("overview");

    const getSplitRate = () => {
        if (!viewerCode) return 0.5;
        if (viewerCode.customSplit !== null) return viewerCode.customSplit;
        if (viewerCode.rank === "ENTERPRISE" || viewerCode.rank === "ADMIN") return 0.75;
        if (viewerCode.rank === "PREMIUM") return 0.6;
        return 0.5;
    };

    useEffect(() => {
        const tab = searchParams.get("tab");
        if (tab) setActiveTab(tab);
        else setActiveTab("overview");
    }, [searchParams]);

    const [withdrawalsData, setWithdrawalsData] = useState<any[]>([]);
    const [withdrawModalOpen, setWithdrawModalOpen] = useState(false);
    const [withdrawNetwork, setWithdrawNetwork] = useState("USDT TRC20");
    const [withdrawAddress, setWithdrawAddress] = useState("");

    const [setupPhase, setSetupPhase] = useState(1);
    const [tgLinkCode, setTgLinkCode] = useState("");

    const [targetCategory, setTargetCategory] = useState("");
    const [newProduct, setNewProduct] = useState({
        price: "",
        log: "",
        info: "",
        category: "ACCOUNT",
        country: "Global",
    });
    const [singleProduct, setSingleProduct] = useState({
        name: "",
        info: "",
        price: "",
        log: "",
        category: "ACCOUNT",
        country: "Global",
    });

    const [bulkCategory, setBulkCategory] = useState("");
    const [bulkPrice, setBulkPrice] = useState("");
    const [bulkLoading, setBulkLoading] = useState(false);
    const [marketBidAmount, setMarketBidAmount] = useState("");
    const [bidTarget, setBidTarget] = useState("STORE");
    const [bidLoading, setBidLoading] = useState(false);
    const [categoryBidAmounts, setCategoryBidAmounts] = useState<Record<string, string>>({});
    const [categoryBidLoading, setCategoryBidLoading] = useState<string | null>(null);
    
    const [biddingProductId, setBiddingProductId] = useState<string | null>(null);
    const [productBidAmount, setProductBidAmount] = useState("");

    const [activeColor, setActiveColor] = useState("#ffffff");
    const [activeEffect, setActiveEffect] = useState("none");
    const [avatarInput, setAvatarInput] = useState("");
    const [bannerInput, setBannerInput] = useState("");
    const [shopNameInput, setShopNameInput] = useState("");
    const [shopDescInput, setShopDescInput] = useState("");
    const availableColors = [
        "#ffffff",
        "#ef4444",
        "#f97316",
        "#f59e0b",
        "#84cc16",
        "#22c55e",
        "#06b6d4",
        "#3b82f6",
        "#6366f1",
        "#a855f7",
        "#ec4899",
        "#f43f5e",
        "#71717a",
        "#d4d4d8",
        "#fde047",
        "#10b981",
    ];

    const [salesPage, setSalesPage] = useState(1);
    const [inventoryPage, setInventoryPage] = useState(1);
    const [reviewsPage, setReviewsPage] = useState(1);
    const [unsoldSearch, setUnsoldSearch] = useState("");

    const [selectedProducts, setSelectedProducts] = useState<Set<string>>(
        new Set(),
    );
    const [bulkActionLoading, setBulkActionLoading] = useState(false);

    const [editingProductId, setEditingProductId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({
        productName: "",
        country: "Global",
        logContent: "",
        price: "",
    });

    const saveProductEdit = async (id: string) => {
        const token = document.cookie.replace(/(?:(?:^|.*;\s*)sb_token\s*\=\s*([^;]*).*$)|^.*$/, "$1");
        try {
            const res = await fetch(`/api/enterprise/products/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    productName: editForm.productName,
                    country: editForm.country,
                    logContent: editForm.logContent,
                    price: parseInt(editForm.price)
                })
            });
            const data = await res.json();
            if (data.success) {
                setEnterpriseData((prev: any) => {
                    if (!prev) return prev;
                    const newProducts = prev.shop.products.map((p: any) => {
                        if (p.id === id) {
                            return { ...p, productName: editForm.productName, country: editForm.country, logContent: editForm.logContent, price: parseInt(editForm.price) };
                        }
                        return p;
                    });
                    return { ...prev, shop: { ...prev.shop, products: newProducts } };
                });
                setEditingProductId(null);
                toast.success("Product updated successfully");
            } else {
                toast.error(data.error || "Failed to update product");
            }
        } catch {
            toast.error("Failed to update product");
        }
    };

    const [confirmTarget, setConfirmTarget] = useState<{
        message: string;
        action: () => void;
    } | null>(null);

    useEffect(() => {
        const userStr = localStorage.getItem("sb_user");
        if (!userStr) {
            router.push("/");
            return;
        }
        let userObj = JSON.parse(userStr);

        const fetchDashboard = async () => {
            try {
                const token = document.cookie.replace(
                    /(?:(?:^|.*;\s*)sb_token\s*\=\s*([^;]*).*$)|^.*$/,
                    "$1",
                );

                // Fetch latest user data to ensure rank upgrades apply without re-login
                try {
                    const meRes = await fetch("/api/user/me", { headers: { Authorization: `Bearer ${token}` } });
                    if (meRes.ok) {
                        const meData = await meRes.json();
                        if (meData.user) {
                            userObj = { ...userObj, ...meData.user };
                            localStorage.setItem("sb_user", JSON.stringify(userObj));
                        }
                    }
                } catch (e) {}

                setViewerCode(userObj);

                if (!["PRO", "PREMIUM", "ENTERPRISE", "ADMIN"].includes(userObj.rank)) {
                    setLoading(false);
                    return;
                }

                const res = await fetch("/api/enterprise/dashboard", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const data = await res.json();

                if (res.ok && data.success) {
                    setEnterpriseData(data);
                    setActiveColor(data.shop?.storeColor || "#ffffff");
                    setActiveEffect(data.shop?.storeEffect || "none");
                    if (data.shop) {
                        setAvatarInput(data.shop.avatarUrl || "");
                        setBannerInput(data.shop.bannerUrl || "");
                        setShopNameInput(data.shop.shopName || "");
                        setShopDescInput(data.shop.shopDescription || "");
                    }

                    try {
                        const wdRes = await fetch(
                            "/api/enterprise/withdrawals",
                            { headers: { Authorization: `Bearer ${token}` } },
                        );
                        const wdData = await wdRes.json();
                        if (wdData.success)
                            setWithdrawalsData(wdData.withdrawals);
                    } catch (e) { }
                } else {
                    if (res.status === 401 || res.status === 403) {
                        localStorage.removeItem("sb_user");
                        document.cookie =
                            "sb_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";
                        router.push("/auth/login");
                        return;
                    }
                    router.push("/"); // Fallback if API rejects
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboard();
    }, [router]);

    const handleWithdrawal = async () => {
        if (enterpriseData?.vendorBalance < 50)
            return toast.error("Something went wrong");
        setWithdrawModalOpen(true);
    };

    const executeWithdrawal = async () => {
        if (!withdrawAddress || !withdrawNetwork)
            return toast.error("Something went wrong");
        const amount = enterpriseData?.vendorBalance || 0;
        if (amount < 50) return toast.error("Something went wrong");

        setWithdrawModalOpen(false);
        toast.success("Done");

        const token = document.cookie.replace(
            /(?:(?:^|.*;\s*)sb_token\s*\=\s*([^;]*).*$)|^.*$/,
            "$1",
        );
        try {
            await fetch("/api/enterprise/withdraw", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    cryptoAddress: withdrawAddress,
                    network: withdrawNetwork,
                    amount,
                }),
            });
            setTimeout(() => window.location.reload(), 1500);
        } catch {
            toast.error("Something went wrong");
        }
    };

    const buyCosmetic = async (type: string, overrideColor?: string, overrideEffect?: string) => {
        const token = document.cookie.replace(
            /(?:(?:^|.*;\s*)sb_token\s*\=\s*([^;]*).*$)|^.*$/,
            "$1",
        );
        try {
            const payload: any = { type };
            if (type === "color_pass") {
                payload.hexColor = overrideColor || activeColor;
                payload.effect = overrideEffect || activeEffect;
            } else if (type === "avatar_update") {
                payload.avatarUrl =
                    avatarInput !== undefined ? avatarInput : "";
                payload.bannerUrl =
                    bannerInput !== undefined ? bannerInput : "";
                payload.shopName =
                    shopNameInput !== undefined ? shopNameInput : "";
                payload.shopDescription =
                    shopDescInput !== undefined ? shopDescInput : "";
            }
            const res = await fetch("/api/enterprise/buy-cosmetic", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Done");
                setTimeout(() => window.location.reload(), 1500);
            } else {
                toast.error("Something went wrong");
            }
        } catch {
            toast.error("Something went wrong");
        }
    };

    const submitProduct = async () => {
        if (!targetCategory || !newProduct.price || !newProduct.log)
            return toast.error("Something went wrong");
        const token = document.cookie.replace(
            /(?:(?:^|.*;\s*)sb_token\s*\=\s*([^;]*).*$)|^.*$/,
            "$1",
        );
        try {
            const res = await fetch("/api/enterprise/products", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    productName: targetCategory,
                    description: newProduct.info || "Automated batch deployment",
                    price: newProduct.price,
                    logContent: newProduct.log,
                    category: newProduct.category,
                    country: newProduct.country,
                    isBulk: true,
                }),
            });
            if (res.ok) {
                toast.success("Done");
                setNewProduct({
                    price: "",
                    log: "",
                    info: "",
                    category: "ACCOUNT",
                    country: "Global",
                });
                setTargetCategory("");
                setTimeout(() => window.location.reload(), 1500);
            } else {
                const data = await res.json();
                toast.error("Something went wrong");
            }
        } catch {
            toast.error("Something went wrong");
        }
    };

    const submitSingleProduct = async () => {
        if (
            !singleProduct.name ||
            !singleProduct.info ||
            !singleProduct.price ||
            !singleProduct.log
        )
            return toast.error("Something went wrong");
        const token = document.cookie.replace(
            /(?:(?:^|.*;\s*)sb_token\s*\=\s*([^;]*).*$)|^.*$/,
            "$1",
        );
        try {
            const res = await fetch("/api/enterprise/products", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    productName: singleProduct.name,
                    description: singleProduct.info,
                    price: singleProduct.price,
                    logContent: singleProduct.log,
                    category: singleProduct.category,
                    country: singleProduct.country,
                }),
            });
            if (res.ok) {
                toast.success("Done");
                setSingleProduct({
                    name: "",
                    info: "",
                    price: "",
                    log: "",
                    category: "ACCOUNT",
                    country: "Global",
                });
                setTimeout(() => window.location.reload(), 1500);
            } else {
                const data = await res.json();
                toast.error("Something went wrong");
            }
        } catch {
            toast.error("Something went wrong");
        }
    };

    const submitBulkEdit = async () => {
        if (!bulkCategory || !bulkPrice)
            return toast.error("Something went wrong");
        setBulkLoading(true);
        const token = document.cookie.replace(
            /(?:(?:^|.*;\s*)sb_token\s*\=\s*([^;]*).*$)|^.*$/,
            "$1",
        );
        try {
            const res = await fetch("/api/enterprise/bulk-price", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    category: bulkCategory,
                    newPrice: bulkPrice,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Done");
                setTimeout(() => window.location.reload(), 1500);
            } else {
                toast.error("Something went wrong");
            }
        } catch {
            toast.error("Something went wrong");
        }
        setBulkLoading(false);
    };

    const submitShopBid = async () => {
        if (!marketBidAmount || isNaN(parseFloat(marketBidAmount)))
            return toast.error("Something went wrong");
        setBidLoading(true);
        const token = document.cookie.replace(
            /(?:(?:^|.*;\s*)sb_token\s*\=\s*([^;]*).*$)|^.*$/,
            "$1",
        );
        try {
            const res = await fetch("/api/enterprise/bid", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ amount: marketBidAmount }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Done");
                setMarketBidAmount("");
                setTimeout(() => window.location.reload(), 1500);
            } else {
                toast.error("Something went wrong");
            }
        } catch {
            toast.error("Something went wrong");
        }
        setBidLoading(false);
    };

    const deleteSingleProduct = (id: string) => {
        setConfirmTarget({
            message: "Are you sure you want to delete this product?",
            action: async () => {
                const token = document.cookie.replace(
                    /(?:(?:^|.*;\s*)sb_token\s*\=\s*([^;]*).*$)|^.*$/,
                    "$1",
                );
                try {
                    const res = await fetch(`/api/enterprise/products/${id}`, {
                        method: "DELETE",
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    const data = await res.json();
                    if (res.ok) {
                        toast.success("Done");
                        window.location.reload();
                    } else toast.error("Something went wrong");
                } catch {
                    toast.error("Something went wrong");
                }
            },
        });
    };

    const deleteBulkCategory = () => {
        if (!bulkCategory) return toast.error("Something went wrong");
        setConfirmTarget({
            message: `WARNING: You are about to delete all products in [${bulkCategory}]. Are you sure?`,
            action: async () => {
                setBulkLoading(true);
                const token = document.cookie.replace(
                    /(?:(?:^|.*;\s*)sb_token\s*\=\s*([^;]*).*$)|^.*$/,
                    "$1",
                );
                try {
                    const res = await fetch("/api/enterprise/bulk-products", {
                        method: "DELETE",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ category: bulkCategory }),
                    });
                    const data = await res.json();
                    if (res.ok) {
                        toast.success("Done");
                        window.location.reload();
                    } else toast.error("Something went wrong");
                } catch {
                    toast.error("Something went wrong");
                }
                setBulkLoading(false);
            },
        });
    };

    const handleExportLogs = () => {
        if (!enterpriseData || !enterpriseData.shop) return;
        const logsToExport = enterpriseData.shop.products
            .filter((p: any) => selectedProducts.has(p.id))
            .map((p: any) => p.logContent)
            .join("\n");
        if (!logsToExport) return toast.error("Something went wrong");

        const blob = new Blob([logsToExport], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `exported_logs_${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Done");
    };

    const executeBulkAction = async (actionType: "DELETE" | "UPDATE_PRICE") => {
        if (selectedProducts.size === 0)
            return toast.error("Something went wrong");

        let newPrice: number | undefined = undefined;
        if (actionType === "UPDATE_PRICE") {
            const priceInput = prompt(
                "Enter new price in BLT for selected products:",
            );
            if (!priceInput) return;
            newPrice = parseInt(priceInput);
            if (isNaN(newPrice) || newPrice < 1)
                return toast.error("Something went wrong");
        }

        const confirmMsg =
            actionType === "DELETE"
                ? `Are you sure you want to permanently delete ${selectedProducts.size} selected items?`
                : `Change price to ${newPrice} BLT for ${selectedProducts.size} selected items?`;

        setConfirmTarget({
            message: confirmMsg,
            action: async () => {
                setBulkActionLoading(true);
                const token = document.cookie.replace(
                    /(?:(?:^|.*;\s*)sb_token\s*\=\s*([^;]*).*$)|^.*$/,
                    "$1",
                );
                try {
                    const res = await fetch("/api/enterprise/bulk-actions", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            action: actionType,
                            productIds: Array.from(selectedProducts),
                            newPrice,
                        }),
                    });
                    const data = await res.json();
                    if (res.ok) {
                        toast.success("Done");
                        setTimeout(() => window.location.reload(), 1500);
                    } else {
                        toast.error("Something went wrong");
                    }
                } catch {
                    toast.error("Something went wrong");
                }
                setBulkActionLoading(false);
            },
        });
    };

    if (loading)
        return (
            <div className="text-(--text-primary) text-center p-20 font-mono">
                Checking your account...
            </div>
        );

    if (
        viewerCode &&
        !["PRO", "PREMIUM", "ENTERPRISE", "ADMIN"].includes(viewerCode.rank)
    ) {
        return (
            <div className="max-w-200 my-16 mx-auto text-center p-12 bg-(--bg-secondary) border border-(--border-color) rounded-lg">
                <h1 className="text-(--text-primary) text-[2.5rem] mb-4 flex items-center justify-center gap-2.5">
                    <Lock size={32} /> Access Denied
                </h1>
                <p className="text-(--text-muted) text-[1.2rem] mb-8">
                    The Seller Dashboard is only available to Premium and
                    Enterprise members.
                </p>
                <div className="p-6 bg-(--bg-tertiary) text-(--text-primary) border border-(--border-color) rounded-lg mb-8">
                    Please upgrade your account to sell products and manage your
                    store.
                </div>
                <Button
                    onClick={() => router.push("/upgrade")}
                    className="py-4 px-8 text-[1.1rem] h-auto font-semibold"
                >
                    View Upgrade Packages
                </Button>
            </div>
        );
    }

    if (enterpriseData && enterpriseData.needsSetup) {
        return (
            <div className="max-w-xl my-16 mx-auto p-10 bg-card/80 border border-border rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] backdrop-blur-md text-center">
                <h1 className="text-3xl font-mono text-foreground mb-4 flex items-center justify-center gap-3">
                    <Package size={28} className="text-muted-foreground" /> Vendor Onboarding
                </h1>

                {setupPhase === 1 ? (
                    <>
                        <p className="text-muted-foreground text-[1.05rem] mb-8 px-4">
                            Step 1: Link your Telegram account to your Store to
                            receive instant notifications for sales and
                            disputes.
                        </p>
                        <Button
                            onClick={async () => {
                                try {
                                    const token = document.cookie.replace(
                                        /(?:(?:^|.*;\s*)sb_token\s*\=\s*([^;]*).*$)|^.*$/,
                                        "$1",
                                    );
                                    const res = await fetch(
                                        "/api/enterprise/tg-token",
                                        {
                                            headers: {
                                                Authorization: `Bearer ${token}`,
                                            },
                                        },
                                    );
                                    const data = await res.json();
                                    if (data.linked) {
                                        setSetupPhase(2);
                                    } else if (data.token) {
                                        setTgLinkCode(data.token);
                                    }
                                } catch (e) {
                                    toast.error("Something went wrong");
                                }
                            }}
                            className="py-6 px-10 rounded-xl font-bold text-[1.1rem] mb-4 w-full sm:w-auto"
                        >
                            {tgLinkCode ? "REFRESH STATUS" : "BEGIN LINKAGE"}
                        </Button>

                        {tgLinkCode && (
                            <div className="bg-background/50 p-6 rounded-xl border border-border/50 mt-6 shadow-inner text-left">
                                <div className="text-foreground mb-4 font-semibold text-center">
                                    Message our Authentication Bot on Telegram:
                                </div>
                                <div className="flex justify-center mb-6">
                                    <a
                                        href="https://t.me/SilverMarketPlaceBot"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 bg-[#229ED9] hover:bg-[#1f8bc0] text-white py-2.5 px-6 rounded-lg no-underline font-bold transition-colors shadow-sm"
                                    >
                                        <svg
                                            viewBox="0 0 24 24"
                                            width="18"
                                            height="18"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            fill="none"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        >
                                            <path d="M21.5 2L2.5 10l5 2 1.5 8 3.5-4 5.5 3 3.5-17z"></path>
                                            <path d="M11 12l8-7"></path>
                                        </svg>
                                        Open Telegram Bot
                                    </a>
                                </div>
                                <div className="bg-card border border-border p-4 rounded-lg text-center mx-auto max-w-xs shadow-sm">
                                    <div className="text-2xl text-[#229ED9] font-bold tracking-widest font-mono select-all">
                                        /link {tgLinkCode}
                                    </div>
                                </div>
                                <div className="text-[0.85rem] text-muted-foreground mt-4 text-center">
                                    Copy and send the command above, then click
                                    Refresh Status!
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="animate-in fade-in zoom-in duration-300">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-[1rem] mb-8 font-medium">
                            <span className="text-xl leading-none">✓</span> Device linked successfully! Step 2: Initialize Storefront.
                        </div>
                        <form
                            onSubmit={async (e) => {
                                e.preventDefault();
                                const target = e.target as typeof e.target & {
                                    shopName: { value: string };
                                    avatarUrl: { value: string };
                                    bannerUrl: { value: string };
                                };
                                const shopName = target.shopName.value;
                                if (shopName.length > 30) {
                                    toast.error("Something went wrong");
                                    return;
                                }
                                try {
                                    const token = document.cookie.replace(
                                        /(?:(?:^|.*;\s*)sb_token\s*\=\s*([^;]*).*$)|^.*$/,
                                        "$1",
                                    );
                                    const res = await fetch(
                                        "/api/enterprise/setup",
                                        {
                                            method: "POST",
                                            headers: {
                                                "Content-Type":
                                                    "application/json",
                                                Authorization: `Bearer ${token}`,
                                            },
                                            body: JSON.stringify({
                                                shopName: shopName,
                                                avatarUrl:
                                                    target.avatarUrl.value,
                                                bannerUrl:
                                                    target.bannerUrl.value,
                                            }),
                                        },
                                    );
                                    const content = await res.text();
                                    let data;
                                    try {
                                        data = JSON.parse(content);
                                    } catch (e) {
                                        throw new Error(
                                            "Network synchronization error: " +
                                            content,
                                        );
                                    }
    
                                    if (data.error) throw new Error(data.error);
                                    toast.success("Done");
                                    window.location.reload();
                                } catch (err: any) {
                                    toast.error("Something went wrong");
                                }
                            }}
                            className="flex flex-col gap-5 text-left"
                        >
                            <div className="space-y-1.5">
                                <Label className="block text-sm font-semibold text-foreground">
                                    STORE NAME{" "}
                                    <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    name="shopName"
                                    required
                                    maxLength={30}
                                    placeholder="Maximum 30 characters"
                                    className="h-12 bg-background/50"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="block text-sm font-semibold text-foreground">
                                    STORE AVATAR URL <span className="text-muted-foreground font-normal">(OPTIONAL)</span>
                                </Label>
                                <Input
                                    name="avatarUrl"
                                    placeholder="https://..."
                                    className="h-12 bg-background/50"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="block text-sm font-semibold text-foreground">
                                    STORE BANNER URL <span className="text-muted-foreground font-normal">(OPTIONAL)</span>
                                </Label>
                                <Input
                                    name="bannerUrl"
                                    placeholder="https://..."
                                    className="h-12 bg-background/50"
                                />
                            </div>
                            <Button
                                type="submit"
                                className="h-12 mt-2 font-bold text-[1.05rem] w-full"
                            >
                                INITIALIZE STOREFRONT
                            </Button>
                        </form>
                    </div>
                )}
            </div>
        );
    }

    if (!enterpriseData || !enterpriseData.shop)
        return (
            <div className="text-red-500 text-center p-20 font-extrabold">
                Store not found. Please log in again.
            </div>
        );

    const existingCategories = Array.from(
        new Set(enterpriseData.shop.products.map((p: any) => p.productName)),
    ) as string[];

    return (
        <div className="pt-32 pb-16 px-4 md:px-12 w-full max-w-[1600px] mx-auto box-border">
            { }
            <div
                className="mobile-stack bg-card bg-cover bg-center rounded-2xl p-8 relative overflow-hidden mb-6 flex justify-between items-center shadow-sm"
                style={{
                    backgroundImage: enterpriseData.shop.bannerUrl
                        ? `url(${enterpriseData.shop.bannerUrl})`
                        : undefined,
                }}
            >
                {enterpriseData.shop.bannerUrl && (
                    <div className="absolute inset-0 bg-background/85 backdrop-blur-sm z-0"></div>
                )}

                <div className="mobile-stack relative z-1 flex items-center gap-6">
                    <Image
                        src={
                            enterpriseData.shop.avatarUrl &&
                                enterpriseData.shop.avatarUrl !==
                                "/default-avatar.png"
                                ? enterpriseData.shop.avatarUrl.startsWith(
                                    "http",
                                )
                                    ? enterpriseData.shop.avatarUrl
                                    : `/${enterpriseData.shop.avatarUrl}`
                                : "/default-avatar.png"
                        }
                        width={80}
                        height={80}
                        unoptimized
                        className="w-20 h-20 rounded-xl object-cover shadow-md border-2 border-border/50"
                        alt="Avatar"
                        onError={(e) => {
                            e.currentTarget.src = "/default-avatar.png";
                        }}
                    />
                    <div>
                        <div className="text-muted-foreground text-[0.7rem] uppercase tracking-widest font-bold mb-1 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-neutral-200 rounded-full"></span>
                            Seller Dashboard
                        </div>
                        <div className="flex items-center gap-2.5">
                            <h1
                                className={`${enterpriseData.shop.storeEffect &&
                                        enterpriseData.shop.storeEffect !== "none"
                                        ? enterpriseData.shop.storeEffect
                                        : undefined
                                    } m-0 text-3xl tracking-tight font-black`}
                                style={{
                                    color:
                                        enterpriseData.shop.storeColor ===
                                            "#ffffff" ||
                                            !enterpriseData.shop.storeColor
                                            ? "var(--text-primary)"
                                            : enterpriseData.shop.storeColor,
                                    textShadow:
                                        !enterpriseData.shop.storeEffect ||
                                            enterpriseData.shop.storeEffect ===
                                            "none"
                                            ? `0 0 10px ${enterpriseData.shop.storeColor === "#ffffff" || !enterpriseData.shop.storeColor ? "var(--text-primary)" : enterpriseData.shop.storeColor}40`
                                            : undefined,
                                }}
                            >
                                {enterpriseData.shop.shopName}
                            </h1>
                            {enterpriseData.shop.isTrusted && (
                                <span
                                    className="flex items-center filter-[drop-shadow(0_0_5px_rgba(59,_130,_246,_0.5))]"
                                    title="Verified Store"
                                >
                                    <svg
                                        width="32"
                                        height="32"
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
                        <p className="text-muted-foreground mt-1 text-sm">
                            Buyers can't see your real name.
                        </p>
                    </div>
                </div>

                <div className="relative z-1 bg-background/60 backdrop-blur-md p-6 rounded-xl text-right shadow-sm border border-border">
                    <span className="text-muted-foreground text-xs font-bold uppercase tracking-wider">
                        Available Balance
                    </span>
                    <div className="text-emerald-500 text-3xl font-black font-mono mt-1">
                        ${(enterpriseData.vendorBalance || 0).toFixed(2)}
                    </div>
                    <Button
                        onClick={handleWithdrawal}
                        disabled={enterpriseData.vendorBalance < 50}
                        className="py-2.5 px-6 font-bold mt-4 w-full rounded-lg"
                    >
                        Withdraw Funds
                    </Button>
                    <div className="text-muted-foreground text-[0.7rem] mt-2 text-center">
                        You need at least $50.00 to withdraw
                    </div>
                </div>
            </div>
            <div className="mobile-stack grid gap-6 grid-cols-1">
                <div className="bg-card rounded-2xl p-8 min-h-[500px] shadow-sm">
                    {/* Overview Tab */}
                    {activeTab === "overview" && (
                        <div className="animation-[fadeIn_0.3s_ease-out]">
                            <h2 className="text-foreground text-2xl font-bold tracking-tight mb-6 mt-0 pl-0">
                                Earnings Overview
                            </h2>
                            <div className="mobile-grid-1 grid gap-4 mb-10 grid-cols-2 lg:grid-cols-4">
                                <div className="bg-background/50 p-5 rounded-xl border border-border shadow-sm transition-all hover:bg-background/80">
                                    <div className="text-muted-foreground text-[0.75rem] uppercase tracking-wider font-bold mb-1">
                                        Money Earned (24h)
                                    </div>
                                    <div className="text-emerald-500 text-2xl font-black font-mono">
                                        $
                                        {enterpriseData.income24h?.toFixed(2) ||
                                            "0.00"}
                                    </div>
                                </div>
                                <div className="bg-background/50 p-5 rounded-xl border border-border shadow-sm transition-all hover:bg-background/80">
                                    <div className="text-muted-foreground text-[0.75rem] uppercase tracking-wider font-bold mb-1">
                                        Income (30 Days)
                                    </div>
                                    <div className="text-emerald-500 text-2xl font-black font-mono">
                                        $
                                        {enterpriseData.income30d?.toFixed(2) ||
                                            "0.00"}
                                    </div>
                                </div>
                                <div className="bg-background/50 p-5 rounded-xl border border-border shadow-sm transition-all hover:bg-background/80">
                                    <div className="text-muted-foreground text-[0.75rem] uppercase tracking-wider font-bold mb-1">
                                        Products Sold
                                    </div>
                                    <div className="text-foreground text-2xl font-black font-mono">
                                        {enterpriseData.totalOrders || 0}
                                    </div>
                                </div>
                                <div className="bg-background/50 p-5 rounded-xl border border-border shadow-sm transition-all hover:bg-background/80">
                                    <div className="text-muted-foreground text-[0.75rem] uppercase tracking-wider font-bold mb-1">
                                        Total Reviews
                                    </div>
                                    <div className="text-foreground text-2xl font-black font-mono">
                                        {enterpriseData.totalReviews || 0}
                                    </div>
                                </div>
                            </div>

                            {/* Store Bidding */}
                            <div className="bg-muted/20 p-6 rounded-xl mb-10 border border-border relative overflow-hidden">
                                <h3 className="text-foreground text-xl font-bold mb-2 flex items-center gap-2 mt-0 pl-0">
                                    <span className="text-indigo-400 flex">
                                        <Zap size={20} />
                                    </span>{" "}
                                    Store Bidding
                                </h3>
                                <p className="text-muted-foreground text-sm mb-4 max-w-2xl">
                                    Pay to show your store at the top of the
                                    market. The money is taken from your store
                                    balance. Product bids can be added in the "Unsold Products" tab.
                                </p>
                                <div className="bg-background/50 border-l-2 border-indigo-500 py-3 px-4 rounded-r-lg text-muted-foreground text-sm mb-6 max-w-2xl">
                                    <strong className="text-foreground">
                                        Note:
                                    </strong>{" "}
                                    Once added, a store bid cannot be canceled and lasts 24 hours.
                                </div>
                                <div className="flex gap-4 items-center flex-wrap">
                                    <div className="bg-background/50 py-3 px-5 rounded-lg border border-border flex flex-col">
                                        <span className="text-muted-foreground text-xs uppercase font-bold mb-1">
                                            Current Store Bid <span className="opacity-50">(24H)</span>
                                        </span>
                                        <strong className="text-foreground text-lg font-mono">
                                            $
                                            {enterpriseData.shop.marketBid?.toFixed(
                                                2,
                                            ) || "0.00"}
                                        </strong>
                                    </div>
                                    <div className="bg-background/50 py-3 px-5 rounded-lg border border-border flex flex-col">
                                        <span className="text-muted-foreground text-xs uppercase font-bold mb-1">
                                            Highest Store Bid
                                        </span>
                                        <strong className="text-foreground text-lg font-mono">
                                            $
                                            {enterpriseData.highestMarketBid?.toFixed(
                                                2,
                                            ) || "0.00"}
                                        </strong>
                                    </div>
                                    <div className="relative ml-2">
                                        <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground font-bold">
                                            $
                                        </span>
                                        <input
                                            type="number"
                                            placeholder="Amount"
                                            value={marketBidAmount}
                                            onChange={(e) =>
                                                setMarketBidAmount(
                                                    e.target.value,
                                                )
                                            }
                                            className="bg-background/50 border border-border/50 text-foreground py-3 pr-4 pl-8 rounded-lg w-32 outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                        />
                                    </div>
                                    <button
                                        onClick={submitShopBid}
                                        disabled={bidLoading}
                                        className={cn(
                                            "bg-primary text-primary-foreground border-0 py-3 px-6 rounded-lg font-bold transition-all shadow-sm active:scale-95 ml-2",
                                            bidLoading
                                                ? "opacity-70 cursor-not-allowed"
                                                : "hover:bg-primary/90",
                                        )}
                                    >
                                        {bidLoading ? "Working..." : "Add Bid"}
                                    </button>
                                </div>
                            </div>

                            {/* Products Bidding */}
                            <div className="bg-muted/20 p-6 rounded-xl mb-10 border border-border relative overflow-hidden">
                                <h3 className="text-foreground text-xl font-bold mb-2 flex items-center gap-2 mt-0 pl-0">
                                    <span className="text-emerald-400 flex">
                                        <Package size={20} />
                                    </span>{" "}
                                    Products Bidding
                                </h3>
                                <p className="text-muted-foreground text-sm mb-6 max-w-2xl">
                                    Set a bid on a specific account category (e.g. POF, edate). A bid will be applied to <strong>up to 10</strong> unsold accounts of that type, boosting their visibility in search results. Setting a new category bid will replace any existing product bids to enforce the 10 account maximum limit.
                                </p>
                                
                                {(() => {
                                    if (!enterpriseData?.shop?.products) return null;
                                    
                                    // Compute metrics per category
                                    const categories = new Map<string, {
                                        stock: number,
                                        biddedCount: number,
                                        currentBid: number
                                    }>();
                                    
                                    enterpriseData.shop.products.forEach((p: any) => {
                                        if (p.stock > 0) {
                                            const cat = p.productName;
                                            if (!categories.has(cat)) {
                                                categories.set(cat, { stock: 0, biddedCount: 0, currentBid: 0 });
                                            }
                                            const data = categories.get(cat)!;
                                            data.stock += p.stock;
                                            if (p.marketBid > 0) {
                                                data.biddedCount++;
                                                data.currentBid = Math.max(data.currentBid, p.marketBid);
                                            }
                                        }
                                    });

                                    const sortedCategories = Array.from(categories.entries()).sort((a, b) => b[1].stock - a[1].stock);

                                    if (sortedCategories.length === 0) {
                                        return (
                                            <div className="bg-background/50 p-6 text-center rounded-xl border border-border text-muted-foreground italic">
                                                You have no available stock to bid on. Upload some products first.
                                            </div>
                                        );
                                    }

                                    return (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse min-w-[600px]">
                                                <thead>
                                                    <tr className="border-b border-border/50 text-muted-foreground text-xs uppercase tracking-wider">
                                                        <th className="pb-3 font-bold pl-2">Account Type</th>
                                                        <th className="pb-3 font-bold text-center">Available Stock</th>
                                                        <th className="pb-3 font-bold text-center">Currently Bidded</th>
                                                        <th className="pb-3 font-bold">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-border/20">
                                                    {sortedCategories.map(([category, data]) => (
                                                        <tr key={category} className="hover:bg-background/30 transition-colors">
                                                            <td className="py-4 pl-2 font-bold text-foreground">
                                                                {category}
                                                            </td>
                                                            <td className="py-4 text-center">
                                                                <span className="bg-background/50 py-1 px-3 rounded-full font-mono font-bold text-emerald-500 border border-emerald-500/20">
                                                                    {data.stock}
                                                                </span>
                                                            </td>
                                                            <td className="py-4 text-center">
                                                                <span className={cn(
                                                                    "py-1 px-3 rounded-full font-mono font-bold text-sm",
                                                                    data.biddedCount > 0 ? "text-indigo-400 bg-indigo-400/10 border border-indigo-400/20" : "text-muted-foreground bg-background/50 border border-border/50"
                                                                )}>
                                                                    {data.biddedCount} / 10
                                                                    {data.currentBid > 0 && ` ($${data.currentBid.toFixed(2)})`}
                                                                </span>
                                                            </td>
                                                            <td className="py-4">
                                                                <div className="flex gap-2 items-center">
                                                                    <div className="relative">
                                                                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground font-bold text-xs">$</span>
                                                                        <input
                                                                            type="number"
                                                                            placeholder="Amount"
                                                                            value={categoryBidAmounts[category] || ""}
                                                                            onChange={(e) => setCategoryBidAmounts({...categoryBidAmounts, [category]: e.target.value})}
                                                                            className="bg-background/50 border border-border/50 text-foreground py-2 pr-3 pl-6 rounded-lg w-28 text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                                        />
                                                                    </div>
                                                                    <button
                                                                        onClick={async () => {
                                                                            const amt = categoryBidAmounts[category];
                                                                            if (!amt || isNaN(parseFloat(amt))) {
                                                                                toast.error("Enter a valid bid amount");
                                                                                return;
                                                                            }
                                                                            setCategoryBidLoading(category);
                                                                            try {
                                                                                const token = document.cookie.replace(/(?:(?:^|.*;\s*)sb_token\s*\=\s*([^;]*).*$)|^.*$/, "$1");
                                                                                const res = await fetch("/api/enterprise/category-bid", {
                                                                                    method: "POST",
                                                                                    headers: {
                                                                                        "Content-Type": "application/json",
                                                                                        Authorization: `Bearer ${token}`
                                                                                    },
                                                                                    body: JSON.stringify({
                                                                                        productName: category,
                                                                                        amount: amt
                                                                                    })
                                                                                });
                                                                                const data = await res.json();
                                                                                if (!res.ok) throw new Error(data.error || "Failed to set bid");
                                                                                toast.success(data.message || "Category bid applied successfully");
                                                                                setCategoryBidAmounts({...categoryBidAmounts, [category]: ""});
                                                                                setTimeout(() => window.location.reload(), 1500);
                                                                            } catch (err: any) {
                                                                                toast.error(err.message);
                                                                            } finally {
                                                                                setCategoryBidLoading(null);
                                                                            }
                                                                        }}
                                                                        disabled={categoryBidLoading === category}
                                                                        className={cn(
                                                                            "bg-primary text-primary-foreground border-0 py-2 px-4 rounded-lg font-bold text-sm transition-all shadow-sm active:scale-95",
                                                                            categoryBidLoading === category ? "opacity-70 cursor-not-allowed" : "hover:bg-primary/90"
                                                                        )}
                                                                    >
                                                                        {categoryBidLoading === category ? "Applying..." : "Apply Bid"}
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                })()}
                            </div>

                            {/* Top 10 Earning Stores */}
                            <div className="bg-muted/20 p-6 rounded-xl border border-border">
                                <h3 className="text-foreground text-xl font-bold mb-4 flex items-center gap-2 mt-0 pl-0">
                                    <span className="text-yellow-500 flex">
                                        <Trophy size={20} />
                                    </span>{" "}
                                    Top 10 Earning Stores
                                </h3>
                                <div className="flex flex-col gap-2">
                                    {enterpriseData.topStores?.map(
                                        (store: any, idx: number) => {
                                            let rankColor =
                                                "var(--text-primary)";
                                            let rankLabel = `#${idx + 1}`;
                                            if (idx === 0)
                                                rankColor = "#eab308"; // Gold
                                            else if (idx === 1)
                                                rankColor = "#94a3b8"; // Silver
                                            else if (idx === 2)
                                                rankColor = "#ca8a04"; // Bronze

                                            return (
                                                <div
                                                    key={idx}
                                                    className="flex justify-between items-center bg-(--bg-tertiary) py-4 px-6 rounded-lg"
                                                    style={{
                                                        border: `1px solid ${idx < 3 ? rankColor + "40" : "#27272a"}`,
                                                        boxShadow:
                                                            idx < 3
                                                                ? `0 0 10px ${rankColor}20`
                                                                : "none",
                                                    }}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <span
                                                            className="font-black text-[1.2rem] font-mono min-w-8.75"
                                                            style={{
                                                                color: rankColor,
                                                            }}
                                                        >
                                                            {rankLabel}
                                                        </span>
                                                        <div>
                                                            <div className="text-(--text-primary) font-extrabold text-[1.1rem]">
                                                                {
                                                                    store.storeName
                                                                }
                                                            </div>
                                                            <div className="text-slate-400 text-[0.8rem]">
                                                                @
                                                                {store.username}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-emerald-500 font-black text-[1.2rem] font-mono">
                                                        $
                                                        {(store.totalEarnings ?? store.vendorBalance).toFixed(
                                                            2,
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        },
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    { }
                    {activeTab === "store_reviews" && (
                        <div className="animation-[fadeIn_0.3s_ease-out]">
                            <h2 className="text-(--text-primary) text-[1.8rem] mt-0 mr-0 mb-8 pl-0">
                                Store Reviews
                            </h2>
                            <div className="flex flex-col gap-4">
                                {!enterpriseData.reviews ||
                                    enterpriseData.reviews.length === 0 ? (
                                    <div className="text-muted-foreground italic p-12 text-center bg-card rounded-2xl border border-border shadow-sm">
                                        No reviews received yet.
                                    </div>
                                ) : (
                                    <>
                                        {enterpriseData.reviews
                                            .slice(
                                                (reviewsPage - 1) * 5,
                                                reviewsPage * 5,
                                            )
                                            .map((r: any, idx: number) => (
                                                <div
                                                    key={r.createdAt + idx}
                                                    className="bg-card border border-border p-6 rounded-2xl shadow-sm flex justify-between items-center"
                                                >
                                                    <div>
                                                        <div className="text-yellow-500 font-black tracking-[1px] text-[1.2rem] flex gap-0.5">
                                                            {Array(r.score)
                                                                .fill(0)
                                                                .map((_, i) => (
                                                                    <Star
                                                                        key={i}
                                                                        size={
                                                                            18
                                                                        }
                                                                        fill="currentColor"
                                                                    />
                                                                ))}
                                                        </div>
                                                        <div className="text-muted-foreground text-sm mt-2">
                                                            Reviewer:{" "}
                                                            <span className="text-foreground font-extrabold">
                                                                {r.reviewer}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="text-muted-foreground text-xs font-medium">
                                                        {new Date(
                                                            r.createdAt,
                                                        ).toLocaleString()}
                                                    </div>
                                                </div>
                                            ))}
                                        {enterpriseData.reviews.length > 5 && (
                                            <div className="flex justify-between items-center mt-4">
                                                <button
                                                    disabled={reviewsPage === 1}
                                                    onClick={() =>
                                                        setReviewsPage(
                                                            (p) => p - 1,
                                                        )
                                                    }
                                                    className={cn(
                                                        "bg-(--bg-tertiary) text-(--text-primary) py-2 px-4 rounded border-0 font-extrabold",
                                                        reviewsPage === 1
                                                            ? "cursor-not-allowed"
                                                            : "cursor-pointer",
                                                    )}
                                                >
                                                    Previous
                                                </button>
                                                <span className="text-slate-400 text-[0.9rem] font-extrabold">
                                                    Page {reviewsPage} of{" "}
                                                    {Math.ceil(
                                                        enterpriseData.reviews
                                                            .length / 5,
                                                    )}
                                                </span>
                                                <button
                                                    disabled={
                                                        reviewsPage >=
                                                        Math.ceil(
                                                            enterpriseData
                                                                .reviews
                                                                .length / 5,
                                                        )
                                                    }
                                                    onClick={() =>
                                                        setReviewsPage(
                                                            (p) => p + 1,
                                                        )
                                                    }
                                                    className={cn(
                                                        "bg-(--bg-tertiary) text-(--text-primary) py-2 px-4 rounded border-0 font-extrabold",
                                                        reviewsPage >=
                                                            Math.ceil(
                                                                enterpriseData
                                                                    .reviews
                                                                    .length / 5,
                                                            )
                                                            ? "cursor-not-allowed"
                                                            : "cursor-pointer",
                                                    )}
                                                >
                                                    Next
                                                </button>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    { }
                    {activeTab === "sold_products" && (
                        <div className="animation-[fadeIn_0.3s_ease-out]">
                            <h2 className="text-foreground text-2xl font-bold tracking-tight mb-6 mt-0 pl-0">
                                Sold Products
                            </h2>
                            {!enterpriseData.recentSales ||
                                enterpriseData.recentSales.length === 0 ? (
                                <div className="text-muted-foreground italic p-12 text-center bg-card rounded-2xl border border-border shadow-sm">
                                    No items sold yet.
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    {enterpriseData.recentSales
                                        .slice(
                                            (salesPage - 1) * 5,
                                            salesPage * 5,
                                        )
                                        .map((sale: any) => (
                                            <div
                                                key={sale.id}
                                                className="bg-card border border-border p-6 rounded-2xl flex justify-between items-center shadow-sm"
                                            >
                                                <div>
                                                    <div className="text-foreground font-bold text-[1.1rem] mb-[0.4rem]">
                                                        {sale.productName}
                                                    </div>
                                                    <div className="text-muted-foreground text-sm">
                                                        Order ID:{" "}
                                                        <span className="font-mono text-foreground/80">
                                                            {sale.id.substring(
                                                                0,
                                                                8,
                                                            )}
                                                        </span>{" "}
                                                        • Buyer:{" "}
                                                        <span className="text-foreground font-extrabold">
                                                            {sale.buyerName}
                                                        </span>
                                                    </div>
                                                    <div className="text-muted-foreground text-xs mt-2 font-medium">
                                                        {new Date(
                                                            sale.createdAt,
                                                        ).toLocaleString()}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    {sale.isRefunded ? (
                                                        <div className="text-red-500 font-semibold font-mono flex flex-col items-end">
                                                            <span className="line-through opacity-50 text-[1.1rem]">
                                                                +${sale.vendorCut.toFixed(2)}
                                                            </span>
                                                            <span className="bg-red-500/10 text-red-500 text-[0.7rem] py-1 px-2.5 rounded font-extrabold uppercase tracking-widest mt-1.5 border border-red-500/20">
                                                                Refunded
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className="text-emerald-500 font-bold text-[1.4rem] font-mono">
                                                            +${sale.vendorCut.toFixed(2)}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    {enterpriseData.recentSales.length > 5 && (
                                        <div className="flex justify-between items-center mt-4">
                                            <button
                                                disabled={salesPage === 1}
                                                onClick={() =>
                                                    setSalesPage((p) => p - 1)
                                                }
                                                className={cn(
                                                    "bg-(--bg-tertiary) text-(--text-primary) py-2 px-4 rounded border-0 font-extrabold",
                                                    salesPage === 1
                                                        ? "cursor-not-allowed"
                                                        : "cursor-pointer",
                                                )}
                                            >
                                                Previous
                                            </button>
                                            <span className="text-slate-400 text-[0.9rem] font-extrabold">
                                                Page {salesPage} of{" "}
                                                {Math.ceil(
                                                    enterpriseData.recentSales
                                                        .length / 5,
                                                )}
                                            </span>
                                            <button
                                                disabled={
                                                    salesPage >=
                                                    Math.ceil(
                                                        enterpriseData
                                                            .recentSales
                                                            .length / 5,
                                                    )
                                                }
                                                onClick={() =>
                                                    setSalesPage((p) => p + 1)
                                                }
                                                className={cn(
                                                    "bg-(--bg-tertiary) text-(--text-primary) py-2 px-4 rounded border-0 font-extrabold",
                                                    salesPage >=
                                                        Math.ceil(
                                                            enterpriseData
                                                                .recentSales
                                                                .length / 5,
                                                        )
                                                        ? "cursor-not-allowed"
                                                        : "cursor-pointer",
                                                )}
                                            >
                                                Next
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    { }
                    {activeTab === "payment_history" && (
                        <div className="animation-[fadeIn_0.3s_ease-out]">
                            <h2 className="text-foreground text-2xl font-bold tracking-tight mb-6 mt-0 pl-0">
                                Payment History & Withdrawals
                            </h2>
                            {withdrawalsData.length === 0 ? (
                                <div className="text-muted-foreground italic p-12 text-center bg-card rounded-2xl border border-border shadow-sm">
                                    No withdrawals initiated yet.
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    {withdrawalsData.map((wd: any) => (
                                        <div
                                            key={wd.id}
                                            className="bg-card border border-border p-6 rounded-2xl flex justify-between items-center shadow-sm"
                                        >
                                            <div>
                                                <div className="text-foreground font-bold text-[1.1rem] mb-[0.4rem] uppercase tracking-wider">
                                                    {wd.network} WITHDRAWAL
                                                </div>
                                                <div className="text-muted-foreground text-sm">
                                                    Target Address:{" "}
                                                    <span className="font-mono text-foreground/80">
                                                        {wd.cryptoAddress}
                                                    </span>
                                                </div>
                                                <div className="text-muted-foreground text-xs mt-2 font-medium">
                                                    Requested:{" "}
                                                    {new Date(
                                                        wd.createdAt,
                                                    ).toLocaleString()}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div
                                                    className={cn(
                                                        "font-bold text-[0.9rem] mb-2 tracking-[1px] uppercase",
                                                        wd.status === "SENT"
                                                            ? "text-emerald-500"
                                                            : wd.status ===
                                                                "REJECTED"
                                                                ? "text-red-500"
                                                                : "text-yellow-500",
                                                    )}
                                                >
                                                    [{wd.status}]
                                                </div>
                                                <div className="text-foreground text-[1.2rem] font-bold font-mono">
                                                    ${wd.amount.toFixed(2)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {(activeTab === "admin_panel" ||
                        activeTab === "global_disputes" ||
                        activeTab === "support_tickets") &&
                        viewerCode?.rank !== "ADMIN" && (
                            <div>Unauthorized.</div>
                        )}

                    {/* Separation logic block */}
                    {activeTab === "admin_panel" &&
                        viewerCode?.rank === "ADMIN" && (
                            <div className="animation-[fadeIn_0.3s_ease-out]">
                                <h2 className="text-red-500 text-2xl font-bold tracking-tight mb-6 mt-0 pl-0 uppercase">
                                    Admin Control Center
                                </h2>
                                <div className="bg-card border border-red-500/30 p-8 rounded-2xl shadow-sm">
                                    <div className="text-foreground font-bold mb-3 text-lg">
                                        This panel has moved.
                                    </div>
                                    <div className="text-muted-foreground text-[0.95rem] leading-[1.6] mb-8">
                                        The full administration interface now
                                        lives in the dedicated admin dashboard
                                        so navigation, permissions, and
                                        moderation tools stay in one place.
                                    </div>
                                    <button
                                        onClick={() =>
                                            router.push("/admin/dashboard")
                                        }
                                        className="bg-red-500 hover:bg-red-600 text-white border-0 py-3 px-6 rounded-xl cursor-pointer font-bold w-full uppercase tracking-wider transition-colors shadow-sm"
                                    >
                                        Open Admin Dashboard
                                    </button>
                                </div>
                            </div>
                        )}

                    {activeTab === "global_disputes" &&
                        viewerCode?.rank === "ADMIN" && (
                            <div className="animation-[fadeIn_0.3s_ease-out]">
                                <h2 className="text-red-500 text-[1.8rem] mt-0 mr-0 mb-8 pl-0 uppercase tracking-[1px]">
                                    Global Market Disputes
                                </h2>
                                {!enterpriseData.globalDisputes ||
                                    enterpriseData.globalDisputes.filter(
                                        (d: any) => d.status === "OPEN",
                                    ).length === 0 ? (
                                    <div className="text-(--text-secondary) italic p-4 bg-(--bg-secondary) rounded-lg">
                                        No active disputes globally.
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-4">
                                        {enterpriseData.globalDisputes
                                            .filter(
                                                (d: any) => d.status === "OPEN",
                                            )
                                            .map((d: any) => (
                                                <div
                                                    key={d.id}
                                                    className="bg-(--bg-secondary) border border-red-500 p-6 rounded-lg"
                                                >
                                                    <div className="flex justify-between items-center mb-4">
                                                        <div className="text-(--text-primary) font-semibold">
                                                            Dispute #
                                                            {d.orderId.substring(
                                                                0,
                                                                8,
                                                            )}
                                                        </div>
                                                        <div className="text-yellow-500 bg-[rgba(234,179,8,0.1)] py-1.25 px-2.5 rounded text-[0.8rem] font-semibold">
                                                            PENDING
                                                        </div>
                                                    </div>
                                                    <div className="text-[0.9rem] text-(--text-muted) mb-6">
                                                        <div className="mb-1.25">
                                                            <span className="text-(--text-primary)">
                                                                Buyer:
                                                            </span>{" "}
                                                            {d.buyerName}
                                                        </div>
                                                        <div>
                                                            <span className="text-(--text-primary)">
                                                                Vendor:
                                                            </span>{" "}
                                                            {d.vendorName}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() =>
                                                            router.push(
                                                                `/disputes/${d.orderId}`,
                                                            )
                                                        }
                                                        className="bg-red-500 text-(--text-primary) border-0 py-[0.8rem] px-4 rounded cursor-pointer font-semibold w-full uppercase tracking-[1px]"
                                                    >
                                                        MODERATE DISPUTE
                                                    </button>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        )}

                    { }
                    {activeTab === "dispute_history" &&
                        viewerCode?.rank === "ADMIN" && (
                            <div className="animation-[fadeIn_0.3s_ease-out]">
                                <h2 className="text-emerald-500 text-[1.8rem] mt-0 mr-0 mb-8 pl-0 uppercase tracking-[1px]">
                                    Disputes History
                                </h2>
                                {!enterpriseData.globalDisputes ||
                                    enterpriseData.globalDisputes.filter(
                                        (d: any) => d.status !== "OPEN",
                                    ).length === 0 ? (
                                    <div className="text-(--text-secondary) italic p-4 bg-(--bg-secondary) rounded-lg">
                                        No resolved disputes in history.
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-4">
                                        {enterpriseData.globalDisputes
                                            .filter(
                                                (d: any) => d.status !== "OPEN",
                                            )
                                            .map((d: any) => {
                                                const colorStatus =
                                                    d.status ===
                                                        "REFUND_APPROVED"
                                                        ? "#ef4444"
                                                        : "#10b981";
                                                const bgStatus =
                                                    d.status ===
                                                        "REFUND_APPROVED"
                                                        ? "rgba(239,68,68,0.1)"
                                                        : "rgba(16,185,129,0.1)";
                                                return (
                                                    <div
                                                        key={d.id}
                                                        className="bg-(--bg-secondary) border border-zinc-800 p-6 rounded-lg"
                                                    >
                                                        <div className="flex justify-between items-center mb-4">
                                                            <div className="text-(--text-primary) font-semibold">
                                                                Dispute #
                                                                {d.orderId.substring(
                                                                    0,
                                                                    8,
                                                                )}
                                                            </div>
                                                            <div
                                                                className="py-1.25 px-2.5 rounded text-[0.8rem] font-semibold"
                                                                style={{
                                                                    color: colorStatus,
                                                                    background:
                                                                        bgStatus,
                                                                }}
                                                            >
                                                                {d.status ===
                                                                    "REFUND_APPROVED"
                                                                    ? "CLOSED - REFUNDED"
                                                                    : "CLOSED - REJECTED"}
                                                            </div>
                                                        </div>
                                                        <div className="text-[0.9rem] text-(--text-muted) mb-6">
                                                            <div className="mb-1.25">
                                                                <span className="text-(--text-primary)">
                                                                    Buyer:
                                                                </span>{" "}
                                                                {d.buyerName}
                                                            </div>
                                                            <div
                                                                className={cn(
                                                                    d.resolvedByName
                                                                        ? "mb-1.25"
                                                                        : "mb-0",
                                                                )}
                                                            >
                                                                <span className="text-(--text-primary)">
                                                                    Vendor:
                                                                </span>{" "}
                                                                {d.vendorName}
                                                            </div>
                                                            {d.resolvedByName && (
                                                                <div
                                                                    className="font-semibold"
                                                                    style={{
                                                                        color: colorStatus,
                                                                    }}
                                                                >
                                                                    <span className="text-(--text-primary) font-normal">
                                                                        Arbitrated
                                                                        By:
                                                                    </span>{" "}
                                                                    {
                                                                        d.resolvedByName
                                                                    }
                                                                </div>
                                                            )}
                                                        </div>
                                                        <button
                                                            onClick={() =>
                                                                router.push(
                                                                    `/disputes/${d.orderId}`,
                                                                )
                                                            }
                                                            className="bg-(--text-primary) text-(--bg-primary) border-0 py-[0.8rem] px-4 rounded cursor-pointer font-semibold w-full uppercase tracking-[1px]"
                                                        >
                                                            VIEW DISPUTE HISTORY
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                )}
                            </div>
                        )}

                    { }
                    {activeTab === "disputes" && (
                        <div className="animation-[fadeIn_0.3s_ease-out]">
                            <h2 className="text-(--text-primary) text-[1.8rem] mt-0 mr-0 mb-8 pl-0 uppercase tracking-[1px]">
                                Action Required: Disputes
                            </h2>
                            {!enterpriseData.disputes ||
                                enterpriseData.disputes.length === 0 ? (
                                <div className="text-muted-foreground italic p-12 text-center bg-card rounded-2xl border border-border shadow-sm">
                                    No active disputes. Your buyers are
                                    satisfied!
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    {enterpriseData.disputes.map((d: any) => (
                                        <div
                                            key={d.id}
                                            className="bg-card border border-border p-6 rounded-2xl shadow-sm flex flex-col gap-4"
                                        >
                                            <div className="flex justify-between items-center">
                                                <div className="text-foreground font-bold text-[1.1rem]">
                                                    Dispute #
                                                    <span className="font-mono text-foreground/80 ml-1">{d.orderId.substring(0, 8)}</span>
                                                </div>
                                                <div
                                                    className={cn(
                                                        "text-[0.7rem] py-1 px-2.5 rounded font-extrabold uppercase tracking-widest border",
                                                        d.status ===
                                                            "REFUND_APPROVED"
                                                            ? "bg-red-500/10 text-red-500 border-red-500/20"
                                                            : d.status ===
                                                                "REFUND_REJECTED"
                                                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                                                : "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
                                                    )}
                                                >
                                                    {d.status === "OPEN"
                                                        ? "PENDING"
                                                        : d.status ===
                                                            "REFUND_APPROVED"
                                                            ? "CLOSED - REFUNDED"
                                                            : "CLOSED - NOT REFUNDED"}
                                                </div>
                                            </div>
                                            <div className="text-muted-foreground text-sm">
                                                Buyer:{" "}
                                                <span className="text-foreground font-extrabold">
                                                    {d.buyerName}
                                                </span>{" "}
                                                • Opened:{" "}
                                                <span className="font-medium">
                                                    {new Date(
                                                        d.createdAt,
                                                    ).toLocaleString()}
                                                </span>
                                            </div>

                                            <button
                                                onClick={() =>
                                                    router.push(
                                                        `/disputes/${d.orderId}`,
                                                    )
                                                }
                                                className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 py-3 px-4 rounded-xl cursor-pointer font-bold w-full uppercase tracking-wider transition-all shadow-sm mt-2"
                                            >
                                                VIEW DISPUTE
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    { }
                    {activeTab === "add_product" && (
                        <div className="animation-[fadeIn_0.3s_ease-out]">
                            <h2 className="text-foreground text-2xl font-bold tracking-tight mb-8 mt-0 pl-0">
                                Add New Product (Bulk)
                            </h2>

                            <div className="mobile-grid-1 grid gap-8 grid-cols-1">
                                <div className="bg-card rounded-2xl p-8 border border-border shadow-sm relative overflow-visible">
                                    <div className="text-foreground text-xl font-bold mb-6 flex items-center gap-3">
                                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 text-sm">1</span>
                                        Select Target Category
                                    </div>
                                    <label className="block text-muted-foreground text-xs uppercase font-bold tracking-wider mb-2">
                                        TARGET SITE
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Type new target (e.g. Netflix, PayPal) or click below to select..."
                                        value={targetCategory}
                                        onChange={(e) =>
                                            setTargetCategory(e.target.value)
                                        }
                                        className="w-full bg-background/50 border border-border/50 text-foreground py-4 px-5 rounded-xl text-base mb-6 outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm"
                                    />

                                    {existingCategories.length > 0 && (
                                        <div className="flex gap-2 flex-wrap">
                                            {existingCategories.map((cat) => (
                                                <span
                                                    key={cat}
                                                    onClick={() =>
                                                        setTargetCategory(cat)
                                                    }
                                                    className="bg-primary/10 text-primary border border-primary/20 py-2 px-5 rounded-full text-sm font-bold cursor-pointer hover:bg-primary/20 hover:scale-105 transition-all shadow-sm"
                                                >
                                                    {cat}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div
                                    className={cn(
                                        "bg-card rounded-2xl p-8 border border-border shadow-sm relative overflow-visible transition-all duration-300",
                                        targetCategory
                                            ? "opacity-100 translate-y-0"
                                            : "opacity-40 translate-y-2",
                                        targetCategory
                                            ? "pointer-events-auto"
                                            : "pointer-events-none",
                                    )}
                                >
                                    <div className="text-foreground text-xl font-bold mb-6 flex items-center gap-3">
                                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 text-sm">2</span>
                                        Product Details & Upload
                                    </div>

                                    <div className="mobile-grid-1 grid gap-8 items-start grid-cols-[1fr_2fr]">
                                        <div>
                                            <label className="block text-muted-foreground text-xs uppercase font-bold tracking-wider mb-2">
                                                COUNTRY
                                            </label>
                                            <div className="mb-6">
                                                <CountrySelector
                                                    value={newProduct.country}
                                                    onChange={(val) =>
                                                        setNewProduct({
                                                            ...newProduct,
                                                            country: val,
                                                        })
                                                    }
                                                />
                                            </div>

                                            <label className="block text-muted-foreground text-xs uppercase font-bold tracking-wider mb-2">
                                                PRICE (BULLETS)
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
                                                    $
                                                </span>
                                                <input
                                                    type="number"
                                                    placeholder="50"
                                                    value={newProduct.price}
                                                    onChange={(e) =>
                                                        setNewProduct({
                                                            ...newProduct,
                                                            price: e.target.value,
                                                        })
                                                    }
                                                    className="w-full bg-background/50 border border-border/50 text-foreground py-4 pr-4 pl-8 rounded-xl text-lg font-mono outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                />
                                            </div>
                                            {newProduct.price && !isNaN(parseInt(newProduct.price)) && (
                                                <div className="text-emerald-500 text-sm mt-2 font-bold opacity-80 pl-2">
                                                    You will earn ${(parseInt(newProduct.price) * getSplitRate()).toFixed(2)} after platform fee.
                                                </div>
                                            )}

                                            <label className="block text-muted-foreground text-xs uppercase font-bold tracking-wider mt-6 mb-2">
                                                INFO / DESCRIPTION
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Full Access | Valid | No bans"
                                                value={newProduct.info}
                                                onChange={(e) =>
                                                    setNewProduct({
                                                        ...newProduct,
                                                        info: e.target.value,
                                                    })
                                                }
                                                className="w-full bg-background/50 border border-border/50 text-foreground py-4 px-5 rounded-xl text-[0.95rem] outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-muted-foreground text-xs uppercase font-bold tracking-wider mb-2">
                                                UPLOAD LOGS (.TXT FILE)
                                            </label>
                                            <div className="bg-background/40 border-2 border-dashed border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all rounded-xl p-10 text-center relative flex flex-col items-center justify-center min-h-[160px] shadow-sm">
                                                <input
                                                    type="file"
                                                    accept=".txt"
                                                    onChange={(e) => {
                                                        const file =
                                                            e.target.files?.[0];
                                                        if (file) {
                                                            const r =
                                                                new FileReader();
                                                            r.onload = (evt) =>
                                                                setNewProduct(
                                                                    (prev) => ({
                                                                        ...prev,
                                                                        log: evt
                                                                            .target
                                                                            ?.result as string,
                                                                    }),
                                                                );
                                                            r.readAsText(file);
                                                        }
                                                    }}
                                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                />
                                                <svg className="w-10 h-10 text-muted-foreground mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
                                                <div className="text-foreground font-bold text-lg mb-2">
                                                    Drop .txt file here
                                                </div>
                                                <div className="text-muted-foreground text-sm font-medium">
                                                    Format needed: Email:PASS |
                                                    Age | Balance | Gender
                                                </div>
                                                {newProduct.log && (
                                                    <div className="absolute inset-0 bg-emerald-500/10 backdrop-blur-sm rounded-xl flex items-center justify-center border-2 border-emerald-500/50">
                                                        <div className="text-emerald-500 font-bold flex items-center gap-2 bg-background p-4 rounded-xl shadow-lg border border-border/50">
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                                                            File Uploaded ({newProduct.log.length} bytes matched)
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={submitProduct}
                                        disabled={
                                            !targetCategory ||
                                            !newProduct.price ||
                                            !newProduct.log
                                        }
                                        className={cn(
                                            "w-full border-0 py-4 px-6 rounded-xl font-black text-lg mt-8 tracking-widest transition-all duration-200 shadow-md",
                                            !targetCategory ||
                                                !newProduct.price ||
                                                !newProduct.log
                                                ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                                                : "bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer hover:shadow-lg active:scale-95",
                                        )}
                                    >
                                        UPLOAD PRODUCT
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    { }
                    {activeTab === "add_single" && (
                        <div className="animation-[fadeIn_0.3s_ease-out]">
                            <h2 className="text-foreground text-2xl font-bold tracking-tight mb-8 mt-0 pl-0">
                                Add Single Asset
                            </h2>

                            <div className="bg-card rounded-2xl p-8 border border-border shadow-sm relative overflow-visible grid gap-8 grid-cols-1">
                                <div className="text-foreground text-xl font-bold mb-2 flex items-center gap-3">
                                    <span className="flex items-center justify-center w-8 h-8 rounded-full bg-violet-500/20 text-violet-400 text-sm">✦</span>
                                    Asset Configuration
                                </div>
                                <div className="mobile-grid-1 grid gap-6 grid-cols-2">
                                    <div>
                                        <label className="block text-muted-foreground text-xs uppercase font-bold tracking-wider mb-2">
                                            PRODUCT NAME / IDENTIFIER
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. Ultra Premium Account"
                                            value={singleProduct.name}
                                            onChange={(e) =>
                                                setSingleProduct({
                                                    ...singleProduct,
                                                    name: e.target.value,
                                                })
                                            }
                                            className="w-full bg-background/50 border border-border/50 text-foreground py-4 px-5 rounded-xl text-base outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-muted-foreground text-xs uppercase font-bold tracking-wider mb-2">
                                            PRICE (BULLETS)
                                        </label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
                                                $
                                            </span>
                                            <input
                                                type="number"
                                                placeholder="50"
                                                value={singleProduct.price}
                                                onChange={(e) =>
                                                    setSingleProduct({
                                                        ...singleProduct,
                                                        price: e.target.value,
                                                    })
                                                }
                                                className="w-full bg-background/50 border border-border/50 text-foreground py-4 pr-4 pl-8 rounded-xl text-lg font-mono outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                            />
                                        </div>
                                        {singleProduct.price && !isNaN(parseInt(singleProduct.price)) && (
                                            <div className="text-emerald-500 text-[0.8rem] mt-2 font-bold opacity-80 pl-2">
                                                You will earn ${(parseInt(singleProduct.price) * getSplitRate()).toFixed(2)}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-muted-foreground text-xs uppercase font-bold tracking-wider mb-2">
                                        PRODUCT INFO / DESCRIPTION
                                    </label>
                                    <textarea
                                        placeholder="Write a short engaging description..."
                                        value={singleProduct.info}
                                        onChange={(e) =>
                                            setSingleProduct({
                                                ...singleProduct,
                                                info: e.target.value,
                                            })
                                        }
                                        className="w-full bg-background/50 border border-border/50 text-foreground py-4 px-5 rounded-xl text-[0.95rem] min-h-[120px] outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm resize-y"
                                    />
                                </div>

                                <div>
                                    <label className="block text-muted-foreground text-xs uppercase font-bold tracking-wider mb-2">
                                        CREDENTIALS PAYLOAD (ONE LINE)
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Email:Password | Token | Data"
                                        value={singleProduct.log}
                                        onChange={(e) =>
                                            setSingleProduct({
                                                ...singleProduct,
                                                log: e.target.value,
                                            })
                                        }
                                        className="w-full bg-background/40 border-2 border-dashed border-border/50 text-foreground py-4 px-5 rounded-xl text-base font-mono outline-none focus:border-primary/50 focus:bg-primary/5 transition-all shadow-sm"
                                    />
                                </div>

                                <div className="mobile-grid-1 grid gap-6 grid-cols-2">
                                    <div>
                                        <label className="block text-muted-foreground text-xs uppercase font-bold tracking-wider mb-2">
                                            CATEGORY
                                        </label>
                                        <input
                                            type="text"
                                            placeholder="e.g. ACCOUNT, GAME, KEY"
                                            value={singleProduct.category}
                                            onChange={(e) =>
                                                setSingleProduct({
                                                    ...singleProduct,
                                                    category:
                                                        e.target.value.toUpperCase(),
                                                })
                                            }
                                            className="w-full bg-background/50 border border-border/50 text-foreground py-4 px-5 rounded-xl text-[0.95rem] outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-muted-foreground text-xs uppercase font-bold tracking-wider mb-2">
                                            ORIGIN CONFIGURATION
                                        </label>
                                        <div className="mb-2">
                                            <CountrySelector
                                                value={singleProduct.country}
                                                onChange={(val) =>
                                                    setSingleProduct({
                                                        ...singleProduct,
                                                        country: val,
                                                    })
                                                }
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={submitSingleProduct}
                                    disabled={
                                        !singleProduct.name ||
                                        !singleProduct.info ||
                                        !singleProduct.price ||
                                        !singleProduct.log
                                    }
                                    className={cn(
                                        "w-full border-0 py-4 px-6 rounded-xl font-black text-lg mt-4 tracking-widest transition-all duration-200 shadow-md",
                                        !singleProduct.name ||
                                            !singleProduct.info ||
                                            !singleProduct.price ||
                                            !singleProduct.log
                                            ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                                            : "bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer hover:shadow-lg active:scale-95",
                                    )}
                                >
                                    DEPLOY ASSET TO MARKET
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === "edit_prices" && (
                        <div className="animation-[fadeIn_0.3s_ease-out]">
                            <h2 className="text-foreground text-2xl font-bold tracking-tight mb-8 m-0 uppercase">
                                Change Prices
                            </h2>
                            <div className="bg-card rounded-2xl p-8 border border-border shadow-sm max-w-4xl">
                                <div className="bg-primary/10 border border-primary/20 text-primary p-4 rounded-xl mb-8 font-medium shadow-sm">
                                    <strong>Note:</strong> Change the price of all products in a category at once.
                                </div>

                                <div className="grid gap-8 items-end grid-cols-1 md:grid-cols-[2fr_1fr]">
                                    <div>
                                        <label className="block text-muted-foreground text-xs uppercase font-bold tracking-wider mb-2">
                                            SELECT CATEGORY
                                        </label>
                                        <select
                                            value={bulkCategory}
                                            onChange={(e) =>
                                                setBulkCategory(e.target.value)
                                            }
                                            className="w-full bg-background/50 border border-border/50 text-foreground py-3 px-5 rounded-xl outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm appearance-none"
                                        >
                                            <option value="">
                                                -- Choose Category --
                                            </option>
                                            {existingCategories.map((c) => (
                                                <option key={c} value={c}>
                                                    {c}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-muted-foreground text-xs uppercase font-bold tracking-wider mb-2">
                                            NEW PRICE (BLT)
                                        </label>
                                        <input
                                            type="number"
                                            placeholder="e.g. 80"
                                            value={bulkPrice}
                                            onChange={(e) =>
                                                setBulkPrice(e.target.value)
                                            }
                                            className="w-full bg-background/50 border border-border/50 text-foreground py-3 px-5 rounded-xl outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm font-mono"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={submitBulkEdit}
                                    disabled={
                                        bulkLoading || !bulkCategory || !bulkPrice
                                    }
                                    className={cn(
                                        "w-full mt-8 py-4 border rounded-xl font-bold text-lg tracking-[1px] transition-all shadow-sm",
                                        bulkLoading || !bulkCategory || !bulkPrice
                                            ? "bg-muted text-muted-foreground border-border/50 cursor-not-allowed opacity-70"
                                            : "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border-primary/20 cursor-pointer"
                                    )}
                                >
                                    {bulkLoading ? "CHANGING..." : "CHANGE PRICES"}
                                </button>

                                <button
                                    onClick={deleteBulkCategory}
                                    disabled={bulkLoading || !bulkCategory}
                                    className={cn(
                                        "w-full mt-4 py-4 border rounded-xl font-bold text-lg tracking-[1px] transition-all shadow-sm",
                                        bulkLoading || !bulkCategory
                                            ? "bg-muted text-muted-foreground border-border/50 cursor-not-allowed opacity-70"
                                            : "bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground border-destructive/20 cursor-pointer"
                                    )}
                                >
                                    DELETE ALL PRODUCTS IN CATEGORY
                                </button>
                            </div>
                        </div>
                    )}

                    { }
                    {activeTab === "unsold_products" && (
                        <div className="animation-[fadeIn_0.3s_ease-out]">
                            <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
                                <h2 className="text-foreground text-2xl font-bold tracking-tight m-0">
                                    Unsold Products
                                </h2>
                                <input
                                    type="text"
                                    placeholder="Search products by name..."
                                    value={unsoldSearch}
                                    onChange={(e) => {
                                        setUnsoldSearch(e.target.value);
                                        setInventoryPage(1);
                                    }}
                                    className="bg-background/50 border border-border/50 text-foreground py-3 px-5 rounded-xl outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm w-full sm:w-80"
                                />
                            </div>

                            {selectedProducts.size > 0 && (
                                <div className="bg-primary/10 border border-primary/30 rounded-2xl py-4 px-6 mb-6 flex justify-between items-center flex-wrap gap-4 shadow-sm">
                                    <div className="text-primary font-bold">
                                        {selectedProducts.size} item(s) selected
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            onClick={handleExportLogs}
                                            className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white border border-emerald-500/20 py-2 px-4 rounded-xl font-bold cursor-pointer transition-all shadow-sm"
                                        >
                                            Export Logs
                                        </button>
                                        <button
                                            onClick={() =>
                                                executeBulkAction(
                                                    "UPDATE_PRICE",
                                                )
                                            }
                                            disabled={bulkActionLoading}
                                            className={cn(
                                                "bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground py-2 px-4 rounded-xl font-bold transition-all shadow-sm",
                                                bulkActionLoading
                                                    ? "opacity-50 cursor-not-allowed"
                                                    : "cursor-pointer",
                                            )}
                                        >
                                            Change Price
                                        </button>
                                        <button
                                            onClick={() =>
                                                executeBulkAction("DELETE")
                                            }
                                            disabled={bulkActionLoading}
                                            className={cn(
                                                "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-destructive-foreground py-2 px-4 rounded-xl font-bold transition-all shadow-sm",
                                                bulkActionLoading
                                                    ? "opacity-50 cursor-not-allowed"
                                                    : "cursor-pointer",
                                            )}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col gap-4">
                                {enterpriseData.shop.products.length === 0 ? (
                                    <div className="text-muted-foreground italic p-12 text-center bg-card rounded-2xl border border-border shadow-sm">
                                        You have no products listed. Add some
                                        from the Upload tab.
                                    </div>
                                ) : (
                                    <>
                                        <div className="flex gap-4 py-4 px-6 mb-2 items-center bg-card rounded-2xl border border-border shadow-sm">
                                            <input
                                                type="checkbox"
                                                checked={
                                                    enterpriseData.shop.products.filter(
                                                        (p: any) =>
                                                            p.productName
                                                                .toLowerCase()
                                                                .includes(
                                                                    unsoldSearch.toLowerCase(),
                                                                ),
                                                    ).length > 0 &&
                                                    enterpriseData.shop.products
                                                        .filter((p: any) =>
                                                            p.productName
                                                                .toLowerCase()
                                                                .includes(
                                                                    unsoldSearch.toLowerCase(),
                                                                ),
                                                        )
                                                        .every((p: any) =>
                                                            selectedProducts.has(
                                                                p.id,
                                                            ),
                                                        )
                                                }
                                                onChange={(e) => {
                                                    const filtered =
                                                        enterpriseData.shop.products.filter(
                                                            (p: any) =>
                                                                p.productName
                                                                    .toLowerCase()
                                                                    .includes(
                                                                        unsoldSearch.toLowerCase(),
                                                                    ),
                                                        );
                                                    if (e.target.checked) {
                                                        const newSet = new Set(
                                                            selectedProducts,
                                                        );
                                                        filtered.forEach(
                                                            (p: any) =>
                                                                newSet.add(
                                                                    p.id,
                                                                ),
                                                        );
                                                        setSelectedProducts(
                                                            newSet,
                                                        );
                                                    } else {
                                                        const newSet = new Set(
                                                            selectedProducts,
                                                        );
                                                        filtered.forEach(
                                                            (p: any) =>
                                                                newSet.delete(
                                                                    p.id,
                                                                ),
                                                        );
                                                        setSelectedProducts(
                                                            newSet,
                                                        );
                                                    }
                                                }}
                                                className="w-5 h-5 rounded border-border/50 text-primary focus:ring-primary/50 cursor-pointer accent-primary"
                                            />
                                            <span className="text-muted-foreground text-sm font-bold uppercase tracking-wider">
                                                Select All{" "}
                                                {unsoldSearch
                                                    ? "Matches"
                                                    : "Products"}
                                            </span>
                                        </div>

                                        {enterpriseData.shop.products
                                            .filter((p: any) =>
                                                p.productName
                                                    .toLowerCase()
                                                    .includes(
                                                        unsoldSearch.toLowerCase(),
                                                    ),
                                            )
                                            .slice(
                                                (inventoryPage - 1) * 5,
                                                inventoryPage * 5,
                                            )
                                            .map((p: any) => (
                                                editingProductId === p.id ? (
                                                    <div key={p.id} className="bg-card rounded-2xl p-6 border border-primary/50 shadow-md">
                                                        <div className="flex justify-between items-center mb-6">
                                                            <div className="text-primary font-bold text-lg flex items-center gap-2">
                                                                <span className="bg-primary/20 text-primary w-8 h-8 rounded-full flex items-center justify-center">✎</span>
                                                                Edit Product
                                                            </div>
                                                            <div className="text-muted-foreground text-xs font-mono">UUID: {p.id.split("-")[0]}</div>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                            <div>
                                                                <label className="block text-muted-foreground text-xs uppercase font-bold tracking-wider mb-2">Name</label>
                                                                <input type="text" value={editForm.productName} onChange={e => setEditForm({ ...editForm, productName: e.target.value })} className="w-full bg-background/50 border border-border/50 text-foreground py-2 px-4 rounded-xl outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm" />
                                                            </div>
                                                            <div>
                                                                <label className="block text-muted-foreground text-xs uppercase font-bold tracking-wider mb-2">Country</label>
                                                                <input type="text" value={editForm.country} onChange={e => setEditForm({ ...editForm, country: e.target.value })} className="w-full bg-background/50 border border-border/50 text-foreground py-2 px-4 rounded-xl outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm" />
                                                            </div>
                                                            <div className="md:col-span-2">
                                                                <label className="block text-muted-foreground text-xs uppercase font-bold tracking-wider mb-2">Info (Log Content)</label>
                                                                <input type="text" value={editForm.logContent} onChange={e => setEditForm({ ...editForm, logContent: e.target.value })} className="w-full bg-background/50 border border-border/50 text-foreground py-2 px-4 rounded-xl outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm font-mono text-sm" />
                                                            </div>
                                                            <div>
                                                                <label className="block text-muted-foreground text-xs uppercase font-bold tracking-wider mb-2">Price (BLT)</label>
                                                                <input type="number" value={editForm.price} onChange={e => setEditForm({ ...editForm, price: e.target.value })} className="w-full bg-background/50 border border-border/50 text-foreground py-2 px-4 rounded-xl outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm font-mono" />
                                                                {editForm.price && !isNaN(parseInt(editForm.price)) && (
                                                                    <div className="text-emerald-500 text-[0.8rem] mt-1.5 font-bold opacity-80 pl-1">
                                                                        You will earn ${(parseInt(editForm.price) * getSplitRate()).toFixed(2)}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-4 justify-end mt-6">
                                                            <button onClick={() => setEditingProductId(null)} className="bg-muted text-muted-foreground hover:bg-muted/80 py-2 px-6 rounded-xl font-bold transition-all">Cancel</button>
                                                            <button onClick={() => saveProductEdit(p.id)} className="bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/20 py-2 px-6 rounded-xl font-bold transition-all shadow-sm">Save Changes</button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div
                                                        key={p.id}
                                                        className={cn(
                                                            "bg-card rounded-2xl p-6 border transition-all duration-200 flex flex-wrap justify-between items-center gap-6 shadow-sm hover:shadow-md",
                                                            selectedProducts.has(
                                                                p.id,
                                                            )
                                                                ? "border-primary bg-primary/5"
                                                                : "border-border hover:border-border/60",
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-6 flex-1 min-w-[300px]">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedProducts.has(
                                                                    p.id,
                                                                )}
                                                                onChange={(e) => {
                                                                    const newSet =
                                                                        new Set(
                                                                            selectedProducts,
                                                                        );
                                                                    if (
                                                                        e.target
                                                                            .checked
                                                                    )
                                                                        newSet.add(
                                                                            p.id,
                                                                        );
                                                                    else
                                                                        newSet.delete(
                                                                            p.id,
                                                                        );
                                                                    setSelectedProducts(
                                                                        newSet,
                                                                    );
                                                                }}
                                                                className="w-5 h-5 rounded border-border/50 text-primary focus:ring-primary/50 cursor-pointer accent-primary shrink-0"
                                                            />
                                                            <div className="bg-primary/10 text-primary py-2 px-4 rounded-xl text-sm font-bold shrink-0 shadow-sm border border-primary/20">
                                                                {p.productName}
                                                            </div>
                                                            <div className="bg-amber-500/10 text-amber-500 py-1.5 px-3 rounded-lg text-xs font-bold shrink-0 shadow-sm border border-amber-500/20 uppercase tracking-wider hidden sm:flex items-center">
                                                                {getFlagForCountry(p.country)}
                                                                {p.country}
                                                            </div>
                                                            <div className="overflow-hidden flex-1">
                                                                <div className="text-foreground text-sm mb-1 font-mono truncate">
                                                                    {p.logContent}
                                                                </div>
                                                                <div className="text-muted-foreground text-xs flex items-center gap-2 flex-wrap">
                                                                    <span className="font-mono bg-muted px-2 py-0.5 rounded-md">
                                                                        UUID:{" "}
                                                                        {
                                                                            p.id.split(
                                                                                "-",
                                                                            )[0]
                                                                        }
                                                                    </span>
                                                                    <span className="hidden sm:inline">•</span>
                                                                    <span>
                                                                        Published{" "}
                                                                        {new Date(
                                                                            p.createdAt,
                                                                        ).toLocaleDateString()}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3 shrink-0">
                                                            <div className="text-emerald-500 font-black text-xl font-mono bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/20 shadow-sm mr-2">
                                                                {p.price} BLT
                                                            </div>
                                                            {p.marketBid > 0 && (
                                                                <div className="text-indigo-500 font-bold text-sm bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20 shadow-sm mr-2 flex items-center gap-1">
                                                                    <span className="text-[10px]">✦</span>
                                                                    Bid: {p.marketBid}
                                                                </div>
                                                            )}
                                                            <button
                                                                onClick={() => {
                                                                    setEditingProductId(p.id);
                                                                    setEditForm({
                                                                        productName: p.productName,
                                                                        country: p.country || "Global",
                                                                        logContent: p.logContent,
                                                                        price: p.price.toString()
                                                                    });
                                                                }}
                                                                className="bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white border border-blue-500/20 rounded-xl px-4 py-2 flex items-center justify-center cursor-pointer font-bold transition-all shadow-sm text-sm"
                                                                title="Edit Product"
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() =>
                                                                    deleteSingleProduct(
                                                                        p.id,
                                                                    )
                                                                }
                                                                className="bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground border border-destructive/20 rounded-xl px-4 py-2 flex items-center justify-center cursor-pointer font-bold transition-all shadow-sm text-sm"
                                                                title="Delete Product"
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    </div>
                                                )
                                            ))}
                                        {enterpriseData.shop.products.filter(
                                            (p: any) =>
                                                p.productName
                                                    .toLowerCase()
                                                    .includes(
                                                        unsoldSearch.toLowerCase(),
                                                    ),
                                        ).length > 5 && (
                                                <div className="flex justify-between items-center mt-6 bg-card p-4 rounded-2xl border border-border shadow-sm">
                                                    <button
                                                        disabled={
                                                            inventoryPage === 1
                                                        }
                                                        onClick={() =>
                                                            setInventoryPage(
                                                                (p) => p - 1,
                                                            )
                                                        }
                                                        className={cn(
                                                            "py-2 px-6 rounded-xl font-bold transition-all border border-border/50 shadow-sm",
                                                            inventoryPage === 1
                                                                ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                                                                : "bg-background/50 text-foreground hover:bg-background cursor-pointer",
                                                        )}
                                                    >
                                                        Previous
                                                    </button>
                                                    <span className="text-muted-foreground text-sm font-bold">
                                                        Page {inventoryPage} of{" "}
                                                        {Math.ceil(
                                                            enterpriseData.shop.products.filter(
                                                                (p: any) =>
                                                                    p.productName
                                                                        .toLowerCase()
                                                                        .includes(
                                                                            unsoldSearch.toLowerCase(),
                                                                        ),
                                                            ).length / 5,
                                                        )}
                                                    </span>
                                                    <button
                                                        disabled={
                                                            inventoryPage >=
                                                            Math.ceil(
                                                                enterpriseData.shop.products.filter(
                                                                    (p: any) =>
                                                                        p.productName
                                                                            .toLowerCase()
                                                                            .includes(
                                                                                unsoldSearch.toLowerCase(),
                                                                            ),
                                                                ).length / 5,
                                                            )
                                                        }
                                                        onClick={() =>
                                                            setInventoryPage(
                                                                (p) => p + 1,
                                                            )
                                                        }
                                                        className={cn(
                                                            "py-2 px-6 rounded-xl font-bold transition-all border border-border/50 shadow-sm",
                                                            inventoryPage >=
                                                                Math.ceil(
                                                                    enterpriseData.shop.products.filter(
                                                                        (p: any) =>
                                                                            p.productName
                                                                                .toLowerCase()
                                                                                .includes(
                                                                                    unsoldSearch.toLowerCase(),
                                                                                ),
                                                                    ).length / 5,
                                                                )
                                                                ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50"
                                                                : "bg-background/50 text-foreground hover:bg-background cursor-pointer",
                                                        )}
                                                    >
                                                        Next
                                                    </button>
                                                </div>
                                            )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                    { }
                    {activeTab === "settings" && (
                        <div className="animation-[fadeIn_0.3s_ease-out]">
                            <h2 className="text-foreground text-2xl font-bold tracking-tight mb-8 m-0 uppercase">
                                Store Identity & Upgrades
                            </h2>

                            <div className="grid gap-8 grid-cols-1 md:grid-cols-3">
                                {/* Store Details & Media */}
                                <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
                                    <h3 className="text-foreground font-bold tracking-tight mb-6 text-xl">
                                        Store Details & Media
                                    </h3>
                                    <div className="mb-4">
                                        <label className="block text-muted-foreground text-xs uppercase font-bold tracking-wider mb-2">
                                            Shop Name
                                        </label>
                                        <input
                                            type="text"
                                            value={shopNameInput}
                                            onChange={(e) =>
                                                setShopNameInput(e.target.value)
                                            }
                                            placeholder="Shop Name"
                                            className="w-full bg-background/50 border border-border/50 text-foreground py-3 px-5 rounded-xl outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm"
                                        />
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-muted-foreground text-xs uppercase font-bold tracking-wider mb-2">
                                            Shop Description
                                        </label>
                                        <textarea
                                            maxLength={140}
                                            value={shopDescInput}
                                            onChange={(e) =>
                                                setShopDescInput(e.target.value)
                                            }
                                            placeholder="Shop Description..."
                                            className="w-full bg-background/50 border border-border/50 text-foreground py-3 px-5 rounded-xl outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm min-h-24 font-[inherit]"
                                        />
                                        <div className="text-right text-xs text-muted-foreground mt-1.5 font-medium">
                                            {shopDescInput.length}/140
                                        </div>
                                    </div>
                                    <div className="mb-4">
                                        <label className="block text-muted-foreground text-xs uppercase font-bold tracking-wider mb-2">
                                            Avatar Image URL
                                        </label>
                                        <input
                                            type="text"
                                            value={avatarInput}
                                            onChange={(e) =>
                                                setAvatarInput(e.target.value)
                                            }
                                            placeholder="https://example.com/image.png"
                                            className="w-full bg-background/50 border border-border/50 text-foreground py-3 px-5 rounded-xl outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm"
                                        />
                                    </div>
                                    <div className="mb-6">
                                        <label className="block text-muted-foreground text-xs uppercase font-bold tracking-wider mb-2">
                                            Banner Image URL
                                        </label>
                                        <input
                                            type="text"
                                            value={bannerInput}
                                            onChange={(e) =>
                                                setBannerInput(e.target.value)
                                            }
                                            placeholder="https://example.com/banner.png"
                                            className="w-full bg-background/50 border border-border/50 text-foreground py-3 px-5 rounded-xl outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm"
                                        />
                                    </div>
                                    <button
                                        onClick={() =>
                                            buyCosmetic("avatar_update")
                                        }
                                        className="w-full bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/20 py-3 rounded-xl font-bold transition-all shadow-sm"
                                    >
                                        UPDATE STORE DETAILS
                                    </button>
                                </div>

                                { }
                                {/* Verified Store Badge */}
                                <div className="bg-card border border-border rounded-2xl p-8 shadow-sm flex flex-col justify-center items-center text-center">
                                    <svg
                                        width="64"
                                        height="64"
                                        viewBox="0 0 24 24"
                                        className={cn(
                                            "mb-6 drop-shadow-md",
                                            enterpriseData.shop.isTrusted
                                                ? "opacity-100"
                                                : "opacity-50",
                                        )}
                                    >
                                        <circle
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            fill={
                                                enterpriseData.shop.isTrusted
                                                    ? "#3b82f6"
                                                    : "#3f3f46"
                                            }
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
                                    <h3 className="text-foreground font-bold tracking-tight mb-3 text-xl">
                                        Verified Store Badge
                                    </h3>
                                    <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
                                        Increases buyer confidence and adds a
                                        blue checkmark next to your store name.
                                    </p>
                                    {enterpriseData.shop.isTrusted ? (
                                        <div className="py-3 px-6 bg-blue-500/10 border border-blue-500/20 text-blue-500 rounded-xl font-bold shadow-sm">
                                            VERIFIED STORE
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => buyCosmetic("badge")}
                                            className="bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white border border-blue-500/20 py-3 px-8 rounded-xl font-bold cursor-pointer transition-all shadow-sm"
                                        >
                                            BUY VERIFIED BADGE (20 BLT)
                                        </button>
                                    )}
                                </div>

                                {/* Telegram Notifications */}
                                <div className="bg-card border border-border rounded-2xl p-8 shadow-sm flex flex-col justify-center items-center text-center">
                                    <svg
                                        width="64"
                                        height="64"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="mb-6 drop-shadow-md"
                                    >
                                        <path
                                            d="M21.9995 2L1.00037 11.2C0.600371 11.4 0.600372 11.9 1.00037 12L7.00037 13.9L8.40037 20L12.0004 16L17.1004 20L21.9995 2Z"
                                            fill={
                                                enterpriseData.user
                                                    ?.telegramChatId
                                                    ? "#10b981"
                                                    : "#3f3f46"
                                            }
                                        />
                                    </svg>
                                    <h3 className="text-foreground font-bold tracking-tight mb-3 text-xl">
                                        Telegram Notifications
                                    </h3>
                                    <p className="text-muted-foreground text-sm mb-8 leading-relaxed">
                                        Allow us to message your device
                                        instantly when a purchase or dispute is
                                        initiated.
                                    </p>

                                    {enterpriseData.user?.telegramChatId ? (
                                        <div className="py-3 px-6 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl font-bold shadow-sm w-full">
                                            ✅ BOT LINKED SECURELY
                                        </div>
                                    ) : (
                                        <>
                                            {tgLinkCode && (
                                                <div className="bg-background/50 p-5 rounded-xl border border-border/50 shadow-sm mb-6 w-full break-all">
                                                    <div className="text-muted-foreground text-xs uppercase font-bold tracking-wider mb-3">
                                                        Send this exactly to the
                                                        bot:
                                                    </div>
                                                    <div className="text-blue-500 font-extrabold font-mono text-lg select-all">
                                                        /link {tgLinkCode}
                                                    </div>
                                                </div>
                                            )}
                                            <button
                                                onClick={async (e) => {
                                                    const btn = e.currentTarget;

                                                    if (tgLinkCode) {
                                                        window.location.reload();
                                                        return;
                                                    }

                                                    btn.innerText =
                                                        "GENERATING PAYLOAD...";
                                                    try {
                                                        const token =
                                                            document.cookie.replace(
                                                                /(?:(?:^|.*;\s*)sb_token\s*\=\s*([^;]*).*$)|^.*$/,
                                                                "$1",
                                                            );
                                                        const res = await fetch(
                                                            "/api/enterprise/tg-token",
                                                            {
                                                                headers: {
                                                                    Authorization: `Bearer ${token}`,
                                                                },
                                                            },
                                                        );
                                                        const data =
                                                            await res.json();
                                                        if (data.linked) {
                                                            window.location.reload();
                                                            return;
                                                        }
                                                        if (data.token) {
                                                            setTgLinkCode(
                                                                data.token,
                                                            );
                                                            window.open(
                                                                `https://t.me/SilverMarketPlaceBot?start=${data.token}`,
                                                                "_blank",
                                                            );
                                                            btn.innerText =
                                                                "REFRESH TO CONFIRM";
                                                            btn.className = "py-3 w-full border border-yellow-500/20 rounded-xl font-bold cursor-pointer bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500 hover:text-white transition-all shadow-sm";
                                                        }
                                                    } catch (e) {
                                                        btn.innerText =
                                                            "ERROR - TRY AGAIN";
                                                    }
                                                }}
                                                className={cn(
                                                    "py-3 w-full border rounded-xl font-bold cursor-pointer transition-all shadow-sm",
                                                    tgLinkCode
                                                        ? "border-yellow-500/20 bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500 hover:text-white"
                                                        : "border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white",
                                                )}
                                            >
                                                {tgLinkCode
                                                    ? "REFRESH TO CONFIRM"
                                                    : "LINK @SilverMarketPlaceBot"}
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            { }
                            <div className="mt-8 bg-card border border-border rounded-2xl p-8 shadow-sm">
                                <div className="flex justify-between items-start mb-8">
                                    <div>
                                        <h3 className="m-0 text-foreground font-bold tracking-tight mb-3 text-xl">
                                            <KineticText
                                                text="Store Color Pass"
                                                effect={activeEffect}
                                                className={`${activeEffect !== "none" &&
                                                        !activeEffect.startsWith(
                                                            "Kinetic:",
                                                        )
                                                        ? activeEffect
                                                        : undefined
                                                    } transition-[color_0.2s]`}
                                                style={{
                                                    color: activeColor,
                                                    textShadow:
                                                        activeEffect === "none"
                                                            ? `0 0 10px ${activeColor}80`
                                                            : undefined,
                                                }}
                                            />
                                        </h3>
                                        <p className="text-muted-foreground text-sm leading-relaxed m-0">
                                            Stylize your shop's global
                                            appearance globally.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-8 flex-wrap">
                                    <div className="flex-1 min-w-[300px]">
                                        <div className="text-muted-foreground text-xs uppercase font-bold tracking-wider mb-4">
                                            Color Palette
                                        </div>
                                        <div className="grid gap-3 grid-cols-[repeat(8,_1fr)] overflow-x-auto pb-2">
                                            {availableColors.map((c) => (
                                                <div
                                                    key={c}
                                                    onClick={() =>
                                                        setActiveColor(c)
                                                    }
                                                    className={cn(
                                                        "w-full aspect-square rounded-xl cursor-pointer transition-all duration-200 shadow-sm",
                                                        activeColor === c
                                                            ? "border-2 border-foreground scale-110 shadow-md"
                                                            : "border-2 border-transparent hover:scale-105",
                                                    )}
                                                    style={{ background: c }}
                                                ></div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-[250px]">
                                        <div className="text-muted-foreground text-xs uppercase font-bold tracking-wider mb-4">
                                            Active Effect
                                        </div>
                                        <select
                                            value={activeEffect}
                                            onChange={(e) =>
                                                setActiveEffect(e.target.value)
                                            }
                                            className="w-full bg-background/50 border border-border/50 text-foreground py-3 px-5 rounded-xl outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm cursor-pointer appearance-none"
                                        >
                                            <option value="none">
                                                No Animation
                                            </option>
                                            <optgroup label="Visual Cosmetics (20 BLT)">
                                                <option value="effect-flying">
                                                    Floating
                                                </option>
                                                <option value="effect-3d">
                                                    3D Pop
                                                </option>
                                                <option value="effect-typing">
                                                    Glitch
                                                </option>
                                                <option value="effect-neon">
                                                    Neon Pulse
                                                </option>
                                                <option value="effect-shake">
                                                    Shaking
                                                </option>
                                                <option value="effect-rgb">
                                                    Color Rainbow
                                                </option>
                                                <option value="effect-flash">
                                                    Flashing
                                                </option>
                                                <option value="effect-hologram">
                                                    Hologram
                                                </option>
                                                <option value="effect-plasma">
                                                    Liquid Plasma
                                                </option>
                                                <option value="effect-fire">
                                                    Fire
                                                </option>
                                                <option value="effect-radioactive-dust">
                                                    Floating Particles
                                                </option>
                                                <option value="effect-void-walker">
                                                    Void Glitch
                                                </option>
                                            </optgroup>
                                            <optgroup label="Kinetic Movements (20 BLT)">
                                                <option value="Kinetic: Sine Wave">
                                                    The Sine Wave (Dance)
                                                </option>
                                                <option value="Kinetic: Elastic Band">
                                                    The Elastic Band
                                                </option>
                                                <option value="Kinetic: Matrix Scrambler">
                                                    Matrix Scrambler
                                                </option>
                                                <option value="Kinetic: Ghost Shift">
                                                    Ghost Shift
                                                </option>
                                                <option value="Kinetic: Typewriter">
                                                    Typewriter Terminal
                                                </option>
                                            </optgroup>
                                        </select>
                                    </div>
                                </div>

                                <div className="mt-10 pt-8 border-t border-border">
                                    {(enterpriseData.shop.storeColor !== "#ffffff" || enterpriseData.shop.storeEffect !== "none") ? (
                                        <div className="flex flex-col sm:flex-row items-center gap-4 justify-end">
                                            <button
                                                onClick={() => {
                                                    setActiveColor("#ffffff");
                                                    setActiveEffect("none");
                                                    buyCosmetic("color_pass", "#ffffff", "none");
                                                }}
                                                className="w-full sm:w-auto bg-transparent border border-border/50 text-muted-foreground hover:text-foreground hover:bg-background/50 py-3 px-6 rounded-xl font-bold cursor-pointer transition-all shadow-sm uppercase tracking-wider text-sm"
                                            >
                                                REMOVE EFFECT (FREE)
                                            </button>
                                            <button
                                                onClick={() =>
                                                    buyCosmetic("color_pass")
                                                }
                                                className="w-full sm:w-auto bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/20 py-3 px-6 rounded-xl font-bold cursor-pointer transition-all shadow-sm uppercase tracking-wider text-sm"
                                            >
                                                BUY & APPLY EFFECT (20 BLT)
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex justify-end">
                                            <button
                                                onClick={() =>
                                                    buyCosmetic("color_pass")
                                                }
                                                className="w-full sm:w-auto bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground border border-primary/20 py-3 px-6 rounded-xl font-bold cursor-pointer transition-all shadow-sm uppercase tracking-wider text-sm"
                                            >
                                                BUY & APPLY EFFECT (20 BLT)
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            { }
            <AlertDialog
                open={!!confirmTarget}
                onOpenChange={(open) => !open && setConfirmTarget(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>ARE YOU SURE?</AlertDialogTitle>
                        <AlertDialogDescription>
                            {confirmTarget?.message}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>CANCEL</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                confirmTarget?.action();
                                setConfirmTarget(null);
                            }}
                        >
                            CONFIRM
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            { }
            <Dialog
                open={withdrawModalOpen}
                onOpenChange={(open) => setWithdrawModalOpen(open)}
            >
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-[1.8rem] uppercase tracking-[1px]">
                            Execute Withdrawal
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-slate-400 text-[0.9rem] mb-4">
                        Total Extractable Escrow:{" "}
                        <strong className="text-emerald-500">
                            ${(enterpriseData?.vendorBalance || 0).toFixed(2)}
                        </strong>
                    </p>

                    <div className="mb-4">
                        <Label className="text-[0.9rem] font-extrabold mb-2 block">
                            CRYPTO NETWORK
                        </Label>
                        <Select
                            value={withdrawNetwork}
                            onValueChange={setWithdrawNetwork}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="USDT TRC20">
                                    USDT TRC20
                                </SelectItem>
                                <SelectItem value="USDT BEP20">
                                    USDT BEP20
                                </SelectItem>
                                <SelectItem value="USDT ERC20">
                                    USDT ERC20
                                </SelectItem>
                                <SelectItem value="BTC">BTC</SelectItem>
                                <SelectItem value="ETH">ETH</SelectItem>
                                <SelectItem value="SOL">SOL</SelectItem>
                                <SelectItem value="LTC">LTC</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="mb-4">
                        <Label className="text-[0.9rem] font-extrabold mb-2 block">
                            TARGET ADDRESS PAYLOAD
                        </Label>
                        <Input
                            type="text"
                            placeholder="TXX..."
                            value={withdrawAddress}
                            onChange={(e) => setWithdrawAddress(e.target.value)}
                            className="font-mono text-[1.1rem] h-auto p-4"
                        />
                    </div>

                    <p className="text-(--text-muted) text-[0.8rem] italic mb-4 text-center">
                        You will be notified through the Notification bot once
                        the Withdraw is confirmed manually by an Admin.
                    </p>

                    <div className="flex gap-2.5">
                        <Button
                            variant="outline"
                            className="flex-1 h-auto p-4 font-semibold"
                            onClick={() => setWithdrawModalOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={executeWithdrawal}
                            disabled={!withdrawAddress}
                            className="flex-1 h-auto p-4 font-extrabold bg-emerald-500 text-black hover:bg-emerald-600"
                        >
                            Confirm Extract
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function VendorDashboard() {
    return (
        <Suspense
            fallback={
                <div className="text-(--text-primary) text-center p-20">
                    Synchronizing...
                </div>
            }
        >
            <DashboardContent />
        </Suspense>
    );
}
