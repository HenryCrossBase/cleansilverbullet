"use client";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
    getApiUserPurchases,
    postApiMarketDisputeReport,
    postApiMarketReviewProductId,
} from "@/service/api";
import { postApiMarketDisputeReportBody } from "@/service/api/zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    AlertTriangle,
    CheckCircle2,
    FileText,
    LockIcon,
    Star,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const disputeSchema = postApiMarketDisputeReportBody
    .pick({ initialMessage: true })
    .extend({
        initialMessage: z.string().min(1, "An initial message is required."),
    });

type DisputeFormValues = z.infer<typeof disputeSchema>;

function EscrowTimer({
    receipt,
    setDisputeTarget,
}: {
    receipt: any;
    setDisputeTarget: (r: any) => void;
}) {
    const [timeLeftDisplay, setTimeLeftDisplay] = useState("0:00");
    const [isDisputable, setIsDisputable] = useState(false);
    const [isWaiting, setIsWaiting] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date().getTime();
            let baseDate = new Date(receipt.purchasedAt).getTime();
            
            const isCheckerTarget = receipt.productName?.toLowerCase().includes("pof");
            if (isCheckerTarget) {
                if (receipt.checkStatus === "INVALID_FINAL" && receipt.checkCompletedAt) {
                    baseDate = new Date(receipt.checkCompletedAt).getTime();
                } else {
                    setIsWaiting(false);
                    setIsDisputable(false);
                    return;
                }
            }

            const waitTimeMs = 90 * 1000;
            const disputeWindowMs = 5 * 60 * 1000;
            const timeSinceBase = now - baseDate;

            if (timeSinceBase < waitTimeMs) {
                setIsWaiting(true);
                setIsDisputable(false);
                setTimeLeftDisplay("5:00");
            } else {
                setIsWaiting(false);
                const timeLeftMs = Math.max(0, baseDate + waitTimeMs + disputeWindowMs - now);
                setIsDisputable(timeLeftMs > 0);
                const m = Math.floor(timeLeftMs / 60000);
                const s = Math.floor((timeLeftMs % 60000) / 1000);
                setTimeLeftDisplay(`${m}:${s.toString().padStart(2, "0")}`);
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [receipt.purchasedAt, receipt.checkCompletedAt, receipt.checkStatus, receipt.productName]);

    const isCurrentlyDisputed = !!receipt.dispute;

    const isCheckerTarget = receipt.productName?.toLowerCase().includes("pof");

    if (isCheckerTarget) {
        if (isCurrentlyDisputed) {
            return (
                <div className="bg-card py-2 px-4 rounded-xl border border-border/30 flex gap-4 items-center shadow-sm">
                    <span className="text-foreground font-bold inline-flex items-center gap-2">
                        <AlertTriangle size={16} className="text-yellow-500" />
                        <span
                            className={cn(
                                "uppercase tracking-wider text-sm",
                                receipt.dispute.status === "REFUND_APPROVED"
                                    ? "text-red-500"
                                    : receipt.dispute.status === "REFUND_REJECTED"
                                        ? "text-emerald-500"
                                        : "text-yellow-500",
                            )}
                        >
                            {receipt.dispute.status === "OPEN"
                                ? "PENDING"
                                : receipt.dispute.status === "REFUND_APPROVED"
                                    ? "Refunded"
                                    : "Not Refunded"}
                        </span>
                    </span>
                    <Button
                        size="sm"
                        className="rounded-lg shadow-sm font-bold"
                        onClick={() => router.push(`/disputes/${receipt.id}`)}
                    >
                        View Chat
                    </Button>
                </div>
            );
        }

        if (receipt.checkStatus === "VALID") {
            return (
                <span className="text-emerald-500 font-bold text-sm flex items-center gap-1.5 uppercase tracking-wider bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                    <CheckCircle2 size={16} /> Finalized
                </span>
            );
        } else if (receipt.checkStatus === "INVALID_FINAL") {
            if (isWaiting) {
                // Fall through to default locked UI
            } else {
                return (
                    <div className="flex items-center gap-4">
                        <span className="text-red-500 font-bold text-sm flex items-center gap-1.5 uppercase tracking-wider bg-red-500/10 px-3 py-1.5 rounded-lg border border-red-500/20">
                            <AlertTriangle size={16} /> Invalid
                        </span>
                        {isDisputable && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="rounded-lg shadow-sm border-border/30 font-bold uppercase tracking-wider text-xs"
                                onClick={() => setDisputeTarget(receipt)}
                            >
                                Open Dispute
                            </Button>
                        )}
                    </div>
                );
            }
        } else {
            return (
                <span className="text-yellow-500 font-bold text-sm flex items-center gap-1.5 uppercase tracking-wider bg-yellow-500/10 px-3 py-1.5 rounded-lg border border-yellow-500/20">
                    <LockIcon size={14} /> Pending Check
                </span>
            );
        }
    }

    if (isCurrentlyDisputed) {
        return (
            <div className="bg-card py-2 px-4 rounded-xl border border-border/30 flex gap-4 items-center shadow-sm">
                <span className="text-foreground font-bold inline-flex items-center gap-2">
                    <AlertTriangle size={16} className="text-yellow-500" />
                    <span
                        className={cn(
                            "uppercase tracking-wider text-sm",
                            receipt.dispute.status === "REFUND_APPROVED"
                                ? "text-red-500"
                                : receipt.dispute.status === "REFUND_REJECTED"
                                    ? "text-emerald-500"
                                    : "text-yellow-500",
                        )}
                    >
                        {receipt.dispute.status === "OPEN"
                            ? "PENDING"
                            : receipt.dispute.status === "REFUND_APPROVED"
                                ? "Refunded"
                                : "Not Refunded"}
                    </span>
                </span>
                <Button
                    size="sm"
                    className="rounded-lg shadow-sm font-bold"
                    onClick={() => router.push(`/disputes/${receipt.id}`)}
                >
                    View Chat
                </Button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
                {isWaiting || isDisputable ? (
                    <>
                        <span className="text-foreground flex items-center gap-1.5 font-bold text-sm uppercase tracking-wider">
                            <LockIcon size={14} className="text-muted-foreground" /> Locked
                        </span>
                        <span className="text-muted-foreground font-mono font-bold">
                            {timeLeftDisplay}
                        </span>
                    </>
                ) : (
                    <span className="text-emerald-500 font-bold text-sm flex items-center gap-1.5 uppercase tracking-wider">
                        <CheckCircle2 size={16} /> Finalized
                    </span>
                )}
            </div>

            {isDisputable && !isWaiting && (
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="rounded-lg shadow-sm border-border/30 font-bold uppercase tracking-wider text-xs"
                        onClick={() => setDisputeTarget(receipt)}
                    >
                        Open Dispute
                    </Button>
                </div>
            )}
        </div>
    );
}

