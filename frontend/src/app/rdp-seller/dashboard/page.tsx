"use client";

import { useEffect, useState } from "react";
import { Server, Users, RefreshCw, CheckCircle2, AlertTriangle, Plus, Activity, Settings, List, FileText, X } from "lucide-react";
import CountrySelector from "@/components/CountrySelector";

export default function RDPSellerDashboard() {
    const [activeTab, setActiveTab] = useState("overview");
    const [loading, setLoading] = useState(true);

    const [plans, setPlans] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [services, setServices] = useState<any[]>([]);
    const [renewals, setRenewals] = useState<any[]>([]);
    const [customers, setCustomers] = useState<any[]>([]);
    const [logs, setLogs] = useState<any[]>([]);
    const [vendorBalance, setVendorBalance] = useState<number>(0);

    // Form states
    const [newPlan, setNewPlan] = useState({ name: "", country: "US", description: "", ram: "", cpu: "", os: "", price: "" });
    const [showAddPlan, setShowAddPlan] = useState(false);

    // Withdrawal states
    const [withdrawAddress, setWithdrawAddress] = useState("");
    const [withdrawNetwork, setWithdrawNetwork] = useState("USDT-TRC20");
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [withdrawalsHistory, setWithdrawalsHistory] = useState<any[]>([]);
    const [isWithdrawing, setIsWithdrawing] = useState(false);

    // Modal states
    const [orderModal, setOrderModal] = useState<any>(null);
    const [serviceModal, setServiceModal] = useState<any>(null);
    const [renewalModal, setRenewalModal] = useState<any>(null);

    // Action Form States
    const [fulfillData, setFulfillData] = useState({ status: "PENDING", rdpDetails: "", refundReason: "" });
    const [serviceData, setServiceData] = useState({ status: "ACTIVE", expiresAt: "", rdpDetails: "" });
    const [renewalData, setRenewalData] = useState({ status: "Pending Approval", newExpiryDate: "", rejectionReason: "" });

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const headers = { Authorization: `Bearer ${localStorage.getItem("token") || ""}` };
            
            const [plansRes, ordersRes, servicesRes, renewalsRes, customersRes, logsRes, balanceRes, withdrawalsRes] = await Promise.all([
                fetch("/api/seller/rdp/plans", { headers }),
                fetch("/api/seller/rdp/orders", { headers }),
                fetch("/api/seller/rdp/services", { headers }),
                fetch("/api/seller/rdp/renewals", { headers }),
                fetch("/api/seller/rdp/customers", { headers }),
                fetch("/api/seller/rdp/logs", { headers }),
                fetch("/api/seller/rdp/balance", { headers }),
                fetch("/api/enterprise/withdrawals", { headers })
            ]);

            const [plansData, ordersData, servicesData, renewalsData, customersData, logsData, balanceData, withdrawalsData] = await Promise.all([
                plansRes.json(), ordersRes.json(), servicesRes.json(), renewalsRes.json(), customersRes.json(), logsRes.json(), balanceRes.json(), withdrawalsRes.json()
            ]);

            setPlans(plansData.plans || []);
            setOrders(ordersData.orders || []);
            setServices(servicesData.services || []);
            setRenewals(renewalsData.orders || []);
            setCustomers(customersData.customers || []);
            setLogs(logsData.logs || []);
            setWithdrawalsHistory(withdrawalsData.withdrawals || []);
            if (balanceData.vendorBalance !== undefined) setVendorBalance(balanceData.vendorBalance);
        } catch (err) {
            console.error("Failed to load dashboard data", err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddPlan = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch("/api/seller/rdp/plans", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
                body: JSON.stringify(newPlan)
            });
            const data = await res.json();
            if (data.success) {
                setShowAddPlan(false);
                setNewPlan({ name: "", country: "US", description: "", ram: "", cpu: "", os: "", price: "" });
                fetchDashboardData();
            } else {
                alert(data.error);
            }
        } catch (err) {
            alert("Error creating plan");
        }
    };

    const handleFulfillOrder = async () => {
        if (!orderModal) return;
        try {
            const res = await fetch(`/api/seller/rdp/orders/${orderModal.id}/fulfill`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
                body: JSON.stringify(fulfillData)
            });
            const data = await res.json();
            if (data.success) {
                alert("Order updated!");
                setOrderModal(null);
                fetchDashboardData();
            } else {
                alert(data.error);
            }
        } catch (err) {
            alert("Error fulfilling order");
        }
    };

    const handleUpdateService = async () => {
        if (!serviceModal) return;
        try {
            const res = await fetch(`/api/seller/rdp/services/${serviceModal.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
                body: JSON.stringify(serviceData)
            });
            const data = await res.json();
            if (data.success) {
                alert("Service updated!");
                setServiceModal(null);
                fetchDashboardData();
            } else {
                alert(data.error);
            }
        } catch (err) {
            alert("Error updating service");
        }
    };

    const handleWithdraw = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsWithdrawing(true);
        try {
            const res = await fetch("/api/enterprise/withdraw", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
                body: JSON.stringify({ cryptoAddress: withdrawAddress, network: withdrawNetwork, amount: parseFloat(withdrawAmount) })
            });
            const data = await res.json();
            if (data.success) {
                alert("Withdrawal request submitted successfully.");
                setWithdrawAddress("");
                setWithdrawAmount("");
                fetchDashboardData();
            } else {
                alert(data.error);
            }
        } catch (err) {
            alert("Error submitting withdrawal");
        } finally {
            setIsWithdrawing(false);
        }
    };

    const getStats = () => {
        const pending = orders.filter(o => o.status === "PENDING").length;
        const processing = orders.filter(o => o.status === "PROCESSING").length;
        const active = services.length;
        const expiring = renewals.length;
        const undeliverable = orders.filter(o => o.status === "REFUNDED").length;
        const monthlyCommission = vendorBalance; // For demo

        return { pending, processing, active, expiring, undeliverable, monthlyCommission };
    };

    if (loading) return <div className="p-10 text-center text-foreground dark:text-white">Loading RDP Seller Panel...</div>;

    const stats = getStats();

    return (
        <div className="p-6 pt-20 sm:p-10 sm:pt-24 md:pt-28 max-w-[1400px] mx-auto min-h-screen text-foreground dark:text-white">
            
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-border dark:border-white/10 pb-6">
                <div>
                    <h1 className="text-3xl font-bold text-emerald-500 mb-2">RDP Seller Manager Panel</h1>
                    <p className="text-muted-foreground text-sm max-w-3xl">
                        Professional manual fulfillment panel for selling monthly RDP plans. Customers pay using balance, orders arrive as paid, and the manager manually prepares, delivers, and renews the RDP service. 
                    </p>
                </div>
                <button onClick={() => { setActiveTab("plans"); setShowAddPlan(true); }} className="bg-emerald-600 hover:bg-emerald-500 text-foreground dark:text-white px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-colors">
                    + Create Plan
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                <div className="lg:col-span-3 bg-[#061a14] border border-emerald-900 rounded-xl p-4">
                    <span className="text-muted-foreground text-xs font-semibold uppercase">Wallet Balance</span>
                    <strong className="block text-3xl text-emerald-400 mt-2">${stats.monthlyCommission.toFixed(2)}</strong>
                </div>
                <div className="bg-card/80 border border-border rounded-xl p-4">
                    <span className="text-muted-foreground text-xs font-semibold uppercase">Pending</span>
                    <strong className="block text-2xl text-foreground dark:text-white mt-1">{stats.pending}</strong>
                </div>
                <div className="bg-card/80 border border-border rounded-xl p-4">
                    <span className="text-muted-foreground text-xs font-semibold uppercase">Processing</span>
                    <strong className="block text-2xl text-foreground dark:text-white mt-1">{stats.processing}</strong>
                </div>
                <div className="bg-card/80 border border-border rounded-xl p-4">
                    <span className="text-muted-foreground text-xs font-semibold uppercase">Renewals</span>
                    <strong className="block text-2xl text-foreground dark:text-white mt-1">{stats.expiring}</strong>
                </div>
                
                <div className="bg-card/80 border border-border rounded-xl p-4">
                    <span className="text-muted-foreground text-xs font-semibold uppercase">Active Services</span>
                    <strong className="block text-2xl text-foreground dark:text-white mt-1">{stats.active}</strong>
                </div>
                <div className="bg-card/80 border border-border rounded-xl p-4">
                    <span className="text-muted-foreground text-xs font-semibold uppercase">Undeliverable</span>
                    <strong className="block text-2xl text-foreground dark:text-white mt-1">{stats.undeliverable}</strong>
                </div>
                <div className="bg-card/80 border border-border rounded-xl p-4">
                    <span className="text-muted-foreground text-xs font-semibold uppercase">Total Customers</span>
                    <strong className="block text-2xl text-foreground dark:text-white mt-1">{customers.length}</strong>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-wrap gap-2 mb-6 border-b border-border dark:border-white/10 pb-4">
                {[
                    { id: "overview", label: "Overview" },
                    { id: "plans", label: "Plans" },
                    { id: "orders", label: "Orders & Fulfillment" },
                    { id: "services", label: "Active Services" },
                    { id: "renewals", label: "Renewals" },
                    { id: "customers", label: "Customers" },
                    { id: "wallet", label: "Wallet & Withdrawals" },
                    { id: "logs", label: "Admin Logs" },
                    { id: "settings", label: "Settings" }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                            activeTab === tab.id 
                            ? "bg-emerald-900/50 border-emerald-500/50 text-emerald-700 dark:text-emerald-300" 
                            : "bg-card border-border text-muted-foreground hover:text-foreground dark:hover:text-white"
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Contents */}
            <div className="bg-card/80 border border-border rounded-xl p-6 shadow-xl min-h-[500px]">
                
                {/* OVERVIEW */}
                {activeTab === "overview" && (
                    <div className="animate-in fade-in zoom-in-95 duration-200">
                        <h2 className="text-xl font-bold text-emerald-500 mb-2">Complete Manual RDP Selling Flow</h2>
                        <p className="text-muted-foreground text-sm mb-6">Recommended manager workflow from plan creation to delivery, renewal, support, and undeliverable handling.</p>
                        
                        <div className="flex flex-wrap gap-2 mb-8">
                            {["1. Create Plan", "2. Customer Orders", "3. Payment Paid", "4. Fulfillment Pending", "5. Manager Prepares RDP", "6. Deliver Credentials", "7. Track Active Service", "8. Monthly Renewal"].map(step => (
                                <span key={step} className="bg-muted/50 dark:bg-background dark:bg-black/40 border border-border dark:border-white/10 text-muted-foreground dark:text-zinc-300 px-3 py-1.5 rounded-full text-xs font-semibold">
                                    {step}
                                </span>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="bg-muted/50 dark:bg-background dark:bg-black/40 border border-border dark:border-white/10 rounded-xl p-5">
                                <h3 className="text-foreground dark:text-white font-bold mb-2 text-sm">Plan Management</h3>
                                <p className="text-muted-foreground text-xs leading-relaxed">Create, edit, delete, hide, or mark plans as out of stock. Each plan includes specs, OS versions, monthly billing, and price.</p>
                            </div>
                            <div className="bg-muted/50 dark:bg-background dark:bg-black/40 border border-border dark:border-white/10 rounded-xl p-5">
                                <h3 className="text-foreground dark:text-white font-bold mb-2 text-sm">Orders & Fulfillment</h3>
                                <p className="text-muted-foreground text-xs leading-relaxed">Orders appear after customer purchase. Only View action is needed; all fulfillment work happens inside the modal.</p>
                            </div>
                            <div className="bg-muted/50 dark:bg-background dark:bg-black/40 border border-border dark:border-white/10 rounded-xl p-5">
                                <h3 className="text-foreground dark:text-white font-bold mb-2 text-sm">Active Services</h3>
                                <p className="text-muted-foreground text-xs leading-relaxed">Delivered RDPs become active services with expiry tracking, renewal status, and service history.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* PLANS */}
                {activeTab === "plans" && (
                    <div className="animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-xl font-bold text-emerald-500 mb-2">Create & Maintain Plans</h2>
                                <p className="text-muted-foreground text-sm">Manager can add, edit, or mark each sellable RDP plan as out of stock.</p>
                            </div>
                            <button onClick={() => setShowAddPlan(!showAddPlan)} className="bg-emerald-600 hover:bg-emerald-500 text-foreground dark:text-white px-3 py-1.5 rounded text-sm font-bold">
                                {showAddPlan ? "Cancel" : "+ Add New Plan"}
                            </button>
                        </div>

                        {showAddPlan && (
                            <form onSubmit={handleAddPlan} className="bg-muted/50 dark:bg-background dark:bg-black/40 border border-border dark:border-white/10 rounded-xl p-5 mb-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                                    <div><label className="block text-xs text-muted-foreground mb-1">Plan Name</label><input required value={newPlan.name} onChange={e => setNewPlan({...newPlan, name: e.target.value})} className="w-full bg-background dark:bg-black border border-border dark:border-white/10 rounded px-3 py-2 text-sm text-foreground dark:text-white" placeholder="Plan XS" /></div>
                                    <div><label className="block text-xs text-muted-foreground mb-1">Country</label><div className="text-black"><CountrySelector value={newPlan.country} onChange={(code) => setNewPlan({...newPlan, country: code})} /></div></div>
                                    <div><label className="block text-xs text-muted-foreground mb-1">RAM</label><input required value={newPlan.ram} onChange={e => setNewPlan({...newPlan, ram: e.target.value})} className="w-full bg-background dark:bg-black border border-border dark:border-white/10 rounded px-3 py-2 text-sm text-foreground dark:text-white" placeholder="4 GB" /></div>
                                    <div><label className="block text-xs text-muted-foreground mb-1">CPU</label><input required value={newPlan.cpu} onChange={e => setNewPlan({...newPlan, cpu: e.target.value})} className="w-full bg-background dark:bg-black border border-border dark:border-white/10 rounded px-3 py-2 text-sm text-foreground dark:text-white" placeholder="2 vCPU" /></div>
                                    <div><label className="block text-xs text-muted-foreground mb-1">OS Options</label><input required value={newPlan.os} onChange={e => setNewPlan({...newPlan, os: e.target.value})} className="w-full bg-background dark:bg-black border border-border dark:border-white/10 rounded px-3 py-2 text-sm text-foreground dark:text-white" placeholder="Windows 10, Server 2019" /></div>
                                    <div><label className="block text-xs text-muted-foreground mb-1">Price (USD/BLT)</label><input required type="number" value={newPlan.price} onChange={e => setNewPlan({...newPlan, price: e.target.value})} className="w-full bg-background dark:bg-black border border-border dark:border-white/10 rounded px-3 py-2 text-sm text-foreground dark:text-white" placeholder="30.00" /></div>
                                </div>
                                <div className="mb-4">
                                    <label className="block text-xs text-muted-foreground mb-1">Description</label>
                                    <textarea required value={newPlan.description} onChange={e => setNewPlan({...newPlan, description: e.target.value})} className="w-full bg-background dark:bg-black border border-border dark:border-white/10 rounded px-3 py-2 text-sm text-foreground dark:text-white min-h-[80px]" placeholder="Describe plan performance, delivery time..."></textarea>
                                </div>
                                <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-foreground dark:text-white px-5 py-2 rounded text-sm font-bold">Save Plan</button>
                            </form>
                        )}

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead>
                                    <tr className="border-b border-border dark:border-white/10 text-muted-foreground">
                                        <th className="py-3 pr-4 font-medium">Plan</th>
                                        <th className="py-3 px-4 font-medium">Location</th>
                                        <th className="py-3 px-4 font-medium">Specs</th>
                                        <th className="py-3 px-4 font-medium">Price</th>
                                        <th className="py-3 px-4 font-medium">Status</th>
                                        <th className="py-3 pl-4 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {plans.map(p => (
                                        <tr key={p.id} className="border-b border-border dark:border-white/5 hover:bg-white/[0.02]">
                                            <td className="py-3 pr-4 font-medium text-foreground dark:text-white">{p.name}</td>
                                            <td className="py-3 px-4 text-muted-foreground dark:text-zinc-300">{p.country}</td>
                                            <td className="py-3 px-4 text-muted-foreground dark:text-zinc-300">{p.ram} / {p.cpu} / {p.os}</td>
                                            <td className="py-3 px-4 text-muted-foreground dark:text-zinc-300">${p.price}</td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2 py-1 rounded text-xs ${p.isActive ? 'bg-emerald-900/50 text-emerald-400' : 'bg-red-900/50 text-red-400'}`}>
                                                    {p.isActive ? 'Active' : 'Hidden'}
                                                </span>
                                            </td>
                                            <td className="py-3 pl-4">
                                                <button className="text-xs bg-muted dark:bg-zinc-800 hover:bg-muted/80 dark:hover:bg-zinc-700 px-3 py-1.5 rounded text-foreground dark:text-white mr-2">Edit</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {plans.length === 0 && <tr><td colSpan={6} className="py-4 text-center text-muted-foreground">No plans created yet.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ORDERS & FULFILLMENT */}
                {activeTab === "orders" && (
                    <div className="animate-in fade-in zoom-in-95 duration-200">
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-emerald-500 mb-2">Orders & Fulfillment</h2>
                            <p className="text-muted-foreground text-sm">Every customer purchase appears here. Process and deliver credentials manually.</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead>
                                    <tr className="border-b border-border dark:border-white/10 text-muted-foreground">
                                        <th className="py-3 pr-4 font-medium">Order ID</th>
                                        <th className="py-3 px-4 font-medium">Customer</th>
                                        <th className="py-3 px-4 font-medium">Plan</th>
                                        <th className="py-3 px-4 font-medium">Amount</th>
                                        <th className="py-3 px-4 font-medium">Order Date</th>
                                        <th className="py-3 px-4 font-medium">Status</th>
                                        <th className="py-3 pl-4 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {orders.map(o => (
                                        <tr key={o.id} className="border-b border-border dark:border-white/5 hover:bg-white/[0.02]">
                                            <td className="py-3 pr-4 font-mono text-xs text-muted-foreground dark:text-zinc-400">#{o.id.substring(0,8)}</td>
                                            <td className="py-3 px-4 text-foreground dark:text-white">{o.buyerUsername}</td>
                                            <td className="py-3 px-4 text-muted-foreground dark:text-zinc-300">{o.plan?.name}</td>
                                            <td className="py-3 px-4 text-emerald-400 font-medium">${o.plan?.price}</td>
                                            <td className="py-3 px-4 text-muted-foreground dark:text-zinc-400 text-xs">{new Date(o.createdAt).toLocaleDateString()}</td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2 py-1 rounded text-[10px] uppercase tracking-wide font-bold ${
                                                    o.status === 'PENDING' ? 'bg-emerald-50 dark:bg-[#061a14]mber-900/50 text-amber-400 border border-amber-500/20' :
                                                    o.status === 'PROCESSING' ? 'bg-blue-900/50 text-blue-400 border border-blue-500/20' :
                                                    o.status === 'REFUNDED' ? 'bg-red-900/50 text-red-400 border border-red-500/20' :
                                                    'bg-emerald-900/50 text-emerald-400 border border-emerald-500/20'
                                                }`}>
                                                    {o.status}
                                                </span>
                                            </td>
                                            <td className="py-3 pl-4">
                                                <button 
                                                    onClick={() => {
                                                        setOrderModal(o);
                                                        setFulfillData({ status: o.status, rdpDetails: o.rdpDetails || "", refundReason: "" });
                                                    }}
                                                    className="text-xs bg-emerald-600 hover:bg-emerald-500 px-3 py-1.5 rounded font-bold text-foreground dark:text-white"
                                                >
                                                    View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {orders.length === 0 && <tr><td colSpan={7} className="py-4 text-center text-muted-foreground">No orders yet.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ACTIVE SERVICES */}
                {activeTab === "services" && (
                    <div className="animate-in fade-in zoom-in-95 duration-200">
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-emerald-500 mb-2">Active RDP Services</h2>
                            <p className="text-muted-foreground text-sm">Delivered orders become active services. Track expiry and server details.</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead>
                                    <tr className="border-b border-border dark:border-white/10 text-muted-foreground">
                                        <th className="py-3 pr-4 font-medium">Customer</th>
                                        <th className="py-3 px-4 font-medium">Plan</th>
                                        <th className="py-3 px-4 font-medium">Location</th>
                                        <th className="py-3 px-4 font-medium">Start Date</th>
                                        <th className="py-3 px-4 font-medium">Expiry Date</th>
                                        <th className="py-3 px-4 font-medium">Status</th>
                                        <th className="py-3 pl-4 font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {services.map(s => (
                                        <tr key={s.id} className="border-b border-border dark:border-white/5 hover:bg-white/[0.02]">
                                            <td className="py-3 pr-4 font-medium text-foreground dark:text-white">{s.buyerUsername}</td>
                                            <td className="py-3 px-4 text-muted-foreground dark:text-zinc-300">{s.plan?.name}</td>
                                            <td className="py-3 px-4 text-muted-foreground dark:text-zinc-300">{s.plan?.country}</td>
                                            <td className="py-3 px-4 text-muted-foreground dark:text-zinc-400 text-xs">{new Date(s.createdAt).toLocaleDateString()}</td>
                                            <td className="py-3 px-4 text-muted-foreground dark:text-zinc-400 text-xs">{s.expiresAt ? new Date(s.expiresAt).toLocaleDateString() : 'N/A'}</td>
                                            <td className="py-3 px-4">
                                                <span className={`px-2 py-1 rounded text-[10px] uppercase tracking-wide font-bold ${
                                                    s.status === 'SUSPENDED' ? 'bg-red-900/50 text-red-400 border border-red-500/20' :
                                                    'bg-emerald-900/50 text-emerald-400 border border-emerald-500/20'
                                                }`}>
                                                    {s.status}
                                                </span>
                                            </td>
                                            <td className="py-3 pl-4">
                                                <button 
                                                    onClick={() => {
                                                        setServiceModal(s);
                                                        setServiceData({ status: s.status, expiresAt: s.expiresAt ? s.expiresAt.split('T')[0] : "", rdpDetails: s.rdpDetails || "" });
                                                    }}
                                                    className="text-xs bg-muted dark:bg-zinc-800 hover:bg-muted/80 dark:hover:bg-zinc-700 px-3 py-1.5 rounded text-foreground dark:text-white"
                                                >
                                                    Manage
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {services.length === 0 && <tr><td colSpan={7} className="py-4 text-center text-muted-foreground">No active services.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* RENEWALS */}
                {activeTab === "renewals" && (
                    <div className="animate-in fade-in zoom-in-95 duration-200">
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-amber-500 mb-2 flex items-center gap-2"><AlertTriangle className="w-5 h-5"/> Expiring Services (≤ 10 Days)</h2>
                            <p className="text-muted-foreground text-sm">Services that are about to expire and need attention or renewal reminders.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {renewals.map(r => (
                                <div key={r.id} className="bg-emerald-50 dark:bg-[#061a14]mber-900/10 border border-amber-500/20 rounded-xl p-5">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="font-bold text-foreground dark:text-white text-sm">{r.plan?.name}</div>
                                        <span className="text-[10px] bg-emerald-50 dark:bg-[#061a14]mber-500/20 text-amber-400 px-2 py-1 rounded">Expiring</span>
                                    </div>
                                    <div className="text-xs text-muted-foreground mb-4">
                                        Customer: <span className="text-foreground dark:text-white">{r.buyerUsername}</span><br/>
                                        Expires: <span className="text-amber-400">{r.expiresAt ? new Date(r.expiresAt).toLocaleDateString() : 'N/A'}</span>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            setServiceModal(r);
                                            setServiceData({ status: r.status, expiresAt: r.expiresAt ? r.expiresAt.split('T')[0] : "", rdpDetails: r.rdpDetails || "" });
                                        }}
                                        className="w-full bg-emerald-50 dark:bg-[#061a14]mber-600/20 hover:bg-emerald-50 dark:bg-[#061a14]mber-600/40 border border-amber-500/50 text-amber-400 py-1.5 rounded text-xs font-bold transition-colors"
                                    >
                                        Edit Expiry Date
                                    </button>
                                </div>
                            ))}
                            {renewals.length === 0 && <p className="text-muted-foreground text-sm col-span-full">No services expiring soon.</p>}
                        </div>
                    </div>
                )}

                {/* CUSTOMERS */}
                {activeTab === "customers" && (
                    <div className="animate-in fade-in zoom-in-95 duration-200">
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-emerald-500 mb-2">Customers Directory</h2>
                            <p className="text-muted-foreground text-sm">Overview of customer orders and service counts.</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead>
                                    <tr className="border-b border-border dark:border-white/10 text-muted-foreground">
                                        <th className="py-3 pr-4 font-medium">Username</th>
                                        <th className="py-3 px-4 font-medium">Total Orders</th>
                                        <th className="py-3 px-4 font-medium">Active RDPs</th>
                                        <th className="py-3 px-4 font-medium">Undeliverable</th>
                                        <th className="py-3 pl-4 font-medium">Last Order</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {customers.map(c => (
                                        <tr key={c.buyerId} className="border-b border-border dark:border-white/5 hover:bg-white/[0.02]">
                                            <td className="py-3 pr-4 font-medium text-foreground dark:text-white">{c.username}</td>
                                            <td className="py-3 px-4 text-muted-foreground dark:text-zinc-300">{c.totalOrders}</td>
                                            <td className="py-3 px-4 text-emerald-400">{c.activeRDPs}</td>
                                            <td className="py-3 px-4 text-red-400">{c.undeliverable}</td>
                                            <td className="py-3 pl-4 text-muted-foreground dark:text-zinc-400 text-xs">{new Date(c.lastOrder).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                    {customers.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">No customers found.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* WALLET & WITHDRAWALS */}
                {activeTab === "wallet" && (
                    <div className="animate-in fade-in zoom-in-95 duration-200">
                        <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div>
                                <h2 className="text-xl font-bold text-emerald-500 mb-2">Wallet & Withdrawals</h2>
                                <p className="text-muted-foreground text-sm">Request a payout from your accumulated RDP sales. Minimum withdrawal is $50.</p>
                            </div>
                            <div className="bg-[#061a14] border border-emerald-900 rounded-xl p-4 min-w-[200px]">
                                <span className="text-emerald-500/80 text-xs font-semibold uppercase">Available Balance</span>
                                <strong className="block text-2xl text-emerald-400 mt-1">${vendorBalance.toFixed(2)}</strong>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-1">
                                <form onSubmit={handleWithdraw} className="bg-muted/50 dark:bg-background dark:bg-black/40 border border-border dark:border-white/10 rounded-xl p-5">
                                    <h3 className="text-foreground dark:text-white font-bold mb-4 text-sm border-b border-border dark:border-white/10 pb-2">Request Withdrawal</h3>
                                    
                                    <div className="mb-4">
                                        <label className="block text-xs text-muted-foreground mb-1">Network</label>
                                        <select required value={withdrawNetwork} onChange={e => setWithdrawNetwork(e.target.value)} className="w-full bg-background dark:bg-black border border-border dark:border-white/10 rounded px-3 py-2 text-sm text-foreground dark:text-white focus:border-emerald-500/50 outline-none">
                                            <option value="USDT-TRC20">USDT (TRC20)</option>
                                            <option value="USDT-ERC20">USDT (ERC20)</option>
                                            <option value="BTC">Bitcoin (BTC)</option>
                                            <option value="LTC">Litecoin (LTC)</option>
                                        </select>
                                    </div>
                                    
                                    <div className="mb-4">
                                        <label className="block text-xs text-muted-foreground mb-1">Crypto Address</label>
                                        <input required value={withdrawAddress} onChange={e => setWithdrawAddress(e.target.value)} className="w-full bg-background dark:bg-black border border-border dark:border-white/10 rounded px-3 py-2 text-sm text-foreground dark:text-white focus:border-emerald-500/50 outline-none font-mono" placeholder="T..." />
                                    </div>

                                    <div className="mb-6">
                                        <label className="block text-xs text-muted-foreground mb-1">Amount (USD)</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                                            <input required type="number" min="50" step="0.01" max={vendorBalance} value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)} className="w-full bg-background dark:bg-black border border-border dark:border-white/10 rounded pl-8 pr-3 py-2 text-sm text-foreground dark:text-white focus:border-emerald-500/50 outline-none" placeholder="0.00" />
                                        </div>
                                    </div>

                                    <button type="submit" disabled={isWithdrawing || vendorBalance < 50} className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-foreground dark:text-white px-4 py-2 rounded text-sm font-bold transition-colors">
                                        {isWithdrawing ? "Processing..." : "Submit Request"}
                                    </button>
                                </form>
                            </div>

                            <div className="lg:col-span-2">
                                <div className="bg-muted/50 dark:bg-background dark:bg-black/40 border border-border dark:border-white/10 rounded-xl p-5 min-h-[300px]">
                                    <h3 className="text-foreground dark:text-white font-bold mb-4 text-sm border-b border-border dark:border-white/10 pb-2">Withdrawal History</h3>
                                    
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm whitespace-nowrap">
                                            <thead>
                                                <tr className="border-b border-border dark:border-white/10 text-muted-foreground">
                                                    <th className="py-2 pr-4 font-medium">Date</th>
                                                    <th className="py-2 px-4 font-medium">Amount</th>
                                                    <th className="py-2 px-4 font-medium">Network</th>
                                                    <th className="py-2 pl-4 font-medium">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {withdrawalsHistory.map((w: any) => (
                                                    <tr key={w.id} className="border-b border-border dark:border-white/5 hover:bg-white/[0.02]">
                                                        <td className="py-3 pr-4 text-muted-foreground dark:text-zinc-400 text-xs">{new Date(w.createdAt).toLocaleDateString()}</td>
                                                        <td className="py-3 px-4 text-emerald-400 font-medium">${w.amount.toFixed(2)}</td>
                                                        <td className="py-3 px-4 text-muted-foreground dark:text-zinc-300 font-mono text-xs">{w.network}</td>
                                                        <td className="py-3 pl-4">
                                                            <span className={`px-2 py-1 rounded text-[10px] uppercase tracking-wide font-bold ${
                                                                w.status === 'PENDING' ? 'bg-emerald-50 dark:bg-[#061a14]mber-900/50 text-amber-400 border border-amber-500/20' :
                                                                w.status === 'PAID' ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-500/20' :
                                                                'bg-red-900/50 text-red-400 border border-red-500/20'
                                                            }`}>
                                                                {w.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {withdrawalsHistory.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">No withdrawal history.</td></tr>}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* LOGS */}
                {activeTab === "logs" && (
                    <div className="animate-in fade-in zoom-in-95 duration-200">
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-emerald-500 mb-2">Admin Logs</h2>
                            <p className="text-muted-foreground text-sm">Security and tracking history for seller actions.</p>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead>
                                    <tr className="border-b border-border dark:border-white/10 text-muted-foreground">
                                        <th className="py-3 pr-4 font-medium">Date & Time</th>
                                        <th className="py-3 px-4 font-medium">Admin</th>
                                        <th className="py-3 px-4 font-medium">Action</th>
                                        <th className="py-3 px-4 font-medium">Target</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map(log => (
                                        <tr key={log.id} className="border-b border-border dark:border-white/5 hover:bg-white/[0.02]">
                                            <td className="py-3 pr-4 text-muted-foreground dark:text-zinc-400 text-xs">{new Date(log.createdAt).toLocaleString()}</td>
                                            <td className="py-3 px-4 text-foreground dark:text-white">{log.adminUsername}</td>
                                            <td className="py-3 px-4 text-emerald-400 font-medium">{log.action}</td>
                                            <td className="py-3 px-4 text-muted-foreground dark:text-zinc-300 font-mono text-xs">{log.target.substring(0,8)}</td>
                                        </tr>
                                    ))}
                                    {logs.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">No logs available.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* SETTINGS */}
                {activeTab === "settings" && (
                    <div className="animate-in fade-in zoom-in-95 duration-200">
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-emerald-500 mb-2">Panel Settings</h2>
                            <p className="text-muted-foreground text-sm">Recommended configuration for manual RDP sales.</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-muted/50 dark:bg-background dark:bg-black/40 border border-border dark:border-white/10 rounded-xl p-5">
                                <p className="text-muted-foreground text-xs leading-relaxed">All RDP plans and renewals operate on a monthly billing cycle. Withdrawals are handled in the Wallet tab.</p>
                            </div>
                            <div className="bg-muted/50 dark:bg-background dark:bg-black/40 border border-border dark:border-white/10 rounded-xl p-5">
                                <h3 className="text-foreground dark:text-white font-bold mb-2 text-sm">Delivery Template</h3>
                                <p className="text-muted-foreground text-xs leading-relaxed">Provide IP, Username, and Password in the RDP Details field. It is sent securely to the buyer's panel.</p>
                            </div>
                        </div>
                    </div>
                )}

            </div>

            {/* MODALS */}
            
            {/* Order Modal */}
            {orderModal && (
                <div className="fixed inset-0 bg-background dark:bg-background/80 dark:bg-black/80 flex items-center justify-center p-4 z-50">
                    <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-start p-6 border-b border-border dark:border-white/10">
                            <div>
                                <h2 className="text-xl font-bold text-emerald-500">Order Details & Fulfillment</h2>
                                <p className="text-sm text-muted-foreground dark:text-zinc-300 mt-1 font-mono">Order #{orderModal.id.substring(0,8)} – {orderModal.buyerUsername}</p>
                            </div>
                            <button onClick={() => setOrderModal(null)} className="text-muted-foreground dark:text-zinc-400 hover:text-foreground dark:hover:text-white"><X className="w-6 h-6"/></button>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-xs text-muted-foreground mb-1">Fulfillment Status</label>
                                    <select value={fulfillData.status} onChange={e => setFulfillData({...fulfillData, status: e.target.value})} className="w-full bg-background dark:bg-black border border-border dark:border-white/10 rounded px-3 py-2 text-sm text-foreground dark:text-white">
                                        <option value="PENDING">Pending</option>
                                        <option value="PROCESSING">Processing</option>
                                        <option value="DELIVERED">Delivered (Active)</option>
                                        <option value="REFUNDED_UNDELIVERABLE">Refunded / Undeliverable</option>
                                    </select>
                                </div>
                                {fulfillData.status === "REFUNDED_UNDELIVERABLE" && (
                                    <div>
                                        <label className="block text-xs text-muted-foreground mb-1">Refund Reason</label>
                                        <input required placeholder="Out of stock, invalid details..." value={fulfillData.refundReason} onChange={e => setFulfillData({...fulfillData, refundReason: e.target.value})} className="w-full bg-background dark:bg-black border border-red-500/50 rounded px-3 py-2 text-sm text-foreground dark:text-white" />
                                    </div>
                                )}
                            </div>
                            {fulfillData.status !== "REFUNDED_UNDELIVERABLE" && (
                                <div className="mb-6">
                                    <label className="block text-xs text-muted-foreground mb-1">RDP Details (IP, User, Pass) or Note</label>
                                    <textarea value={fulfillData.rdpDetails} onChange={e => setFulfillData({...fulfillData, rdpDetails: e.target.value})} className="w-full bg-background dark:bg-black border border-border dark:border-white/10 rounded px-3 py-2 text-sm text-foreground dark:text-white min-h-[100px]" placeholder="192.168.1.1&#10;Administrator&#10;Password123!"></textarea>
                                </div>
                            )}
                            <div className="bg-emerald-900/20 border border-emerald-500/20 rounded-lg p-4 text-xs text-emerald-700 dark:text-emerald-300 mb-6">
                                Note: Setting status to "Delivered" will automatically mark the service as Active and notify the buyer.
                            </div>
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setOrderModal(null)} className="px-4 py-2 rounded text-sm bg-muted dark:bg-zinc-800 hover:bg-muted/80 dark:hover:bg-zinc-700 text-foreground dark:text-white font-medium">Cancel</button>
                                <button onClick={handleFulfillOrder} className="px-6 py-2 rounded text-sm bg-emerald-600 hover:bg-emerald-500 text-foreground dark:text-white font-bold">Save Changes</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Service Modal */}
            {serviceModal && (
                <div className="fixed inset-0 bg-background dark:bg-background/80 dark:bg-black/80 flex items-center justify-center p-4 z-50">
                    <div className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-start p-6 border-b border-border dark:border-white/10">
                            <div>
                                <h2 className="text-xl font-bold text-emerald-500">Manage Service</h2>
                                <p className="text-sm text-muted-foreground dark:text-zinc-300 mt-1 font-mono">Service for {serviceModal.buyerUsername} – {serviceModal.plan?.name}</p>
                            </div>
                            <button onClick={() => setServiceModal(null)} className="text-muted-foreground dark:text-zinc-400 hover:text-foreground dark:hover:text-white"><X className="w-6 h-6"/></button>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                <div>
                                    <label className="block text-xs text-muted-foreground mb-1">Expiry Date</label>
                                    <input type="date" value={serviceData.expiresAt} onChange={e => setServiceData({...serviceData, expiresAt: e.target.value})} className="w-full bg-background dark:bg-black border border-border dark:border-white/10 rounded px-3 py-2 text-sm text-foreground dark:text-white" />
                                </div>
                                <div>
                                    <label className="block text-xs text-muted-foreground mb-1">Service Status</label>
                                    <select value={serviceData.status} onChange={e => setServiceData({...serviceData, status: e.target.value})} className="w-full bg-background dark:bg-black border border-border dark:border-white/10 rounded px-3 py-2 text-sm text-foreground dark:text-white">
                                        <option value="ACTIVE">Active</option>
                                        <option value="SUSPENDED">Suspended</option>
                                        <option value="EXPIRED">Expired</option>
                                    </select>
                                </div>
                            </div>
                            <div className="mb-6">
                                <label className="block text-xs text-muted-foreground mb-1">RDP Credentials / Details</label>
                                <textarea value={serviceData.rdpDetails} onChange={e => setServiceData({...serviceData, rdpDetails: e.target.value})} className="w-full bg-background dark:bg-black border border-border dark:border-white/10 rounded px-3 py-2 text-sm text-foreground dark:text-white min-h-[100px]"></textarea>
                            </div>
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setServiceModal(null)} className="px-4 py-2 rounded text-sm bg-muted dark:bg-zinc-800 hover:bg-muted/80 dark:hover:bg-zinc-700 text-foreground dark:text-white font-medium">Cancel</button>
                                <button onClick={handleUpdateService} className="px-6 py-2 rounded text-sm bg-emerald-600 hover:bg-emerald-500 text-foreground dark:text-white font-bold">Save Service</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
