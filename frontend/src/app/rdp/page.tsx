"use client";

import { useEffect, useState } from "react";

import Link from "next/link";
import Image from "next/image";
import { CreditCard, Globe, Server, CheckCircle2, Info } from "lucide-react";

type RDPPlan = {
    id: string;
    name: string;
    country: string;
    description: string;
    ram: string;
    cpu: string;
    os: string;
    price: number;
    isActive: boolean;
};

export default function RDPStorefront() {
    const [plans, setPlans] = useState<RDPPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const fetchPlans = async () => {
            try {
                // Fetch User Session for Balance check
                const sessionStr = localStorage.getItem("sb_user");
                if (sessionStr) {
                    try {
                        const parsed = JSON.parse(sessionStr);
                        setUser(parsed);
                    } catch (e) {}
                }

                // Fetch Plans
                const res = await fetch("/api/rdp/plans");
                const data = await res.json();
                if (data.plans) {
                    setPlans(data.plans);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchPlans();
    }, []);

    const getFlag = (code: string) => {
        if (!code) return <Globe className="w-4 h-4 text-blue-400" />;
        if (code === "All") return <span className="text-base leading-none">🌍</span>;
        if (code === "Global") return <span className="text-base leading-none">🌐</span>;
        if (code.length === 2) {
            return (
                <Image
                    src={`https://flagcdn.com/w20/${code.toLowerCase()}.png`}
                    alt={code}
                    width={20}
                    height={15}
                    className="h-[15px] w-[20px] rounded-[2px] object-cover"
                />
            );
        }
        return <Globe className="w-4 h-4 text-blue-400" />;
    };

    const handlePurchase = async (plan: RDPPlan) => {
        if (!user) {
            alert("Please login to purchase RDPs.");
            return;
        }

        if (user.credits < plan.price) {
            alert(`Insufficient funds. You need $${plan.price} BLT. Your balance is $${user.credits || 0}.`);
            return;
        }

        if (confirm(`Are you sure you want to purchase 1 month of ${plan.name} for $${plan.price} BLT?`)) {
            try {
                const res = await fetch(`/api/rdp/purchase/${plan.id}`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${localStorage.getItem("token") || ""}`
                    }
                });
                const data = await res.json();
                if (data.success) {
                    alert("Purchase successful! Awaiting credentials from the seller.");
                    window.location.href = "/rdp/manage";
                } else {
                    alert(data.error || "Purchase failed.");
                }
            } catch (err) {
                alert("Network error during purchase.");
            }
        }
    };

    if (loading) {
        return <div className="py-20 text-center text-(--text-muted)">Loading Dedicated Servers...</div>;
    }

    return (
        <div className="pb-10 pt-20 sm:pb-12 sm:pt-24 md:pb-16 md:pt-28 max-w-6xl mx-auto px-4">
            <div className="mb-10 text-center sm:mb-12">
                <h1 className="mb-4 text-3xl font-mono text-(--text-primary) sm:text-4xl md:text-[2.5rem] leading-normal pt-1 flex items-center justify-center gap-3">
                    <Server className="w-8 h-8 text-emerald-500" />
                    DEDICATED RDP NETWORK
                </h1>
                <p className="mx-auto max-w-2xl text-sm text-(--text-muted) sm:text-base">
                    Secure, high-performance Remote Desktop Protocol (RDP) servers. Subscriptions are billed monthly. Credentials are provided securely within your dashboard after purchase.
                </p>
                <div className="mt-4 flex justify-center gap-4">
                    <Link href="/rdp/manage" className="text-sm text-emerald-400 hover:underline">
                        Manage My RDPs
                    </Link>
                </div>
            </div>

            <div className="mb-8 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-4 shadow-lg backdrop-blur-sm max-w-4xl mx-auto">
                <Info className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
                <div>
                    <h3 className="font-bold text-amber-500 mb-1">Important: Manual Delivery Process</h3>
                    <p className="text-sm text-amber-500/80">
                        When you purchase an RDP plan, you will <strong>not</strong> receive the credentials immediately. Our authorized vendor will manually provision your dedicated server and deliver the IP, Username, and Password to your <Link href="/rdp/manage" className="text-amber-400 underline font-semibold">Manage RDPs</Link> panel within a few hours. Please be patient while your server is being prepared.
                    </p>
                </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-border bg-card/80 shadow-lg backdrop-blur-md">
                <table className="w-full text-left text-sm text-muted-foreground">
                    <thead className="bg-background/50 text-xs uppercase text-foreground">
                        <tr>
                            <th className="px-6 py-4">RDP Plan</th>
                            <th className="px-6 py-4 text-center">Country</th>
                            <th className="px-6 py-4">Specs (RAM/CPU/OS)</th>
                            <th className="px-6 py-4 text-center">Store</th>
                            <th className="px-6 py-4 text-right">Price (Monthly)</th>
                            <th className="px-6 py-4 text-center">Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {plans.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="px-6 py-8 text-center">
                                    No RDP plans available at the moment.
                                </td>
                            </tr>
                        ) : (
                            plans.map((plan) => (
                                <tr key={plan.id} className="border-t border-border/50 hover:bg-white/5 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="font-medium text-foreground">{plan.name}</div>
                                        <div className="text-xs text-muted-foreground truncate max-w-[200px]" title={plan.description}>{plan.description}</div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-white/5 text-xs font-medium text-foreground border border-white/10">
                                            {getFlag(plan.country)}
                                            {plan.country.length === 2 ? plan.country : "Global"}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex flex-col gap-1 text-xs">
                                            <span><strong>RAM:</strong> {plan.ram}</span>
                                            <span><strong>CPU:</strong> {plan.cpu}</span>
                                            <span><strong>OS:</strong> {plan.os}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center whitespace-nowrap">
                                        <span className="inline-flex items-center gap-1 text-xs text-emerald-400">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            Official Store
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono font-bold text-foreground whitespace-nowrap">
                                        ${plan.price.toFixed(2)} BLT
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button
                                            onClick={() => handlePurchase(plan)}
                                            className="px-4 py-2 text-sm font-medium text-black bg-emerald-500 rounded-lg hover:bg-emerald-400 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)] hover:shadow-[0_0_20px_rgba(16,185,129,0.5)] flex items-center gap-2 mx-auto whitespace-nowrap"
                                        >
                                            <CreditCard className="w-4 h-4" />
                                            Buy Plan
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
