"use client";
import AdBanner from "@/components/AdBanner";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { postApiPlatformBuyUpgradeBody } from "@/service/api/zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const shopNameSchema = postApiPlatformBuyUpgradeBody
    .pick({ shopName: true })
    .extend({
        shopName: z
            .string()
            .min(4, "Minimum 4 characters.")
            .max(30, "Maximum 30 characters.")
            .regex(/^[a-zA-Z0-9 ]+$/, "Only letters, numbers, and spaces."),
    });

type ShopNameFormValues = z.infer<typeof shopNameSchema>;

const styles = {
    upgradeContainer: "grid grid-cols-1 gap-6 lg:grid-cols-2 2xl:grid-cols-4",
    tierCard:
        "flex flex-col overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm",
    tierSilver: "",
    tierPro: "",
    tierSyndicate: "",
    tierEnterprise: "",
    tierHeader: "border-b px-6 py-8 text-center",
    headerSilver: "",
    headerPro: "",
    headerSupreme: "",
    headerEnterprise: "",
    tierPrice: "font-mono text-4xl font-black",
    tierPeriod:
        "flex justify-between border-b bg-muted/40 px-4 py-2 text-xs text-muted-foreground",
    userbarSection:
        "flex min-h-22 flex-col items-center justify-center border-b px-4 py-4",
    userbarLabel: "mb-2 text-xs text-muted-foreground",
    ubBase: "inline-flex items-center justify-center rounded-md border px-5 py-1.5 font-mono text-xs font-semibold uppercase tracking-wider",
    ubSilver: "border-zinc-700 bg-zinc-800 text-zinc-100",
    ubPro: "border-zinc-700 bg-zinc-800 text-zinc-100",
    ubEnterprise: "border-zinc-100 bg-zinc-100 text-zinc-900",
    featuresList: "flex flex-1 flex-col",
    featureRow: "flex items-center justify-between border-b px-6 py-3 text-sm",
    featureName: "text-foreground",
    featureVal: "text-right font-semibold text-muted-foreground",
    check: "font-black text-foreground",
    cross: "font-black text-muted-foreground",
    actionSection: "mt-auto bg-black/20 p-6",
    purchaseBtn:
        "w-full rounded-md border bg-muted px-4 py-3 text-sm font-semibold uppercase tracking-wider text-foreground transition-colors hover:bg-zinc-800",
    purchaseBtnActive:
        "border-none bg-primary text-primary-foreground hover:bg-primary/90",
    purchaseBtnEnterprise:
        "border-none bg-primary text-primary-foreground hover:bg-primary/90",
};

