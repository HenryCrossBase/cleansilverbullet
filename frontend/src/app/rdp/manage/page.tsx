"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Server, Clock, AlertTriangle, Terminal, ArrowLeft } from "lucide-react";

type RDPOrder = {
    id: string;
    plan: {
        name: string;
        country: string;
        price: number;
    };
    status: string;
    rdpDetails: string | null;
    expiresAt: string | null;
    createdAt: string;
};

export default function ManageRDPs() {
    const [orders, setOrders] = useState<RDPOrder[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const res = await fetch("/api/rdp/my-orders", {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token") || ""}`
                    }
                });
                const data = await res.json();
                if (data.orders) {
                    setOrders(data.orders);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchOrders();
    }, []);

    const isExpiringSoon = (expiresAt: string | null) => {
        if (!expiresAt) return false;
        const expiryDate = new Date(expiresAt);
        const today = new Date();
        const diffTime = expiryDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 && diffDays <= 10;
    };

    if (loading) {
        return <div className="py-20 text-center text-(--text-muted)">Loading your servers...</div>;
    }

    return (
        <div className="pb-10 pt-20 sm:pb-12 sm:pt-24 md:pb-16 md:pt-28 max-w-6xl mx-auto px-4">
            <div className="mb-8">
                <Link href="/rdp" className="inline-flex items-center text-sm text-muted-foreground hover:text-emerald-500 transition-colors mb-6">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Store
                </Link>
                <h1 className="text-3xl font-mono text-(--text-primary) flex items-center gap-3">
                    <Terminal className="w-8 h-8 text-emerald-500" />
                    MY RDP SERVERS
                </h1>
                <p className="mt-2 text-sm text-(--text-muted)">
                    Manage your active Remote Desktop Protocol subscriptions.
                </p>
            </div>

            {orders.length === 0 ? (
                <div className="text-center py-20 bg-card/50 border border-border rounded-xl">
                    <Server className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium text-foreground">No Servers Found</h3>
                    <p className="text-sm text-muted-foreground mt-2 mb-6">You don't have any active RDP subscriptions.</p>
                    <Link href="/rdp" className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-medium rounded-lg transition-colors">
                        Browse RDP Plans
                    </Link>
                </div>
            ) : (
                <div className="grid gap-6">
                    {orders.map((order) => {
                        const expiring = isExpiringSoon(order.expiresAt);
                        
                        return (
                            <div key={order.id} className="rounded-xl border border-border bg-card shadow-lg overflow-hidden">
                                <div className="border-b border-border bg-background/50 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                                                {order.plan.name}
                                                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-white/10 text-muted-foreground">
                                                    {order.plan.country}
                                                </span>
                                            </h3>
                                            <span className={`text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wide ${
                                                order.status === "ACTIVE" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                                                order.status === "PENDING" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                                                "bg-red-500/20 text-red-400 border border-red-500/30"
                                            }`}>
                                                {order.status}
                                            </span>
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1 font-mono">
                                            Order ID: {order.id}
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col sm:items-end">
                                        {order.expiresAt ? (
                                            <>
                                                <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                                                    <Clock className="w-4 h-4" />
                                                    Expires: <span className="text-foreground">{new Date(order.expiresAt).toLocaleDateString()}</span>
                                                </div>
                                                {expiring && (
                                                    <div className="text-xs text-amber-400 mt-1 flex items-center gap-1">
                                                        <AlertTriangle className="w-3.5 h-3.5" />
                                                        Expiring soon! Ensure you have ${order.plan.price} BLT.
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="text-sm text-muted-foreground">
                                                Awaiting Fulfillment...
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="p-6">
                                    <h4 className="text-sm font-medium text-foreground mb-3 border-b border-border pb-2">Credentials & Access Details</h4>
                                    {order.status === "PENDING" ? (
                                        <div className="text-sm text-muted-foreground italic flex items-center gap-2">
                                            <div className="w-4 h-4 rounded-full border-2 border-amber-500 border-t-transparent animate-spin"></div>
                                            Your server is being provisioned. Credentials will appear here shortly.
                                        </div>
                                    ) : order.rdpDetails ? (
                                        <div className="bg-black/50 border border-white/10 rounded-lg p-4 font-mono text-sm text-emerald-400 break-words whitespace-pre-wrap">
                                            {order.rdpDetails}
                                        </div>
                                    ) : (
                                        <div className="text-sm text-muted-foreground italic">
                                            No details provided by the system.
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
