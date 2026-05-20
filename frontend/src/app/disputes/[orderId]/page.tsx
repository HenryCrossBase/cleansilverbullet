"use client";
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
    Form,
    FormControl,
    FormField,
    FormItem,
    FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { postApiMarketDisputeOrderIdReplyBody } from "@/service/api/zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Scale } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const replySchema = postApiMarketDisputeOrderIdReplyBody.extend({
    message: z.string().min(1, "Message cannot be empty."),
});

type ReplyFormValues = z.infer<typeof replySchema>;

export default function DisputeHub() {
    const [dispute, setDispute] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<any>(null);
    const [confirmTarget, setConfirmTarget] = useState<{
        message: string;
        action: () => void;
    } | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const params = useParams();

    const form = useForm<ReplyFormValues>({
        resolver: zodResolver(replySchema),
        defaultValues: { message: "" },
    });

    const fetchDispute = async () => {
        if (!params?.orderId) return;
        try {
            const res = await fetch(`/api/market/dispute/${params.orderId}`, {
                headers: {
                    Authorization: `Bearer ${document.cookie.replace(/(?:(?:^|.*;\s*)sb_token\s*\=\s*([^;]*).*$)|^.*$/, "$1")}`,
                },
            });
            if (res.ok) {
                const data = await res.json();
                setDispute(data.dispute);
            } else {
                const text = await res.text();
                console.error(
                    `Failed to load dispute check logs: ${res.status} ${text}`,
                );
                router.push("/purchases");
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchCurrentUser = async () => {
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

    useEffect(() => {
        if (!params?.orderId) return;
        fetchDispute();
        fetchCurrentUser();

        const interval = setInterval(fetchDispute, 5000);
        return () => clearInterval(interval);
    }, [params?.orderId]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [dispute?.messages]);

    const handleReply = async (values: ReplyFormValues) => {
        try {
            const res = await fetch(
                `/api/market/dispute/${params.orderId}/reply`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${document.cookie.replace(/(?:(?:^|.*;\s*)sb_token\s*\=\s*([^;]*).*$)|^.*$/, "$1")}`,
                    },
                    body: JSON.stringify({ message: values.message }),
                },
            );
            const data = await res.json();
            if (res.ok) {
                form.reset();
                fetchDispute();
            } else {
                toast.error("Something went wrong");
            }
        } catch (err) {
            toast.error("Something went wrong");
        }
    };

    const arbitrateDispute = (action: "APPROVE" | "REJECT") => {
        setConfirmTarget({
            message: `Are you sure you want to officially ${action} this dispute?`,
            action: async () => {
                try {
                    const res = await fetch(
                        `/api/market/dispute/${params.orderId}/resolve`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${document.cookie.replace(/(?:(?:^|.*;\s*)sb_token\s*\=\s*([^;]*).*$)|^.*$/, "$1")}`,
                            },
                            body: JSON.stringify({ action }),
                        },
                    );
                    const data = await res.json();
                    if (res.ok) {
                        toast.success("Done");
                        fetchDispute();
                    } else {
                        toast.error("Something went wrong");
                    }
                } catch (err) {
                    toast.error("Something went wrong");
                }
            },
        });
    };

    if (loading)
        return (
            <div className="text-foreground text-center p-20 font-bold font-mono">
                Establishing Secure Link to Hub...
            </div>
        );
    if (!dispute)
        return (
            <div className="text-red-500 text-center p-20 font-bold font-mono">
                Error: Dispute not found.{" "}
                <Button
                    variant="link"
                    onClick={() => router.push("/purchases")}
                >
                    Go Back
                </Button>
            </div>
        );
    if (!currentUser)
        return (
            <div className="text-red-500 text-center p-20 font-bold font-mono">
                Error: Establishing User session failed.
            </div>
        );
    const isAdmin = currentUser?.rank === "ADMIN";

    return (
        <div className="bg-background h-screen pt-24 pb-8 flex flex-col overflow-hidden">
            <div className="flex-1 max-w-5xl w-full mx-auto flex flex-col px-4 md:px-8 min-h-0">
                <Button
                    variant="outline"
                    size="sm"
                    className="self-start mb-6 uppercase tracking-wider font-bold rounded-lg shadow-sm border-border/30"
                    onClick={() =>
                        router.push(
                            isAdmin
                                ? "/vendor/dashboard"
                                : currentUser.id === dispute.vendorId
                                  ? "/vendor/dashboard"
                                  : "/purchases",
                        )
                    }
                >
                    ← Return to{" "}
                    {isAdmin
                        ? "Mod Hub"
                        : currentUser.id === dispute.vendorId
                          ? "Dashboard"
                          : "Ledger"}
                </Button>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-border/30 mb-6 gap-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-card shadow-sm border border-border/30 flex items-center justify-center text-foreground">
                            <Scale size={24} />
                        </div>
                        <div>
                            <div className="text-muted-foreground text-xs font-bold uppercase tracking-widest mb-1">
                                SECURE CHANNEL ENCRYPTED
                            </div>
                            <h1 className="text-foreground text-4xl m-0 font-bold tracking-tight">
                                DISPUTE HUB
                            </h1>
                        </div>
                    </div>
                    <div className="text-left md:text-right">
                        <div className="text-muted-foreground text-sm font-bold uppercase tracking-wider mb-1">
                            Ticket Status
                        </div>
                        {dispute.status === "OPEN" && (
                            <div className="text-yellow-500 font-bold text-xl uppercase tracking-wider">
                                PENDING
                            </div>
                        )}
                        {dispute.status === "REFUND_APPROVED" && (
                            <div className="text-red-500 font-bold text-xl uppercase tracking-wider">
                                CLOSED - REFUNDED
                            </div>
                        )}
                        {dispute.status === "REFUND_REJECTED" && (
                            <div className="text-emerald-500 font-bold text-xl uppercase tracking-wider">
                                CLOSED - NOT REFUNDED
                            </div>
                        )}
                    </div>
                </div>

                {isAdmin && dispute.status === "OPEN" && (
                    <div className="bg-card border-2 border-dashed border-border/30 p-6 rounded-2xl mb-6 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 shadow-sm">
                        <div>
                            <div className="text-foreground font-bold text-lg mb-1 flex items-center gap-2 uppercase tracking-wider">
                                <AlertTriangle size={20} className="text-yellow-500" /> ADMIN ARBITRATION
                                DECK
                            </div>
                            <div className="text-muted-foreground text-sm font-medium">
                                You have absolute executive authority over this
                                transaction. Action is permanent.
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <Button className="rounded-lg shadow-sm font-bold uppercase tracking-wider" onClick={() => arbitrateDispute("APPROVE")}>
                                APPROVE REFUND
                            </Button>
                            <Button
                                variant="outline"
                                className="rounded-lg shadow-sm font-bold uppercase tracking-wider border-border/30"
                                onClick={() => arbitrateDispute("REJECT")}
                            >
                                REJECT DISPUTE
                            </Button>
                        </div>
                    </div>
                )}

                <div className="flex-1 bg-card shadow-inner border border-border/30 rounded-2xl overflow-y-auto p-6 md:p-8 flex flex-col gap-6 mb-6 min-h-0 relative">
                    {dispute.messages.map((msg: any, index: number) => {
                        const isMe = msg.senderId === currentUser.id;
                        const isSystem = msg.senderRank === "ADMIN_SYSTEM";

                        let ribbonColor = "text-muted-foreground"; // Buyer default
                        if (msg.senderId === dispute.vendorId)
                            ribbonColor = "text-foreground"; // Vendor
                        if (msg.senderRank === "ADMIN" || isSystem)
                            ribbonColor = "text-foreground"; // Admin

                        if (isSystem) {
                            return (
                                <div
                                    key={msg.id}
                                    className="flex justify-center my-4 mx-0"
                                >
                                    <div className="bg-background/50 border border-border/30 text-foreground py-3 px-8 rounded-full text-sm font-bold font-mono shadow-sm">
                                        {msg.message}
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div
                                key={msg.id}
                                className={cn(
                                    "max-w-3/4 flex flex-col transition-all duration-300",
                                    isMe ? "self-end items-end" : "self-start items-start",
                                )}
                            >
                                <div
                                    className={cn(
                                        "flex items-center gap-3 mb-2",
                                        isMe ? "justify-end" : "justify-start",
                                    )}
                                >
                                    <span
                                        className={cn("text-xs font-bold uppercase tracking-wider", ribbonColor)}
                                    >
                                        {msg.senderId === dispute.buyerId ? (
                                            `Buyer${currentUser.rank === "ADMIN" ? ` • ${dispute.buyerName || "Unknown"}` : ""}`
                                        ) : msg.senderId ===
                                          dispute.vendorId ? (
                                            `Vendor${currentUser.rank === "ADMIN" ? ` • ${dispute.vendorName || "Unknown"}` : ""}`
                                        ) : msg.senderName ? (
                                            <span>
                                                Administrator •{" "}
                                                <Link
                                                    href={`/user/${msg.senderName}`}
                                                    className="text-foreground underline"
                                                >
                                                    {msg.senderName}
                                                </Link>{" "}
                                                <span className="text-yellow-500">
                                                    (Score: +
                                                    {msg.adminReputation || 0})
                                                </span>
                                            </span>
                                        ) : (
                                            "Administrator"
                                        )}
                                    </span>
                                    <span className="text-muted-foreground text-xs font-mono font-bold">
                                        {new Date(
                                            msg.createdAt,
                                        ).toLocaleString()}
                                    </span>
                                </div>
                                <div
                                    className={cn(
                                        "p-4 rounded-2xl text-foreground text-sm font-medium leading-relaxed shadow-sm",
                                        isMe ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-background border border-border/30 rounded-tl-sm",
                                    )}
                                >
                                    {msg.message}
                                </div>
                            </div>
                        );
                    })}
                    <div ref={chatEndRef} />
                </div>

                {dispute.status === "OPEN" ? (
                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(handleReply)}
                            className="flex gap-4 bg-card p-3 rounded-2xl border border-border/30 shadow-sm"
                        >
                            <FormField
                                control={form.control}
                                name="message"
                                render={({ field }) => (
                                    <FormItem className="flex-1 space-y-0">
                                        <FormControl>
                                            <Textarea
                                                className="flex-1 bg-background/50 border-0 text-foreground p-4 rounded-xl resize-none h-16 font-mono text-sm focus-visible:ring-0 focus-visible:bg-background transition-all shadow-inner"
                                                placeholder="Transmit your message to the thread..."
                                                onKeyDown={(e) => {
                                                    if (
                                                        e.key === "Enter" &&
                                                        !e.shiftKey
                                                    ) {
                                                        e.preventDefault();
                                                        form.handleSubmit(
                                                            handleReply,
                                                        )();
                                                    }
                                                }}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button
                                type="submit"
                                className="px-10 font-bold uppercase tracking-wider rounded-xl h-16 shadow-md transition-transform active:scale-95"
                            >
                                SEND
                            </Button>
                        </form>
                    </Form>
                ) : (
                    <div className="bg-card border border-border/30 text-muted-foreground p-6 text-center rounded-2xl text-sm font-bold shadow-sm uppercase tracking-wider">
                        This dispute has been closed by an Administrator.
                    </div>
                )}
            </div>

            <AlertDialog
                open={!!confirmTarget}
                onOpenChange={(open) => !open && setConfirmTarget(null)}
            >
                <AlertDialogContent className="bg-card border-border/30 rounded-2xl shadow-xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-bold uppercase tracking-wider text-foreground">
                            CONFIRMATION REQUIRED
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground">
                            {confirmTarget?.message}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-lg shadow-sm font-bold uppercase tracking-wider">CANCEL</AlertDialogCancel>
                        <AlertDialogAction
                            className="rounded-lg shadow-sm font-bold uppercase tracking-wider"
                            onClick={() => {
                                confirmTarget?.action();
                                setConfirmTarget(null);
                            }}
                        >
                            PROCEED
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