export default function Upgrade() {
    const router = useRouter();
    const [loadingType, setLoadingType] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [storeModal, setStoreModal] = useState({ open: false, itemType: "" });

    const shopNameForm = useForm<ShopNameFormValues>({
        resolver: zodResolver(shopNameSchema),
        defaultValues: { shopName: "" },
    });

    const shopName = shopNameForm.watch("shopName") ?? "";
    const shopNameLength = shopName.length;

    useEffect(() => {
        const fetchUser = async () => {
            const match = document.cookie.match(
                new RegExp("(^| )sb_token=([^;]+)"),
            );
            const token = match ? match[2] : null;

            if (!token) {
                setAuthLoading(false);
                return;
            }
            try {
                const res = await fetch("/api/user/me", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (res.ok) {
                    const data = await res.json();
                    setUser(data.user);
                }
            } catch (e) {
                console.error("Auth fetch error:", e);
            }
            setAuthLoading(false);
        };
        fetchUser();
    }, []);

    const getRankWeight = (r: string) => {
        const map: any = {
            USER: 0,
            STARTER: 1,
            PRO: 2,
            PREMIUM: 3,
            ENTERPRISE: 4,
            ADMIN: 5,
        };
        return map[r] || 0;
    };

    const pricingMap = {
        RANK_STARTER: 20,
        RANK_PRO: 99,
        RANK_PREMIUM: 299,
        RANK_ENTERPRISE: 899,
    };

    const renderRankBtn = (
        reqWeight: number,
        itemType: string,
        btnText?: string,
    ) => {
        const targetRank = itemType.replace("RANK_", "");
        const userWeight = user ? getRankWeight(user.rank) : -1;

        if (
            user &&
            user.rank === targetRank
        ) {
            return (
                <button
                    className="bg-(--text-primary) text-(--bg-primary) border-0 cursor-default w-4/5 my-6 mx-auto p-[0.8rem] font-semibold text-[0.85rem] rounded uppercase tracking-[1px] flex items-center justify-center gap-2"
                    disabled
                >
                    <CheckCircle2 size={16} /> Active Plan
                </button>
            );
        }

        if (user && userWeight > reqWeight) {
            return (
                <button
                    className="bg-(--bg-tertiary) text-(--text-muted) border border-(--border-color) cursor-not-allowed w-4/5 my-6 mx-auto p-[0.8rem] font-semibold text-[0.85rem] rounded uppercase tracking-[1px] flex items-center justify-center gap-2"
                    disabled
                >
                    <CheckCircle2 size={16} /> Included
                </button>
            );
        }

        const cost = (pricingMap as any)[itemType];
        const canAfford = user && user.credits >= cost;

        if (authLoading) {
            return (
                <button className={`${styles.purchaseBtn} opacity-70`} disabled>
                    Loading...
                </button>
            );
        }

        if (!user) {
            return (
                <button
                    className={styles.purchaseBtn}
                    onClick={() => toast.error("Please log in.")}
                >
                    Log In
                </button>
            );
        }

        if (!canAfford) {
            return (
                <button
                    className={`${styles.purchaseBtn} bg-red-500 text-(--text-primary)`}
                    onClick={() => router.push("/deposit-history")}
                >
                    Deposit {cost} BLT
                </button>
            );
        }

        return (
            <button
                className={
                    itemType === "RANK_PREMIUM"
                        ? `${styles.purchaseBtn} ${styles.purchaseBtnActive}`
                        : itemType === "RANK_ENTERPRISE"
                          ? `${styles.purchaseBtn} ${styles.purchaseBtnEnterprise}`
                          : styles.purchaseBtn
                }
                onClick={() => handlePurchaseInitiation(itemType)}
                disabled={loadingType === itemType}
            >
                {loadingType === itemType
                    ? "Processing..."
                    : btnText
                      ? btnText
                      : `Purchase for ${cost} BLT`}
            </button>
        );
    };

    const handlePurchaseInitiation = (itemType: string) => {
        if (
            ["RANK_PRO", "RANK_PREMIUM", "RANK_ENTERPRISE"].includes(itemType)
        ) {
            shopNameForm.reset();
            setStoreModal({ open: true, itemType });
        } else {
            submitPurchase(itemType, "");
        }
    };

    const handleShopNameSubmit = (values: ShopNameFormValues) => {
        submitPurchase(storeModal.itemType, values.shopName);
    };

    const submitPurchase = async (itemType: string, customShopName: string) => {
        setLoadingType(itemType);
        setStoreModal({ open: false, itemType: "" });
        try {
            const match = document.cookie.match(
                new RegExp("(^| )sb_token=([^;]+)"),
            );
            const token = match ? match[2] : null;

            const res = await fetch("/api/platform/buy-upgrade", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ itemType, shopName: customShopName }),
            });

            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Failed to process transaction.");
            } else {
                toast.success(
                    data.message || "Upgrade purchased successfully!",
                );
                setTimeout(() => window.location.reload(), 1500);
            }
        } catch (err) {
            toast.error("Server offline or unavailable.");
        }
        setLoadingType(null);
    };

    return (
        <div className="min-h-screen flex flex-col w-full min-w-full box-border">
            {storeModal.open && (
                <div className="fixed top-0 left-0 w-full h-full bg-[rgba(0,0,0,0.8)] backdrop-filter-[blur(5px)] flex items-center justify-center z-1000">
                    <div className="bg-(--bg-secondary) border border-(--border-color) w-100 rounded-lg p-8 shadow-[0_1px_2px_0_rgba(0,0,0,0.05)]">
                        <h3 className="text-(--text-primary) mt-0 mr-0 mb-4 pl-0 text-[1.4rem]">
                            Claim your Store Name
                        </h3>
                        <p className="text-slate-400 text-[0.9rem] mb-6 leading-normal">
                            Your store name is permanent. Only letters, numbers,
                            and spaces are allowed.
                        </p>
                        <Form {...shopNameForm}>
                            <form
                                onSubmit={shopNameForm.handleSubmit(
                                    handleShopNameSubmit,
                                )}
                            >
                                <FormField
                                    control={shopNameForm.control}
                                    name="shopName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormControl>
                                                <Input
                                                    placeholder="e.g. Premium Hub"
                                                    maxLength={30}
                                                    className="w-full p-4 bg-(--bg-secondary) border border-(--border-color) text-(--text-primary) rounded-lg text-base mb-2 outline-none h-auto"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <div
                                    className={cn(
                                        "flex justify-between text-[0.8rem] mb-8",
                                        shopNameLength < 4
                                            ? "text-red-500"
                                            : "text-slate-500",
                                    )}
                                >
                                    <span>Min 4 chars</span>
                                    <span>{shopNameLength} / 30</span>
                                </div>
                                <div className="flex gap-4">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setStoreModal({
                                                open: false,
                                                itemType: "",
                                            })
                                        }
                                        className="flex-1 p-4 bg-(--bg-tertiary) border border-(--border-color) text-(--text-muted) rounded-lg cursor-pointer font-semibold"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={
                                            shopNameLength < 4 ||
                                            shopNameLength > 30
                                        }
                                        className={cn(
                                            "flex-1 p-4 border-0 rounded-lg font-semibold",
                                            shopNameLength >= 4 &&
                                                shopNameLength <= 30
                                                ? "bg-zinc-50"
                                                : "bg-zinc-900",
                                            shopNameLength >= 4 &&
                                                shopNameLength <= 30
                                                ? "text-zinc-900"
                                                : "text-zinc-500",
                                            shopNameLength >= 4 &&
                                                shopNameLength <= 30
                                                ? "cursor-pointer"
                                                : "cursor-not-allowed",
                                        )}
                                    >
                                        Submit Name
                                    </button>
                                </div>
                            </form>
                        </Form>
                    </div>
                </div>
            )}

            <div className="w-full flex flex-col items-center justify-center">
                <header className="border-b bg-transparent px-8 py-16 text-center pt-16 pb-8 w-full max-w-7xl border-b-(--border-color) box-border">
                    <div className="mx-auto text-center">
                        <AdBanner />
                        <h1 className="glow-text font-mono text-6xl font-extrabold tracking-tight">
                            Buy{" "}
                            <span className="text-silver">Premium Ranks</span>
                        </h1>
                        <p className="mx-auto mt-4 max-w-3xl text-lg text-muted-foreground">
                            Unlock Silverbullet architecture access, bypass
                            limits, and dominate the marketplace.
                        </p>
                    </div>
                </header>

                <main className="py-8 px-4 sm:px-8 w-full max-w-[1600px] flex flex-col box-border">
                    <div className="w-full flex flex-col items-center">
                        <div
                            className={`${styles.upgradeContainer} w-full max-w-full mt-0 mr-0 mb-8 pl-0`}
                        >
                            {}
                            <div
                                className={`${styles.tierCard} ${styles.tierSilver}`}
                            >
                                <div
                                    className={`${styles.tierHeader} ${styles.headerSilver}`}
                                >
                                    <h3>Starter Plan</h3>
                                    <div className={styles.tierPrice}>$20</div>
                                </div>
                                <div className={styles.tierPeriod}>
                                    <span>Period</span>
                                    <span>1 Month</span>
                                </div>
                                <div className={styles.userbarSection}>
                                    <div className={styles.userbarLabel}>
                                        Public Profile Badge
                                    </div>
                                    <div
                                        className={`${styles.ubBase} ${styles.ubSilver}`}
                                    >
                                        ★ VIP
                                    </div>
                                </div>
                                <div className={styles.featuresList}>
                                    <div className={styles.featureRow}>
                                        <span className={styles.featureName}>
                                            Vendor Dashboard Access
                                        </span>
                                        <span className={styles.cross}>✗</span>
                                    </div>
                                    <div className={styles.featureRow}>
                                        <span className={styles.featureName}>
                                            SilverBullet PRO 1.5.9
                                        </span>
                                        <span className={styles.cross}>✗</span>
                                    </div>
                                    <div className={styles.featureRow}>
                                        <span className={styles.featureName}>
                                            See Hidden Configs for Free
                                        </span>
                                        <span className={styles.check}>✓</span>
                                    </div>
                                    <div className={styles.featureRow}>
                                        <span className={styles.featureName}>
                                            Platform Payout Split
                                        </span>
                                        <span className={styles.cross}>
                                            N/A
                                        </span>
                                    </div>
                                    <div className={styles.featureRow}>
                                        <span className={styles.featureName}>
                                            Active 24/7 Dispute Support
                                        </span>
                                        <span className={styles.check}>✓</span>
                                    </div>
                                    <div className={styles.featureRow}>
                                        <span className={styles.featureName}>
                                            15-Min Early Drop Access
                                        </span>
                                        <span className={styles.cross}>✗</span>
                                    </div>
                                    <div className={styles.featureRow}>
                                        <span className={styles.featureName}>
                                            Free Profile Cosmetics
                                        </span>
                                        <span className={styles.cross}>✗</span>
                                    </div>
                                    <div className={styles.featureRow}>
                                        <span className={styles.featureName}>
                                            Store Custom Visuals
                                        </span>
                                        <span className={styles.cross}>✗</span>
                                    </div>
                                </div>
                                <div className={styles.actionSection}>
                                    {renderRankBtn(
                                        1,
                                        "RANK_STARTER",
                                        "Purchase",
                                    )}
                                </div>
                            </div>

                            {}
                            <div
                                className={`${styles.tierCard} ${styles.tierPro}`}
                            >
                                <div
                                    className={`${styles.tierHeader} ${styles.headerPro}`}
                                >
                                    <h3>Pro Plan</h3>
                                    <div className={styles.tierPrice}>$99</div>
                                </div>
                                <div className={styles.tierPeriod}>
                                    <span>Period</span>
                                    <span>Lifetime</span>
                                </div>
                                <div className={styles.userbarSection}>
                                    <div className={styles.userbarLabel}>
                                        Public Profile Badge
                                    </div>
                                    <div
                                        className={`${styles.ubBase} ${styles.ubPro}`}
                                    >
                                        ∞ PRO
                                    </div>
                                </div>
                                <div className={styles.featuresList}>
                                    <div className={styles.featureRow}>
                                        <span className={styles.featureName}>
                                            Vendor Dashboard Access
                                        </span>
                                        <span className={styles.check}>✓</span>
                                    </div>
                                    <div className={styles.featureRow}>
                                        <span className={styles.featureName}>
                                            SilverBullet PRO 1.5.9
                                        </span>
                                        <span className={styles.cross}>✗</span>
                                    </div>
                                    <div className={styles.featureRow}>
                                        <span className={styles.featureName}>
                                            See Hidden Configs for Free
                                        </span>
                                        <span className={styles.check}>✓</span>
                                    </div>
                                    <div className={styles.featureRow}>
                                        <span className={styles.featureName}>
                                            Platform Payout Split
                                        </span>
                                        <span
                                            className={`${styles.featureVal} text-blue-500`}
                                        >
                                            50% Revenue
                                        </span>
                                    </div>
                                    <div className={styles.featureRow}>
                                        <span className={styles.featureName}>
                                            Active 24/7 Dispute Support
                                        </span>
                                        <span className={styles.check}>✓</span>
                                    </div>
                                    <div className={styles.featureRow}>
                                        <span className={styles.featureName}>
                                            15-Min Early Drop Access
                                        </span>
                                        <span className={styles.check}>✓</span>
                                    </div>
                                    <div className={styles.featureRow}>
                                        <span className={styles.featureName}>
                                            Free Profile Cosmetics
                                        </span>
                                        <span className={styles.check}>✓</span>
                                    </div>
                                    <div className={styles.featureRow}>
                                        <span className={styles.featureName}>
                                            Store Custom Visuals
                                        </span>
                                        <span className={styles.cross}>✗</span>
                                    </div>
                                </div>
                                <div className={styles.actionSection}>
                                    {renderRankBtn(2, "RANK_PRO", "Purchase")}
                                </div>
                            </div>

                            {}
                            <div
                                className={`${styles.tierCard} ${styles.tierSyndicate}`}
                            >
                                <div
                                    className={`${styles.tierHeader} ${styles.headerSupreme}`}
                                >
                                    <h3>Premium Plan</h3>
                                    <div className={styles.tierPrice}>$299</div>
                                </div>
                                <div className={styles.tierPeriod}>
                                    <span>Period</span>
                                    <span>Lifetime</span>
                                </div>
                                <div className={styles.userbarSection}>
                                    <div className={styles.userbarLabel}>
                                        Public Profile Badge
                                    </div>
                                    <div
                                        className={`${styles.ubBase} ${styles.ubPro}`}
                                    >
                                        ∞ PRO (Stealth)
                                    </div>
                                </div>
                                <div className={styles.featuresList}>
                                    <div className={styles.featureRow}>
                                        <span className={styles.featureName}>
                                            Vendor Dashboard Access
                                        </span>
                                        <span className={styles.check}>✓</span>
                                    </div>
                                    <div className={styles.featureRow}>
                                        <span className={styles.featureName}>
                                            SilverBullet PRO 1.5.9
                                        </span>
                                        <span className={styles.check}>✓</span>
                                    </div>
                                    <div className={styles.featureRow}>
                                        <span className={styles.featureName}>
                                            See Hidden Configs for Free
                                        </span>
                                        <span className={styles.check}>✓</span>
                                    </div>
                                    <div className={styles.featureRow}>
                                        <span className={styles.featureName}>
                                            Platform Payout Split
                                        </span>
                                        <span
                                            className={`${styles.featureVal} text-emerald-400`}
                                        >
                                            60% Revenue
                                        </span>
                                    </div>
                                    <div className={styles.featureRow}>
                                        <span className={styles.featureName}>
                                            Active 24/7 Dispute Support
                                        </span>
                                        <span className={styles.check}>✓</span>
                                    </div>
                                    <div className={styles.featureRow}>
                                        <span className={styles.featureName}>
                                            15-Min Early Drop Access
                                        </span>
                                        <span className={styles.featureVal}>
                                            Priority
                                        </span>
                                    </div>
                                    <div className={styles.featureRow}>
                                        <span className={styles.featureName}>
                                            Free Profile Cosmetics
                                        </span>
                                        <span className={styles.check}>✓</span>
                                    </div>
                                    <div className={styles.featureRow}>
                                        <span className={styles.featureName}>
                                            Store Custom Visuals
                                        </span>
                                        <span className={styles.cross}>✗</span>
                                    </div>
                                </div>
                                <div className={styles.actionSection}>
                                    {renderRankBtn(
                                        3,
                                        "RANK_PREMIUM",
                                        "Purchase",
                                    )}
                                </div>
                            </div>

                            {}
                            <div
                                className={`${styles.tierCard} ${styles.tierEnterprise}`}
                            >
                                <div
                                    className={`${styles.tierHeader} ${styles.headerEnterprise}`}
                                >
                                    <h3>Enterprise Plan</h3>
                                    <div className={styles.tierPrice}>$899</div>
                                </div>
                                <div className={styles.tierPeriod}>
                                    <span>Period</span>
                                    <span>Lifetime</span>
                                </div>
                                <div className={styles.userbarSection}>
                                    <div className={styles.userbarLabel}>
                                        Public Profile Badge
                                    </div>
                                    <div
                                        className={`${styles.ubBase} ${styles.ubPro}`}
                                    >
                                        ∞ PRO (Stealth)
                                    </div>
                                </div>
                                <div className={styles.featuresList}>
                                    <div className={styles.featureRow}>
                                        <span className={styles.featureName}>
                                            Vendor Dashboard Access
                                        </span>
                                        <span className={styles.check}>✓</span>
                                    </div>
                                    <div className={styles.featureRow}>
                                        <span className={styles.featureName}>
                                            SilverBullet PRO 1.5.9
                                        </span>
                                        <span className={styles.check}>✓</span>
                                    </div>
                                    <div className={styles.featureRow}>
                                        <span className={styles.featureName}>
                                            See Hidden Configs for Free
                                        </span>
                                        <span className={styles.check}>✓</span>
                                    </div>
                                    <div className={styles.featureRow}>
                                        <span className={styles.featureName}>
                                            Platform Payout Split
                                        </span>
                                        <span
                                            className={`${styles.featureVal} text-violet-500`}
                                        >
                                            75% Revenue
                                        </span>
                                    </div>
                                    <div className={styles.featureRow}>
                                        <span className={styles.featureName}>
                                            Active 24/7 Dispute Support
                                        </span>
                                        <span className={styles.check}>✓</span>
                                    </div>
                                    <div className={styles.featureRow}>
                                        <span className={styles.featureName}>
                                            15-Min Early Drop Access
                                        </span>
                                        <span className={styles.featureVal}>
                                            Max Priority
                                        </span>
                                    </div>
                                    <div className={styles.featureRow}>
                                        <span className={styles.featureName}>
                                            Free Profile Cosmetics
                                        </span>
                                        <span className={styles.check}>✓</span>
                                    </div>
                                    <div className={styles.featureRow}>
                                        <span className={styles.featureName}>
                                            Store Custom Visuals
                                        </span>
                                        <span className={styles.check}>✓</span>
                                    </div>
                                </div>
                                <div className={styles.actionSection}>
                                    {renderRankBtn(
                                        4,
                                        "RANK_ENTERPRISE",
                                        "Establish Cartel",
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="bg-(--bg-secondary) p-8 rounded-lg border border-(--border-color) mb-12 w-full box-border">
                            <h3 className="text-(--text-primary) text-[1.2rem] mb-4 text-center">
                                Vendor License & Split-Payment Details
                            </h3>
                            <p className="text-slate-400 text-[0.9rem] leading-[1.6] text-center">
                                Purchasing a Shop License grants you a dedicated
                                sub-domain within the Silverbullet Marketplace
                                to automate log and data sales. All customer
                                payouts and disputes flow through our automated
                                escrow algorithms.{" "}
                                <strong className="text-red-500">
                                    Strict Rule: Scams result in immediate
                                    ledger freezes and permanent bans.
                                </strong>
                                <br />
                                <br />
                                <strong className="text-(--text-primary)">
                                    Premium Vendors retain exactly 60% of their
                                    gross revenue (Silverbullet takes 40%).
                                    Enterprise Vendors retain an exclusive 75%
                                    of their gross revenue (Silverbullet takes
                                    25%). Payouts are withdrawable once your
                                    ledger balance reaches $50.00+.
                                </strong>
                                <br />
                                Silverbullet retains the remaining backend
                                platform tax for liquidity, escrow backing, and
                                24/7 dispute team infrastructure.
                            </p>
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
