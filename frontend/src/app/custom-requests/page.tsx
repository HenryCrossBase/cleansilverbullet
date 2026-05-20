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
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { postApiRequestsSubmitBody } from "@/service/api/zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Box, Clock, Lock, Send, Shield, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const requestSchema = postApiRequestsSubmitBody.extend({
    title: z
        .string()
        .min(3, "Title must be at least 3 characters.")
        .max(150, "Title must be at most 150 characters."),
    description: z
        .string()
        .min(10, "Description must be at least 10 characters.")
        .max(5000, "Description must be at most 5000 characters."),
});

type RequestFormValues = z.infer<typeof requestSchema>;

export default function CustomRequests() {
    const [requests, setRequests] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);
    const [submitting, setSubmitting] = useState(false);

    // Modal State
    const [notifyModalOpen, setNotifyModalOpen] = useState(false);
    const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
    const [notifyProductId, setNotifyProductId] = useState("");
    const [notifying, setNotifying] = useState(false);
    const [fulfilledRequests, setFulfilledRequests] = useState<
        Record<string, boolean>
    >({});

    const form = useForm<RequestFormValues>({
        resolver: zodResolver(requestSchema),
        defaultValues: { title: "", description: "" },
    });

    useEffect(() => {
        const storedUser = localStorage.getItem("sb_user");
        if (storedUser) setUser(JSON.parse(storedUser));

        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const res = await fetch("/api/requests");
            const data = await res.json();
            if (data.success) {
                setRequests(data.requests);
            }
        } catch {
            toast.error("Network interference detected.");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (values: RequestFormValues) => {
        setSubmitting(true);
        const token = document.cookie.replace(
            /(?:(?:^|.*;\s*)sb_token\s*\=\s*([^;]*).*$)|^.*$/,
            "$1",
        );

        try {
            const res = await fetch("/api/requests/submit", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    title: values.title,
                    description: values.description,
                }),
            });
            const data = await res.json();

            if (data.success) {
                toast.success(
                    "Request securely transmitted! Pending Administration Approval.",
                );
                form.reset();
            } else {
                toast.error(data.error || "Failed to submit request.");
            }
        } catch {
            toast.error("Transmission failure.");
        } finally {
            setSubmitting(false);
        }
    };

    const openNotifyModal = (id: string) => {
        setActiveRequestId(id);
        setNotifyProductId("");
        setNotifyModalOpen(true);
    };

    const submitNotify = async () => {
        if (!activeRequestId || !notifyProductId) return;

        setNotifying(true);
        const id = activeRequestId;

        try {
            const token = document.cookie.replace(
                /(?:(?:^|.*;\s*)sb_token\s*\=\s*([^;]*).*$)|^.*$/,
                "$1",
            );
            const res = await fetch(`/api/requests/${id}/notify`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ productId: notifyProductId }),
            });
            const data = await res.json();

            if (data.success) {
                toast.success("Target acquired and notified successfully.");
                setFulfilledRequests((prev) => ({ ...prev, [id]: true }));
            } else {
                toast.error(data.error || "Failed to notify.");
            }
        } catch (e) {
            toast.error("Network interference detected.");
        } finally {
            setNotifying(false);
            setNotifyModalOpen(false);
            setActiveRequestId(null);
        }
    };

    return (
        <div className="min-h-screen px-4 md:px-8 pt-32 pb-16 font-sans flex flex-col gap-12 w-full max-w-[1600px] mx-auto box-border">
            <div className="text-center w-full max-w-3xl mx-auto">
                <h1 className="glow-text text-4xl md:text-5xl font-black uppercase tracking-tight flex items-center justify-center gap-4 m-0">
                    <Shield size={42} className="text-primary" /> Custom
                    Requests
                </h1>
                <p className="text-muted-foreground text-lg mt-6 leading-relaxed">
                    Submit autonomous inquiries for specific tools, databases,
                    or services. All payloads are highly anonymized to protect
                    requester identity.
                </p>
            </div>

            {user ? (
                <Form {...form}>
                    <form
                        onSubmit={form.handleSubmit(handleSubmit)}
                        className="rounded-3xl border border-border/50 bg-card/60 shadow-2xl backdrop-blur-xl overflow-hidden max-w-3xl mx-auto w-full relative"
                    >
                        <div className="bg-muted/30 border-b border-border/50 px-8 py-6 flex items-center gap-3">
                            <Lock size={20} className="text-primary" />
                            <h2 className="text-xl font-bold text-foreground tracking-wide m-0">
                                SECURE SUBMISSION TERMINAL
                            </h2>
                        </div>

                        <div className="p-8 flex flex-col gap-8">
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                                            Target
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="e.g. Netflix Premium Checker API"
                                                className="w-full bg-background border border-border text-foreground py-4 px-5 rounded-xl outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono text-sm shadow-sm h-auto"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
                                            Specifications
                                        </FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Describe what exactly is required..."
                                                rows={5}
                                                className="w-full bg-background border border-border text-foreground py-4 px-5 rounded-xl outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-y font-mono text-sm shadow-sm"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="pt-4 mt-2 flex justify-end">
                                <Button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-8 py-6 rounded-xl font-bold uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 transition-all shadow-md active:scale-95 flex items-center gap-3 w-full md:w-auto"
                                >
                                    {submitting ? "Encrypting..." : "Transmit Request"}
                                    <Send size={18} />
                                </Button>
                            </div>
                        </div>
                    </form>
                </Form>
            ) : (
                <div className="text-center p-7.5 bg-(--bg-secondary) border-[1px_dashed_var(--border-color)] rounded-lg max-w-150 mx-auto w-full">
                    <p className="text-(--text-secondary)">
                        You must establish a secure connection to submit
                        requests.
                    </p>
                    <Button
                        variant="outline"
                        className="mt-3.75"
                        onClick={() => (window.location.href = "/auth/login")}
                    >
                        Initialize Session
                    </Button>
                </div>
            )}

            {}
            <div className="max-w-250 mt-7.5 mr-auto mb-0 pl-auto w-full">
                <h3 className="text-[1.4rem] border-b border-b-(--border-color) pb-2.5 mb-6.25 flex items-center gap-2.5 text-(--text-primary)">
                    <Box size={22} color="var(--accent-silver)" /> Requested
                    Tools
                </h3>

                {loading ? (
                    <p className="text-center text-(--text-secondary)">
                        Decrypting network packets...
                    </p>
                ) : requests.length === 0 ? (
                    <div className="p-10 text-center bg-(--bg-secondary) rounded-lg border border-(--border-color)">
                        <p className="text-(--text-muted)">
                            No localized transmissions found on the grid.
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                        {requests.map((r, i) => (
                            <div
                                key={i}
                                className="rounded-xl border border-border/50 bg-card/40 shadow-md backdrop-blur-sm p-6 flex flex-col gap-4 relative transition-all duration-300 hover:-translate-y-1 hover:border-primary/50"
                            >
                                <div className="flex justify-between items-start">
                                    <h4 className="m-0 text-lg font-bold text-foreground leading-tight">
                                        {r.title}
                                    </h4>
                                </div>

                                <div className="p-4 bg-muted/30 rounded-md border-l-4 border-l-primary/60">
                                    <p className="m-0 text-muted-foreground text-sm leading-relaxed font-mono">
                                        {r.description}
                                    </p>
                                </div>

                                <div className="mt-auto flex flex-col gap-4 pt-4 border-t border-border/50">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-1.5 text-emerald-500 text-xs font-bold uppercase tracking-widest bg-emerald-500/10 py-1.5 px-2.5 rounded-md">
                                            <User size={14} /> {r.requestor}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-muted-foreground text-xs font-mono">
                                            <Clock size={14} />{" "}
                                            {new Date(
                                                r.createdAt,
                                            ).toLocaleDateString()}
                                        </div>
                                    </div>

                                    {}
                                    {user &&
                                        (user.rank === "ENTERPRISE" ||
                                            user.rank === "ADMIN") && (
                                            <Button
                                                variant={
                                                    fulfilledRequests[r.id]
                                                        ? "default"
                                                        : "outline"
                                                }
                                                size="sm"
                                                onClick={() =>
                                                    openNotifyModal(r.id)
                                                }
                                                disabled={
                                                    fulfilledRequests[r.id]
                                                }
                                                className={cn(
                                                    "w-full mt-1.25 uppercase",
                                                    fulfilledRequests[r.id] &&
                                                        "bg-green-500 text-black hover:bg-green-500",
                                                )}
                                            >
                                                {fulfilledRequests[r.id]
                                                    ? "✓ Fulfilled"
                                                    : "Notify Buyer (Fulfilled)"}
                                            </Button>
                                        )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <Dialog
                open={notifyModalOpen}
                onOpenChange={(open) => !open && setNotifyModalOpen(false)}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2.5">
                            <Shield size={20} color="var(--accent-silver)" />{" "}
                            Fulfill Request
                        </DialogTitle>
                    </DialogHeader>
                    <p className="m-0 text-(--text-secondary) text-[0.9rem] leading-normal">
                        Enter the exact{" "}
                        <strong className="text-(--text-primary)">
                            Product ID
                        </strong>{" "}
                        that fulfills this buyer's transmission.
                    </p>
                    <Input
                        type="text"
                        value={notifyProductId}
                        onChange={(e) => setNotifyProductId(e.target.value)}
                        placeholder="Product ID (e.g. prd_123456789)"
                        className="font-mono h-auto py-3 px-3.75"
                        autoFocus
                    />
                    <div className="flex gap-2.5 justify-end mt-2.5">
                        <Button
                            variant="outline"
                            onClick={() => setNotifyModalOpen(false)}
                        >
                            Abort
                        </Button>
                        <Button
                            disabled={notifying || !notifyProductId}
                            onClick={submitNotify}
                            className="gap-2"
                        >
                            {notifying ? "Encrypting..." : "Transmit Data"}{" "}
                            <Send size={14} />
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
