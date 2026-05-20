"use client";
import { Disc, Star, TrendingUp, Wallet, ArrowUpRight, History, ShieldCheck, Activity } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export default function DepositHistory() {
    const [deposits, setDeposits] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [depositAmount, setDepositAmount] = useState("");
    const [invoiceLoading, setInvoiceLoading] = useState(false);

    useEffect(() => {
        const fetchDeposits = async () => {
            try {
                const res = await fetch("/api/user/deposits", {
                    headers: {
                        Authorization: `Bearer ${document.cookie.replace(/(?:(?:^|.*;\s*)sb_token\s*\=\s*([^;]*).*$)|^.*$/, "$1")}`,
                    },
                });
                const data = await res.json();
                if (res.ok) setDeposits(data.deposits || []);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchDeposits();
    }, []);

    const handleDeposit = async () => {
        const amount = parseFloat(depositAmount);
        if (!amount || amount < 1)
            return alert("Minimum deposit is $1.00 USD.");
        setInvoiceLoading(true);

        try {
            const res = await fetch("/api/crypto/invoice", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${document.cookie.replace(/(?:(?:^|.*;\s*)sb_token\s*\=\s*([^;]*).*$)|^.*$/, "$1")}`,
                },
                body: JSON.stringify({ amountUsd: amount }),
            });
            const data = await res.json();
            if (res.ok && data.payLink) {
                window.location.href = data.payLink;
            } else {
                alert(data.error || "Failed to generate invoice.");
            }
        } catch (err) {
            alert("Network error. Please try again.");
        } finally {
            setInvoiceLoading(false);
        }
    };

    if (loading)
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                    <span className="text-muted-foreground font-mono tracking-widest text-sm uppercase">Syncing Ledger...</span>
                </div>
            </div>
        );

    return (
        <main className="min-h-screen bg-background relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="container max-w-6xl mx-auto pt-28 pb-16 px-6 relative z-10">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-12 gap-6 border-b border-border/40 pb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-emerald-500/10 rounded-lg ring-1 ring-emerald-500/20">
                                <Wallet className="w-6 h-6 text-emerald-500" />
                            </div>
                            <h1 className="text-3xl md:text-4xl text-foreground m-0 font-black tracking-tight">
                                Treasury & Ledger
                            </h1>
                        </div>
                        <p className="text-muted-foreground text-sm font-mono mt-2">
                            Manage your funds securely via the OxaPay Crypto Escrow Gateway.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Deposit Section */}
                    <div className="lg:col-span-5 flex flex-col gap-6">
                        <div className="bg-card/40 backdrop-blur-md border border-border/50 rounded-2xl p-8 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                            
                            <h2 className="text-foreground font-bold text-xl mb-6 flex items-center gap-3">
                                <div className="bg-emerald-500/20 p-2 rounded-md">
                                    <ArrowUpRight className="w-5 h-5 text-emerald-400" />
                                </div>
                                Fund Account
                            </h2>
                            
                            <div className="flex items-start gap-4 p-4 bg-muted/30 border border-border/40 rounded-xl mb-8">
                                <ShieldCheck className="w-8 h-8 text-emerald-500 shrink-0 mt-1" />
                                <div className="text-sm text-muted-foreground leading-relaxed">
                                    <strong className="text-foreground font-semibold block mb-1">Secure Transaction</strong>
                                    1 USD is strictly mapped to 1 BLT. All payments are verified on-chain via OxaPay.
                                </div>
                            </div>

                            <div className="mb-8">
                                <label className="block text-foreground text-sm font-bold uppercase tracking-wider mb-3">
                                    Deposit Amount (USD)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">$</span>
                                    <input
                                        type="number"
                                        min="1"
                                        placeholder="0.00"
                                        value={depositAmount}
                                        onChange={(e) => setDepositAmount(e.target.value)}
                                        className="w-full bg-background/50 border border-border/50 text-foreground py-4 pl-8 pr-4 rounded-xl text-xl font-mono focus:ring-2 focus:ring-emerald-500/50 outline-none transition-all"
                                    />
                                    {depositAmount && parseFloat(depositAmount) > 0 && (
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-emerald-400 font-mono text-sm bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                                            + {parseInt(depositAmount)} BLT
                                        </div>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={handleDeposit}
                                disabled={invoiceLoading}
                                className={cn(
                                    "w-full py-4 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 uppercase tracking-wide",
                                    invoiceLoading 
                                        ? "bg-muted text-muted-foreground cursor-not-allowed" 
                                        : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]"
                                )}
                            >
                                {invoiceLoading ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                        GENERATING INVOICE...
                                    </>
                                ) : (
                                    <>
                                        PAY WITH CRYPTO <ArrowUpRight className="w-5 h-5" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Transaction Ledger Section */}
                    <div className="lg:col-span-7">
                        <div className="bg-card/40 backdrop-blur-md border border-border/50 rounded-2xl p-8 min-h-full">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-foreground font-bold text-xl flex items-center gap-3">
                                    <div className="bg-blue-500/20 p-2 rounded-md">
                                        <History className="w-5 h-5 text-blue-400" />
                                    </div>
                                    Transaction Ledger
                                </h2>
                                <span className="text-xs font-mono text-muted-foreground px-3 py-1 bg-muted rounded-full border border-border/50">
                                    {deposits.length} Records Found
                                </span>
                            </div>

                            {deposits.length === 0 ? (
                                <div className="text-center py-20 px-4 bg-background/30 border border-dashed border-border rounded-xl">
                                    <Activity className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                                    <h3 className="text-foreground font-semibold mb-2">No Transactions Yet</h3>
                                    <p className="text-muted-foreground text-sm max-w-[250px] mx-auto leading-relaxed">
                                        Your ledger is currently empty. Make a deposit to see your history here.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {deposits.map((dep: any) => (
                                        <div
                                            key={dep.id}
                                            className="group bg-background/50 hover:bg-muted/30 border border-border/40 hover:border-border rounded-xl p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all"
                                        >
                                            <div>
                                                <div className="text-foreground font-bold text-lg mb-1 flex items-center gap-2">
                                                    {dep.purchaseType === "PAID_AD" ? (
                                                        <>
                                                            <TrendingUp className="w-4 h-4 text-purple-400" />
                                                            <span className="text-purple-400">MASTER AD SLOT</span>
                                                            <span className="text-sm font-mono text-muted-foreground">
                                                                (+{(() => {
                                                                    try { return JSON.parse(dep.purchaseMetadata || "{}").durationDays || 0; } 
                                                                    catch { return 0; }
                                                                })()} DAYS)
                                                            </span>
                                                        </>
                                                    ) : dep.purchaseType?.startsWith("RANK_") ? (
                                                        <>
                                                            <Star className="w-4 h-4 text-amber-400" />
                                                            <span className="text-amber-400">RANK UPGRADE</span>
                                                        </>
                                                    ) : dep.purchaseType === "SOFTWARE_ONLY" ? (
                                                        <>
                                                            <Disc className="w-4 h-4 text-blue-400" />
                                                            <span className="text-blue-400">SOFTWARE LICENSE</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Image src="/bullet-token.svg" alt="BLT" width={16} height={16} className="w-4 h-4" />
                                                            <span className="text-emerald-400">+{dep.bulletsReceived || 0} BLT</span>
                                                        </>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground text-xs font-mono mt-2">
                                                    <span className="text-foreground/70">${dep.amountUsd} USD</span>
                                                    <span className="opacity-50">•</span>
                                                    <span>{new Date(dep.createdAt).toLocaleString()}</span>
                                                    <span className="opacity-50">•</span>
                                                    <span className="truncate max-w-[150px]" title={dep.trackId}>
                                                        ID: {dep.trackId || "Awaiting Sync"}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className={cn(
                                                "px-3 py-1.5 rounded-full text-xs font-bold tracking-wider uppercase border",
                                                dep.status === "COMPLETED" 
                                                    ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" 
                                                    : dep.status === "PENDING"
                                                        ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                                                        : "bg-red-500/10 text-red-500 border-red-500/20"
                                            )}>
                                                {dep.status}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}