function ItemViewButton({
    receipt,
    onClick,
    onCheckClick,
}: {
    receipt: any;
    onClick: () => void;
    onCheckClick: () => void;
}) {
    const [timeLeftMs, setTimeLeftMs] = useState(0);

    const isCheckerTarget = receipt.productName?.toLowerCase().includes("pof");

    useEffect(() => {
        const updateTimer = () => {
            const now = new Date().getTime();
            let targetDate = new Date(receipt.purchasedAt).getTime();
            
            if (isCheckerTarget) {
                if (receipt.checkStatus === "INVALID_FINAL" && receipt.checkCompletedAt) {
                    targetDate = new Date(receipt.checkCompletedAt).getTime();
                } else {
                    setTimeLeftMs(0);
                    return;
                }
            }

            const left = Math.max(0, targetDate + 90 * 1000 - now);
            setTimeLeftMs(left);
        };
        updateTimer();
        const timer = setInterval(updateTimer, 1000);
        return () => clearInterval(timer);
    }, [receipt.purchasedAt, receipt.checkCompletedAt, receipt.checkStatus, isCheckerTarget]);

    if (isCheckerTarget && (receipt.checkStatus === "UNCHECKED" || !receipt.checkStatus || receipt.checkStatus === "INVALID_1")) {
        return (
            <Button
                variant="outline"
                size="sm"
                className="tracking-wider uppercase font-bold text-xs rounded-lg shadow-sm border-border/30 min-w-[100px] hover:bg-foreground hover:text-background transition-colors"
                onClick={onCheckClick}
            >
                {receipt.checkStatus === "INVALID_1" ? "Check Again" : "Check Account"}
            </Button>
        );
    }

    const isLocked = timeLeftMs > 0 && receipt.checkStatus !== "VALID";

    if (isLocked) {
        const s = Math.ceil(timeLeftMs / 1000);
        return (
            <Button
                variant="outline"
                size="sm"
                disabled
                className="tracking-wider uppercase font-bold text-xs rounded-lg shadow-sm border-border/30 min-w-[100px] bg-muted/50"
            >
                Wait {s}s
            </Button>
        );
    }

    return (
        <Button
            variant="outline"
            size="sm"
            className="tracking-wider uppercase font-bold text-xs rounded-lg shadow-sm border-border/30 min-w-[100px] hover:bg-foreground hover:text-background transition-colors"
            onClick={() => {
                if (receipt.logContent === "PENDING_SUPPORT_VERIFICATION") {
                    toast.error("Please refresh the page to view the item.");
                    setTimeout(() => window.location.reload(), 1500);
                } else {
                    onClick();
                }
            }}
        >
            View Item
        </Button>
    );
}


