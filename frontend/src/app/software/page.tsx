"use client";
import { CheckCircle2, Download } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function SoftwareHub() {
    const router = useRouter();
    const [loadingType, setLoadingType] = useState<string | null>(null);
    const [user, setUser] = useState<any>(null);
    const [authLoading, setAuthLoading] = useState(true);

    const pricingMap = {
        SOFTWARE_ONLY: 187,
        SUB_BLUE_BADGE: 15,
        SUB_COSMETICS: 10,
    };

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

    const handlePurchase = async (itemType: string) => {
        setLoadingType(itemType);
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
                body: JSON.stringify({ itemType }), // no shopName required for software
            });

            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Failed to process transaction.");
            } else {
                toast.success(data.message || "Purchase successful!");
                setTimeout(() => window.location.reload(), 1500);
            }
        } catch (err) {
            toast.error("Server offline or unavailable.");
        }
        setLoadingType(null);
    };

    const renderPurchaseBtn = (
        itemType: string,
        defaultText: string,
        customStyles: any,
    ) => {
        if (authLoading) {
            return (
                <button className="opacity-70" style={{ ...customStyles }} disabled>
                    Loading...
                </button>
            );
        }

        if (!user) {
            return (
                <button
                    style={customStyles}
                    onClick={() => toast.error("Please log in.")}
                >
                    Log In
                </button>
            );
        }

        const cost = (pricingMap as any)[itemType];
        const canAfford = user && user.credits >= cost;

        if (!canAfford) {
            const btnStyle = customStyles.background
                ? {
                      ...customStyles,
                      background: "#ef4444",
                      color: "var(--text-primary)",
                      border: "none",
                  }
                : {
                      ...customStyles,
                      background: "#ef4444",
                      color: "var(--text-primary)",
                  };
            return (
                <button
                    style={btnStyle}
                    onClick={() => router.push("/deposit-history")}
                >
                    Deposit {cost} BLT
                </button>
            );
        }

        return (
            <button
                style={customStyles}
                onClick={() => handlePurchase(itemType)}
                disabled={loadingType === itemType}
            >
                {loadingType === itemType
                    ? "Processing..."
                    : `Purchase for ${cost} BLT`}
            </button>
        );
    };

    return (
        <div className="min-h-screen flex flex-col">
            <header
                className="border-b bg-transparent px-8 py-16 text-center pt-16 pb-8"
                
            >
                <div className="container">
                    <h1
                        className="font-mono text-6xl font-extrabold tracking-tight text-(--text-primary)"
                        
                    >
                        Software & Add-ons
                    </h1>
                    <p className="mx-auto mt-4 max-w-2xl text-muted-foreground text-lg">
                        Direct access to the Silverbullet architecture
                        ecosystem, verifications, and high-end cosmetics.
                    </p>
                </div>
            </header>

            <main
                className="container py-8 px-0 min-h-[60vh]"
                
            >
                <div
                    className="flex gap-8 flex-wrap justify-center" 
                >
                    {}
                    <div
                        className={cn(`${user?.hasSoftwareLicense
                                ? "transition-transform hover:-translate-y-1"
                                : ""} w-80 p-8 flex flex-col rounded-lg`, user?.hasSoftwareLicense ? "bg-[]" : "bg-zinc-950", user?.hasSoftwareLicense ? "[border:]" : "border border-zinc-800")}
                        
                    >
                        <h4
                            className="text-(--text-primary) text-[1.4rem] mb-2 font-mono" 
                        >
                            SilverBullet PRO 1.5.9
                        </h4>
                        <div
                            className="text-[1.8rem] font-black text-(--text-primary) mb-4" 
                        >
                            $187{" "}
                            <span
                                className="text-[0.9rem] text-(--text-muted) font-normal" 
                            >
                                Lifetime
                            </span>
                        </div>
                        <p
                            className="text-(--text-muted) text-[0.9rem] mb-8 grow leading-[1.6]" 
                        >
                            Direct access to the flagship cracking architecture.
                            Complete bypass capabilities and dedicated thread
                            injections.
                            <br />
                            <br />
                            <span
                                className="text-(--text-muted) text-[0.8rem]" 
                            >
                                * Future software updates will be available at a
                                low cost for license holders.
                            </span>
                        </p>
                        {user?.hasSoftwareLicense ? (
                            <div
                                className="flex flex-col gap-3" 
                            >
                                <button
                                    className="bg-(--bg-tertiary) text-(--text-muted) border border-(--border-color) cursor-not-allowed w-full p-[0.9rem] rounded-lg uppercase tracking-[1px] font-semibold flex items-center justify-center gap-2" 
                                    disabled
                                >
                                    <CheckCircle2 size={16} /> Owned
                                </button>
                                <a
                                    href="/downloads/SilverBullet_Pro_1.5.9.zip"
                                    className="bg-(--text-primary) text-(--bg-primary) border-0 no-underline flex justify-center items-center gap-2 w-full p-4 rounded-lg uppercase tracking-[1px] font-semibold transition-all duration-200" 
                                    onMouseOver={(e) =>
                                        (e.currentTarget.style.background =
                                            "#e4e4e7")
                                    }
                                    onMouseOut={(e) =>
                                        (e.currentTarget.style.background =
                                            "#fafafa")
                                    }
                                >
                                    <Download size={18} /> DOWNLOAD .EXE
                                </a>
                            </div>
                        ) : (
                            renderPurchaseBtn(
                                "SOFTWARE_ONLY",
                                "Purchase Software",
                                {
                                    background: "#fafafa",
                                    width: "100%",
                                    padding: "1rem",
                                    borderRadius: "0.5rem",
                                    border: "none",
                                    color: "#18181b",
                                    cursor: "pointer",
                                    fontWeight: 600,
                                    textTransform: "uppercase",
                                    letterSpacing: "1px",
                                    fontSize: "0.95rem",
                                },
                            )
                        )}
                    </div>

                    {}
                    <div
                        className="bg-(--bg-secondary) w-80 p-8 border border-(--border-color) flex flex-col rounded-lg" 
                    >
                        <h4
                            className="text-(--text-primary) text-[1.4rem] mb-2 font-mono" 
                        >
                            Verified Blue Badge
                        </h4>
                        <div
                            className="text-[1.8rem] font-black text-(--text-primary) mb-4" 
                        >
                            $15{" "}
                            <span
                                className="text-[0.9rem] text-(--text-muted) font-normal" 
                            >
                                / Month
                            </span>
                        </div>
                        <p
                            className="text-(--text-muted) text-[0.9rem] mb-8 grow leading-[1.6]" 
                        >
                            Equip the official blue verification checkmark
                            globally across your threads, shop profile, and user
                            dossier.
                        </p>
                        {user?.hasBlueBadge ? (
                            <button
                                className="bg-(--bg-tertiary) text-(--text-muted) border border-(--border-color) cursor-not-allowed w-full p-4 rounded-lg font-semibold uppercase tracking-[1px] flex items-center justify-center gap-2" 
                                disabled
                            >
                                <CheckCircle2 size={16} /> Subscribed
                            </button>
                        ) : (
                            renderPurchaseBtn("SUB_BLUE_BADGE", "Subscribe", {
                                width: "100%",
                                padding: "1rem",
                                borderRadius: "0.5rem",
                                border: "1px solid var(--border-color)",
                                background: "var(--text-primary)",
                                color: "var(--bg-primary)",
                                cursor: "pointer",
                                fontWeight: 600,
                                textTransform: "uppercase",
                                letterSpacing: "1px",
                                transition: "all 0.2s",
                            })
                        )}
                    </div>

                    {}
                    <div
                        className="bg-(--bg-secondary) w-80 p-8 border border-(--border-color) flex flex-col rounded-lg" 
                    >
                        <h4
                            className="text-(--text-primary) text-[1.4rem] mb-2 font-mono" 
                        >
                            Cosmetics Pass
                        </h4>
                        <div
                            className="text-[1.8rem] font-black text-(--text-primary) mb-4" 
                        >
                            $10{" "}
                            <span
                                className="text-[0.9rem] text-(--text-muted) font-normal" 
                            >
                                / Month
                            </span>
                        </div>
                        <p
                            className="text-(--text-muted) text-[0.9rem] mb-8 grow leading-[1.6]" 
                        >
                            Unlock high-end dynamic name colors and CSS
                            animation effects across the entire forum
                            architecture.
                        </p>
                        {user?.colorPassExpiry &&
                        new Date(user.colorPassExpiry) > new Date() ? (
                            <button
                                className="bg-(--bg-tertiary) text-(--text-muted) border border-(--border-color) cursor-not-allowed w-full p-4 rounded-lg font-semibold uppercase tracking-[1px] flex items-center justify-center gap-2" 
                                disabled
                            >
                                <CheckCircle2 size={16} /> Subscribed
                            </button>
                        ) : (
                            renderPurchaseBtn("SUB_COSMETICS", "Subscribe", {
                                width: "100%",
                                padding: "1rem",
                                borderRadius: "0.5rem",
                                border: "1px solid var(--border-color)",
                                background: "var(--text-primary)",
                                color: "var(--bg-primary)",
                                cursor: "pointer",
                                fontWeight: 600,
                                textTransform: "uppercase",
                                letterSpacing: "1px",
                                transition: "all 0.2s",
                            })
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