export default function PurchasesLedger() {
    const [purchases, setPurchases] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [disputeTarget, setDisputeTarget] = useState<any | null>(null);
    const [activePayloadTarget, setActivePayloadTarget] = useState<any | null>(
        null,
    );
    const [proxyModalTarget, setProxyModalTarget] = useState<any | null>(null);
    const [checkingProxy, setCheckingProxy] = useState(false);

    const disputeForm = useForm<DisputeFormValues>({
        resolver: zodResolver(disputeSchema),
        defaultValues: { initialMessage: "" },
    });

    const handleSubmitReview = async (
        productId: string,
        orderId: string,
        score: number,
    ) => {
        try {
            await postApiMarketReviewProductId(productId, { score, orderId });
            const updatedPurchases = purchases.map((p) =>
                p.id === orderId ? { ...p, userScore: score } : p,
            );
            setPurchases(updatedPurchases);
            toast.success("Verified Rating Imprinted.");
        } catch (err: any) {
            toast.error(err.message || "Injection Failed.");
        }
    };

    const handleOpenDispute = async (values: DisputeFormValues) => {
        try {
            const d: any = await postApiMarketDisputeReport({
                orderId: disputeTarget.id,
                initialMessage: values.initialMessage,
            });
            toast.success(d?.message || "Dispute opened.");
            setTimeout(() => window.location.reload(), 1500);
        } catch (e: any) {
            toast.error(`Network Error: ${e.message}`);
        }
    };

    const handleDisputeClose = () => {
        setDisputeTarget(null);
        disputeForm.reset();
    };

    useEffect(() => {
        const fetchLedger = async () => {
            try {
                const data: any = await getApiUserPurchases();
                setPurchases(data?.purchases || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchLedger();
    }, []);

    if (loading)
        return (
            <div className="text-foreground text-center p-20 font-mono font-bold text-lg">
                Accessing Encrypted Ledger...
            </div>
        );

    return (
        <main className="min-h-screen bg-background">
            <div className="container max-w-6xl my-16 mx-auto py-0 px-4 md:px-8">
                <div className="flex items-center gap-4 mb-8 border-b border-border/30 pb-6">
                    <div className="w-2 h-8 bg-foreground rounded-sm"></div>
                    <h1 className="text-3xl text-foreground m-0 font-bold tracking-tight uppercase">
                        Your Purchased Items
                    </h1>
                    <div className="ml-auto text-muted-foreground font-bold uppercase tracking-wider text-sm">
                        {(purchases || []).length} Items Purchased
                    </div>
                </div>

                {!(purchases && purchases.length > 0) ? (
                    <div className="text-center p-16 bg-card border border-border/30 rounded-2xl shadow-sm text-muted-foreground font-medium text-lg">
                        No purchased items found. Visit the{" "}
                        <Link
                            href="/market"
                            className="text-foreground underline font-bold"
                        >
                            Marketplace
                        </Link>
                        .
                    </div>
                ) : (
                    <div className="flex flex-col gap-4">
                        <div className="bg-card p-6 border border-border/30 text-center text-muted-foreground font-semibold rounded-2xl shadow-sm flex items-center justify-center gap-3">
                            <AlertTriangle size={20} className="text-yellow-500" /> You have exactly 5
                            minutes from purchase to open a dispute. Otherwise,
                            the item cannot be refunded.
                        </div>

                        {(purchases || []).map((receipt) => (
                            <div
                                key={receipt.id}
                                className="bg-card rounded-2xl shadow-sm border border-border/30 border-l-4 border-l-foreground flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 p-6 transition-all duration-200 hover:-translate-y-1 hover:shadow-md relative"
                            >
                                <div className="flex flex-1 min-w-[200px] flex-col">
                                    <h3 className="text-foreground mt-0 mr-0 mb-1 pl-0 text-lg font-bold tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
                                        {receipt.productName}
                                    </h3>
                                    <div className="text-muted-foreground text-xs uppercase tracking-wider font-bold whitespace-nowrap overflow-hidden text-ellipsis">
                                        Vendor{" "}
                                        <strong className="text-foreground">
                                            {receipt.shopName}
                                        </strong>
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-4 xl:gap-6 w-full xl:w-auto justify-between xl:justify-end">
                                    <div className="text-muted-foreground text-sm font-mono font-bold bg-background/50 border border-border/30 py-2 px-4 rounded-lg whitespace-nowrap text-center">
                                        {new Date(
                                            receipt.purchasedAt,
                                        ).toLocaleString()}
                                    </div>

                                    <div className="text-foreground font-bold text-xl whitespace-nowrap font-mono text-right tracking-tight">
                                        -{receipt.pricePaid} BLT
                                    </div>

                                    <div className="flex items-center gap-2 bg-background/50 py-2 px-4 rounded-full border border-border/30 justify-center">
                                        {[1, 2, 3, 4, 5].map((star) => {
                                            const isLocked = receipt.userScore > 0;
                                            const isHighlighted =
                                                receipt.userScore >= star;
                                            return (
                                                <span
                                                    key={star}
                                                    onClick={() =>
                                                        !isLocked &&
                                                        handleSubmitReview(
                                                            receipt.productId,
                                                            receipt.id,
                                                            star,
                                                        )
                                                    }
                                                    className={cn(
                                                        "text-lg transition-all duration-200",
                                                        isHighlighted
                                                            ? "text-yellow-500"
                                                            : "text-muted",
                                                        isLocked
                                                            ? "cursor-default"
                                                            : "cursor-pointer",
                                                        isLocked && !isHighlighted
                                                            ? "opacity-30"
                                                            : "opacity-100",
                                                    )}
                                                    onMouseOver={(e) => {
                                                        if (!isLocked) {
                                                            e.currentTarget.style.color =
                                                                "#eab308";
                                                            e.currentTarget.style.transform =
                                                                "scale(1.2)";
                                                        }
                                                    }}
                                                    onMouseOut={(e) => {
                                                        if (!isLocked) {
                                                            e.currentTarget.style.color =
                                                                isHighlighted
                                                                    ? "#eab308"
                                                                    : "";
                                                            e.currentTarget.style.transform =
                                                                "scale(1)";
                                                        }
                                                    }}
                                                >
                                                    <Star
                                                        fill={
                                                            isHighlighted
                                                                ? "#eab308"
                                                                : "transparent"
                                                        }
                                                        size={18}
                                                    />
                                                </span>
                                            );
                                        })}
                                    </div>

                                    <div className="flex gap-4 items-center ml-auto xl:ml-0">
                                        <ItemViewButton
                                            receipt={receipt}
                                            onClick={() =>
                                                setActivePayloadTarget(receipt)
                                            }
                                            onCheckClick={() => setProxyModalTarget(receipt)}
                                        />
                                        <div className="w-px h-8 bg-border/50 hidden xl:block"></div>
                                        <EscrowTimer
                                            receipt={receipt}
                                            setDisputeTarget={setDisputeTarget}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activePayloadTarget && (
                    <Dialog
                        open={!!activePayloadTarget}
                        onOpenChange={(open) =>
                            !open && setActivePayloadTarget(null)
                        }
                    >
                        <DialogContent className="max-w-4xl bg-card border-border/30 rounded-2xl shadow-xl">
                            <DialogHeader>
                                <DialogTitle className="font-mono font-bold flex items-center gap-3 text-xl uppercase tracking-wider text-foreground">
                                    <FileText size={24} className="text-muted-foreground" /> Item Details
                                </DialogTitle>
                            </DialogHeader>

                            <div className="flex flex-col gap-4 mt-4">
                                {activePayloadTarget.logContent && activePayloadTarget.logContent !== "PENDING_SUPPORT_VERIFICATION" && (() => {
                                    let email = "";
                                    let password = "";
                                    let targetLink = activePayloadTarget.productName;
                                    let description = activePayloadTarget.description || "No description provided.";

                                    const content = activePayloadTarget.logContent;
                                    if (content.includes(" | ")) {
                                        const parts = content.split(" | ");
                                        if (parts.length >= 6) {
                                            description = parts[2];
                                            targetLink = parts[3];
                                            email = parts[4];
                                            password = parts.slice(5).join(" | ");
                                        } else {
                                            targetLink = parts[parts.length - 3] || targetLink;
                                            email = parts[parts.length - 2] || "";
                                            password = parts[parts.length - 1] || "";
                                            if (parts.length > 3) {
                                                description = parts.slice(0, parts.length - 3).join(" | ");
                                            }
                                        }
                                    } else if (content.includes(":")) {
                                        const parts = content.split(':');
                                        email = parts[0] || '';
                                        password = parts.slice(1).join(':') || '';
                                    } else {
                                        description = content;
                                    }


                                    return (
                                        <>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="bg-background/50 rounded-xl p-4 border border-border/30 shadow-sm">
                                                    <div className="text-muted-foreground text-xs uppercase tracking-widest font-bold mb-2">Email / Username</div>
                                                    <div className="text-foreground font-mono bg-black/20 p-3 rounded-lg border border-border/20 break-all select-all">
                                                        {email}
                                                    </div>
                                                </div>
                                                <div className="bg-background/50 rounded-xl p-4 border border-border/30 shadow-sm">
                                                    <div className="text-muted-foreground text-xs uppercase tracking-widest font-bold mb-2">Password</div>
                                                    <div className="text-foreground font-mono bg-black/20 p-3 rounded-lg border border-border/20 break-all select-all">
                                                        {password}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div className="bg-background/50 rounded-xl p-4 border border-border/30 shadow-sm">
                                                    <div className="text-muted-foreground text-xs uppercase tracking-widest font-bold mb-2">Target Link</div>
                                                    <div className="text-blue-400 font-mono bg-black/20 p-3 rounded-lg border border-border/20 break-all">
                                                        {targetLink}
                                                    </div>
                                                </div>
                                                <div className="bg-background/50 rounded-xl p-4 border border-border/30 shadow-sm">
                                                    <div className="text-muted-foreground text-xs uppercase tracking-widest font-bold mb-2">Description / Info</div>
                                                    <div className="text-foreground font-mono bg-black/20 p-3 rounded-lg border border-border/20 text-sm">
                                                        {description}
                                                    </div>
                                                </div>
                                            </div>
                                        </>
                                    );
                                })()}
                                {activePayloadTarget.logContent === "PENDING_SUPPORT_VERIFICATION" && (
                                    <div className="bg-background/50 rounded-xl p-6 border border-border/30 shadow-sm text-center flex flex-col items-center justify-center">
                                        <LockIcon size={32} className="text-muted-foreground mb-4" />
                                        <h3 className="text-lg font-bold text-foreground mb-2 uppercase tracking-wider">Item Locked</h3>
                                        <p className="text-muted-foreground">This item is currently undergoing support verification. Please wait.</p>
                                    </div>
                                )}
                            </div>

                            <div className="text-muted-foreground text-sm text-center mt-4 tracking-wider uppercase font-bold flex items-center justify-center gap-2">
                                <div className="w-2 h-2 bg-foreground rounded-full"></div>
                                Purchased from Shop:{" "}
                                <span className="text-foreground font-black">
                                    {activePayloadTarget.shopName}
                                </span>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}

                {disputeTarget && (
                    <Dialog
                        open={!!disputeTarget}
                        onOpenChange={(open) => !open && handleDisputeClose()}
                    >
                        <DialogContent className="max-w-2xl bg-card border-border/30 rounded-2xl shadow-xl">
                            <DialogHeader>
                                <DialogTitle className="font-mono font-bold text-xl uppercase tracking-wider text-foreground">
                                    Open Dispute
                                </DialogTitle>
                            </DialogHeader>
                            <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                                Opening a dispute requires admin manual review.
                                Please explain the issue with &quot;
                                <span className="font-bold text-foreground">{disputeTarget.productName}</span>&quot;.
                            </p>
                            <Form {...disputeForm}>
                                <form
                                    onSubmit={disputeForm.handleSubmit(
                                        handleOpenDispute,
                                    )}
                                    className="space-y-6"
                                >
                                    <FormField
                                        control={disputeForm.control}
                                        name="initialMessage"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Describe your issue..."
                                                        className="w-full h-48 bg-background/50 border border-border/30 rounded-xl font-mono text-sm p-4 resize-none focus-visible:ring-primary/50 text-foreground shadow-sm"
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                    <Button
                                        type="submit"
                                        className="w-full uppercase tracking-wider font-bold rounded-xl h-12 shadow-sm"
                                        disabled={disputeForm.formState.isSubmitting}
                                    >
                                        {disputeForm.formState.isSubmitting ? "Filing..." : "Submit Dispute"}
                                    </Button>
                                </form>
                            </Form>
                        </DialogContent>
                    </Dialog>
                )}

                {proxyModalTarget && (
                    <Dialog open={!!proxyModalTarget} onOpenChange={(open) => !open && setProxyModalTarget(null)}>
                        <DialogContent className="max-w-md bg-card border-border/30 rounded-2xl shadow-xl p-6">
                            <DialogHeader>
                                <DialogTitle className="font-mono font-bold flex items-center gap-3 text-xl uppercase tracking-wider text-foreground">
                                    Proxy Configuration
                                </DialogTitle>
                            </DialogHeader>
                            <form
                                className="flex flex-col gap-4 mt-4"
                                onSubmit={async (e) => {
                                    e.preventDefault();
                                    const formData = new FormData(e.currentTarget);
                                    const proxyString = formData.get("proxyString") as string;
                                    const proxyType = formData.get("proxyType") as string;
                                    if (!proxyString) {
                                        toast.error("Please enter a proxy string");
                                        return;
                                    }
                                    setCheckingProxy(true);
                                    try {
                                        const res = await fetch("/api/checkers/order", {
                                            method: "POST",
                                            headers: {
                                                "Content-Type": "application/json",
                                                Authorization: `Bearer ${localStorage.getItem("token")}`,
                                            },
                                            body: JSON.stringify({
                                                orderId: proxyModalTarget.id,
                                                proxyString,
                                                proxyType
                                            }),
                                        });
                                        const data = await res.json();
                                        if (res.ok) {
                                            if (data.status === "VALID") {
                                                toast.success("Account is Valid!");
                                            } else if (data.status === "INVALID") {
                                                toast.error("Account Invalid or Bad Password");
                                            } else {
                                                toast.error(data.message || "Proxy failed or blocked");
                                            }
                                            
                                            const updatedPurchases = purchases.map((p) =>
                                                p.id === proxyModalTarget.id ? { ...p, checkStatus: data.status } : p,
                                            );
                                            setPurchases(updatedPurchases);
                                            
                                            setTimeout(() => {
                                                setProxyModalTarget(null);
                                            }, 1500);
                                        } else {
                                            toast.error(data.error || data.message || "Failed to check account");
                                        }
                                    } catch (err: any) {
                                        toast.error("Network Error: " + err.message);
                                    } finally {
                                        setCheckingProxy(false);
                                    }
                                }}
                            >
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Proxy Protocol</label>
                                    <select name="proxyType" className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-bold" defaultValue="HTTP">
                                        <option value="HTTP" className="bg-card">HTTP/HTTPS</option>
                                        <option value="SOCKS5" className="bg-card">SOCKS5</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-xs uppercase tracking-widest font-bold text-muted-foreground">Proxy Endpoint</label>
                                    <input
                                        type="text"
                                        name="proxyString"
                                        placeholder="host:port:user:pass"
                                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 font-mono"
                                        required
                                    />
                                </div>
                                
                                <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-border/20">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => setProxyModalTarget(null)}
                                        className="font-bold uppercase tracking-wider text-xs shadow-sm"
                                        disabled={checkingProxy}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="font-bold uppercase tracking-wider text-xs shadow-sm"
                                        disabled={checkingProxy}
                                    >
                                        {checkingProxy ? "Connecting..." : "Launch Check"}
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                )}
            </div>
        </main>
    );
}
