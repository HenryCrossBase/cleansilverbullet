"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input as ShadcnInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
    ArrowLeft,
    BadgeCheck,
    ClipboardList,
    Coins,
    LayoutDashboard,
    LifeBuoy,
    Megaphone,
    Scale,
    ScrollText,
    Settings as SettingsIcon,
    Shield,
    SlidersHorizontal,
    Users,
    Wallet,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
type Section =
    | "dashboard"
    | "settings"
    | "users"
    | "credits"
    | "ranks"
    | "badges"
    | "ads"
    | "withdrawals"
    | "tickets"
    | "requests"
    | "disputes"
    | "admin-mgmt"
    | "audit";

interface UserRow {
    id: string;
    username: string;
    email: string;
    rank: string;
    credits: number;
    vendorBalance: number;
    bannedUntil: string | null;
    banReason: string | null;
    adminRoles: string | null;
    customSplit: number | null;
    hasBlueBadge: boolean;
    customBadges: string | null;
    createdAt: string;
    lastOnline: string;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
const API = process.env.NEXT_PUBLIC_API_URL || "";

function getToken() {
    if (typeof document === "undefined") return "";
    const tokenCookie = document.cookie
        .split(";")
        .map((part) => part.trim())
        .find((part) => part.startsWith("sb_token="));

    if (!tokenCookie) return "";
    return decodeURIComponent(tokenCookie.slice("sb_token=".length));
}

async function apiFetch(path: string, opts: RequestInit = {}) {
    const token = getToken();
    const res = await fetch(`${API}${path}`, {
        ...opts,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            ...(opts.headers || {}),
        },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
}

const BADGE_LIST = ["DEV", "LGBTQ", "BUG_HUNTER", "GHOST"];
const RANK_LIST = ["USER", "STARTER", "PRO", "PREMIUM", "ENTERPRISE", "ADMIN"];
const ROLE_NAMES: Record<number, string> = {
    0: "Owner",
    1: "Co-Owner",
    2: "Moderator",
    3: "Support",
};
const ROLE_COLORS: Record<number, string> = {
    0: "#f59e0b",
    1: "#3b82f6",
    2: "#8b5cf6",
    3: "#10b981",
};
const RANK_COLORS: Record<string, string> = {
    ADMIN: "#ef4444",
    ENTERPRISE: "#f59e0b",
    PREMIUM: "#8b5cf6",
    PRO: "#10b981",
    STARTER: "#64748b",
    USER: "#475569",
};

// ─────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────
function Pill({ label, color }: { label: string; color?: string }) {
    return (
        <Badge
            className="text-[10px] font-bold font-mono tracking-widest px-2 py-0.5 rounded-md"
            style={{
                background: color ? `${color}15` : "var(--bg-tertiary)",
                color: color || "var(--text-secondary)",
                border: `1px solid ${color ? color + '40' : "var(--border-color)"}`,
                boxShadow: color ? `0 0 10px ${color}10` : "none",
            }}
        >
            {label}
        </Badge>
    );
}

function StatCard({
    label,
    value,
    sub,
    accent,
}: {
    label: string;
    value: string | number;
    sub?: string;
    accent?: string;
}) {
    return (
        <Card
            className="min-w-0 bg-card/80 backdrop-blur-md rounded-2xl border border-border/50 shadow-xl overflow-hidden relative group"
        >
            <div 
                className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none"
                style={{
                    background: accent ? `radial-gradient(circle at top right, ${accent}, transparent 70%)` : "none"
                }}
            />
            <div 
                className="absolute left-0 top-0 bottom-0 w-1"
                style={{ backgroundColor: accent || "var(--accent-silver)" }}
            />
            <CardContent className="px-5 py-6 lg:px-7 relative z-10">
                <div className="text-muted-foreground text-xs uppercase tracking-widest mb-3 font-semibold">
                    {label}
                </div>
                <div className="text-primary text-[28px] font-extrabold font-mono tracking-tight drop-shadow-sm">
                    {value}
                </div>
                {sub && (
                    <div className="text-muted-foreground text-[13px] mt-2 font-medium">
                        {sub}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function Input({
    label,
    value,
    onChange,
    type = "text",
    placeholder,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    type?: string;
    placeholder?: string;
}) {
    return (
        <div className="mb-5">
            <Label className="block mb-2.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">{label}</Label>
            <ShadcnInput
                type={type}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="bg-background/50 backdrop-blur-sm border-border/50 rounded-xl focus:ring-2 focus:ring-primary/50 shadow-inner px-4 py-6 font-mono text-sm transition-all duration-300"
            />
        </div>
    );
}

function ActionBtn({
    children,
    onClick,
    variant = "primary",
    disabled,
}: {
    children: React.ReactNode;
    onClick: () => void;
    variant?: "primary" | "danger" | "ghost" | "success";
    disabled?: boolean;
}) {
    let classes = "w-full font-bold tracking-wider uppercase text-xs rounded-xl py-6 transition-all duration-300 ";
    
    if (variant === "primary") {
        classes += "bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground hover:shadow-[0_0_15px_rgba(var(--primary),0.3)]";
    } else if (variant === "danger") {
        classes += "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-destructive-foreground hover:shadow-[0_0_15px_rgba(239,68,68,0.3)]";
    } else if (variant === "success") {
        classes += "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white hover:shadow-[0_0_15px_rgba(16,185,129,0.3)]";
    } else {
        classes += "bg-transparent border border-border/50 text-muted-foreground hover:text-foreground hover:bg-background/50";
    }

    return (
        <Button
            onClick={onClick}
            disabled={disabled}
            className={classes}
        >
            {children}
        </Button>
    );
}

function MiniBtn({
    children,
    onClick,
    variant = "ghost",
    disabled,
}: {
    children: React.ReactNode;
    onClick: () => void;
    variant?: "primary" | "danger" | "ghost" | "success";
    disabled?: boolean;
}) {
    let classes = "font-bold tracking-wider uppercase text-[10px] rounded-lg px-3 py-1.5 h-auto transition-all duration-300 ";
    
    if (variant === "primary") {
        classes += "bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-primary-foreground";
    } else if (variant === "danger") {
        classes += "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-destructive-foreground";
    } else if (variant === "success") {
        classes += "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white";
    } else {
        classes += "bg-transparent border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/30";
    }

    return (
        <Button
            onClick={onClick}
            disabled={disabled}
            className={classes}
            size="sm"
        >
            {children}
        </Button>
    );
}

function Modal({
    title,
    onClose,
    children,
}: {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
}) {
    return (
        <Dialog open onOpenChange={(o) => !o && onClose()}>
            <DialogContent className="max-w-140 max-h-[85vh] overflow-auto bg-card/95 backdrop-blur-xl border-border rounded-2xl shadow-2xl">
                <DialogHeader className="mb-4">
                    <DialogTitle className="text-xl font-bold uppercase tracking-widest text-primary">{title}</DialogTitle>
                </DialogHeader>
                {children}
            </DialogContent>
        </Dialog>
    );
}

// ─────────────────────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────────────────────
export default function AdminDashboard() {
    const [section, setSection] = useState<Section>("dashboard");
    const [perms, setPerms] = useState<string[]>([]);
    const [roleNames, setRoleNames] = useState<string[]>([]);
    const [adminUser, setAdminUser] = useState<string>("Admin");

    // Dashboard
    const [stats, setStats] = useState<any>(null);
    const [chartData, setChartData] = useState<any[]>([]);

    // Users
    const [users, setUsers] = useState<UserRow[]>([]);
    const [userTotal, setUserTotal] = useState(0);
    const [userPage, setUserPage] = useState(0);
    const [userSearch, setUserSearch] = useState("");
    const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
    const [userDetail, setUserDetail] = useState<any>(null);
    const [userModal, setUserModal] = useState<string | null>(null);

    // Modals state
    const [mCreditAmt, setMCreditAmt] = useState("");
    const [mCreditMode, setMCreditMode] = useState<"add" | "reduce">("add");
    const [mRank, setMRank] = useState("");
    const [mSplit, setMSplit] = useState("");
    const [mNewUser, setMNewUser] = useState("");
    const [mNewEmail, setMNewEmail] = useState("");
    const [mNewPass, setMNewPass] = useState("");
    const [mBanDays, setMBanDays] = useState("");
    const [mBanReason, setMBanReason] = useState("");

    // Ads
    const [ads, setAds] = useState<any[]>([]);
    // Withdrawals
    const [wds, setWds] = useState<any[]>([]);
    const [wdFilter, setWdFilter] = useState("PENDING");
    // Tickets
    const [tickets, setTickets] = useState<any[]>([]);
    const [ticketFilter, setTicketFilter] = useState("PENDING");
    const [replyModal, setReplyModal] = useState<any>(null);
    const [replyText, setReplyText] = useState("");
    // Requests
    const [requests, setRequests] = useState<any[]>([]);
    const [reqFilter, setReqFilter] = useState("PENDING");
    // Disputes
    const [disputes, setDisputes] = useState<any[]>([]);
    const [dispFilter, setDispFilter] = useState("OPEN");
    // Admin mgmt
    const [newAdminForm, setNewAdminForm] = useState({
        username: "",
        email: "",
        password: "",
    });
    // Admin roles
    const [allAdmins, setAllAdmins] = useState<any[]>([]);
    const [selectedAdmins, setSelectedAdmins] = useState<string[]>([]);
    const [selectedRoles, setSelectedRoles] = useState<number[]>([]);
    // Audit
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [auditPage, setAuditPage] = useState(0);
    const [auditTotal, setAuditTotal] = useState(0);

    // Banner Settings
    const [bannerActive, setBannerActive] = useState(false);
    const [bannerMessage, setBannerMessage] = useState("");
    const [bannerColor, setBannerColor] = useState("bg-indigo-600");

    const loadSettings = async () => {
        try {
            const d = await apiFetch("/api/admin/settings/banner");
            setBannerActive(d.settings?.bannerActive || false);
            setBannerMessage(d.settings?.bannerMessage || "");
            setBannerColor(d.settings?.bannerColor || "bg-indigo-600");
        } catch (e: any) {
            showToast(e.message, "err");
        }
    };

    const saveSettings = async () => {
        setLoading(true);
        try {
            await apiFetch("/api/admin/settings/banner", {
                method: "PUT",
                body: JSON.stringify({ active: bannerActive, message: bannerMessage, color: bannerColor }),
            });
            showToast("Banner settings saved", "ok");
        } catch (e: any) {
            showToast(e.message, "err");
        } finally {
            setLoading(false);
        }
    };

    const [loading, setLoading] = useState(false);

    // Toast helper: map old (msg, type) signature to sonner
    const showToast = useCallback(
        (msg: string, type: "ok" | "err" | "info" = "ok") => {
            if (type === "ok") toast.success(msg);
            else if (type === "err") toast.error(msg);
            else toast.info(msg);
        },
        [],
    );

    // ── Init ────────────────────────────────────────────────────
    useEffect(() => {
        apiFetch("/api/admin/me/permissions")
            .then((d) => {
                setPerms(d.permissions || []);
                setRoleNames(d.roleNames || []);
            })
            .catch(() => {});
        apiFetch("/api/user/me")
            .then((d) => setAdminUser(d.user?.username || "Admin"))
            .catch(() => {});
    }, []);

    // ── Section loaders ─────────────────────────────────────────
    useEffect(() => {
        if (section === "dashboard") loadStats();
        if (section === "settings") loadSettings();
        if (section === "users") loadUsers();
        if (section === "ads") loadAds();
        if (section === "withdrawals") loadWds();
        if (section === "tickets") loadTickets();
        if (section === "requests") loadRequests();
        if (section === "disputes") loadDisputes();
        if (section === "audit") loadAudit();
        if (section === "admin-mgmt") loadAllAdmins();
    }, [section]);

    useEffect(() => {
        if (section === "withdrawals") loadWds();
    }, [wdFilter]);
    useEffect(() => {
        if (section === "tickets") loadTickets();
    }, [ticketFilter]);
    useEffect(() => {
        if (section === "requests") loadRequests();
    }, [reqFilter]);
    useEffect(() => {
        if (section === "disputes") loadDisputes();
    }, [dispFilter]);
    useEffect(() => {
        if (section === "users") loadUsers();
    }, [userPage, userSearch]);

    const loadStats = async () => {
        try {
            const d = await apiFetch("/api/admin/telemetry");
            setStats(d.stats);
            setChartData(d.revenueChart || []);
        } catch (e: any) {
            showToast(e.message, "err");
        }
    };

    const loadUsers = async () => {
        try {
            const d = await apiFetch(
                `/api/admin/users?page=${userPage}&search=${encodeURIComponent(userSearch)}`,
            );
            setUsers(d.users || []);
            setUserTotal(d.total || 0);
        } catch (e: any) {
            showToast(e.message, "err");
        }
    };

    const loadUserDetail = async (username: string) => {
        try {
            const d = await apiFetch(
                `/api/admin/users/${encodeURIComponent(username)}/info`,
            );
            setUserDetail(d);
        } catch (e: any) {
            showToast(e.message, "err");
        }
    };

    const loadAds = async () => {
        try {
            const d = await apiFetch("/api/admin/ads");
            setAds(d.ads || []);
        } catch (e: any) {
            showToast(e.message, "err");
        }
    };

    const loadWds = async () => {
        try {
            const d = await apiFetch(
                `/api/admin/withdrawals?status=${wdFilter}`,
            );
            setWds(d.withdrawals || []);
        } catch (e: any) {
            showToast(e.message, "err");
        }
    };

    const loadTickets = async () => {
        try {
            const d = await apiFetch(
                `/api/admin/tickets?status=${ticketFilter}`,
            );
            setTickets(d.tickets || []);
        } catch (e: any) {
            showToast(e.message, "err");
        }
    };

    const loadRequests = async () => {
        try {
            const d = await apiFetch(`/api/admin/requests?status=${reqFilter}`);
            setRequests(d.requests || []);
        } catch (e: any) {
            showToast(e.message, "err");
        }
    };

    const loadDisputes = async () => {
        try {
            const d = await apiFetch(
                `/api/admin/disputes?status=${dispFilter}`,
            );
            setDisputes(d.disputes || []);
        } catch (e: any) {
            showToast(e.message, "err");
        }
    };

    const loadAudit = async () => {
        try {
            const d = await apiFetch(`/api/admin/audit?page=${auditPage}`);
            setAuditLogs(d.logs || []);
            setAuditTotal(d.total || 0);
        } catch (e: any) {
            showToast(e.message, "err");
        }
    };

    const loadAllAdmins = async () => {
        try {
            const d = await apiFetch("/api/admin/users?limit=100&rank=ADMIN");
            setAllAdmins(d.users || []);
        } catch (e: any) {
            showToast(e.message, "err");
        }
    };

    // ── User actions ─────────────────────────────────────────────
    const doAction = async (
        path: string,
        body: Record<string, any>,
        successMsg: string,
        cb?: () => void,
    ) => {
        setLoading(true);
        try {
            await apiFetch(path, {
                method: "POST",
                body: JSON.stringify(body),
            });
            showToast(successMsg, "ok");
            setUserModal(null);
            loadUsers();
            if (selectedUser) loadUserDetail(selectedUser.username);
            cb?.();
        } catch (e: any) {
            showToast(e.message, "err");
        } finally {
            setLoading(false);
        }
    };

    const doDelete = async (
        path: string,
        successMsg: string,
        cb?: () => void,
    ) => {
        setLoading(true);
        try {
            await apiFetch(path, { method: "DELETE" });
            showToast(successMsg, "ok");
            cb?.();
        } catch (e: any) {
            showToast(e.message, "err");
        } finally {
            setLoading(false);
        }
    };

    // ── Nav items ────────────────────────────────────────────────
    const navItems: {
        id: Section;
        icon: React.ReactNode;
        label: string;
        perm?: string;
        badge?: number;
    }[] = [
        {
            id: "dashboard",
            icon: <LayoutDashboard size={14} />,
            label: "Dashboard",
        },
        {
            id: "settings",
            icon: <SettingsIcon size={14} />,
            label: "Global Settings",
            perm: undefined,
        },
        {
            id: "users",
            icon: <Users size={14} />,
            label: "Users",
            perm: "view_users",
        },
        {
            id: "credits",
            icon: <Coins size={14} />,
            label: "Credits",
            perm: "manage_credits",
        },
        {
            id: "ranks",
            icon: <SlidersHorizontal size={14} />,
            label: "Ranks & Splits",
            perm: "change_rank",
        },
        {
            id: "badges",
            icon: <BadgeCheck size={14} />,
            label: "Badges",
            perm: "assign_badges",
        },
        {
            id: "disputes",
            icon: <Scale size={14} />,
            label: "Disputes",
            perm: "view_disputes",
            badge: stats?.openDisputes,
        },
        {
            id: "tickets",
            icon: <LifeBuoy size={14} />,
            label: "Tickets",
            perm: "view_tickets",
            badge: stats?.pendingTickets,
        },
        {
            id: "withdrawals",
            icon: <Wallet size={14} />,
            label: "Withdrawals",
            perm: "view_withdrawals",
            badge: stats?.pendingWithdraw,
        },
        {
            id: "requests",
            icon: <ClipboardList size={14} />,
            label: "Requests",
            perm: "approve_requests",
            badge: stats?.pendingRequests,
        },
        {
            id: "ads",
            icon: <Megaphone size={14} />,
            label: "Ads",
            perm: "view_ads",
        },
        {
            id: "admin-mgmt",
            icon: <Shield size={14} />,
            label: "Admin Mgmt",
            perm: undefined,
        },
        {
            id: "audit",
            icon: <ScrollText size={14} />,
            label: "Audit Log",
            perm: "view_audit",
        },
    ];

    const canSee = (perm?: string) => !perm || perms.includes(perm);
    const canSeeAdminMgmt =
        perms.includes("create_admin") || perms.includes("set_admin_roles");

    // ─────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────
    return (
        <div className="admin-shell flex min-h-screen flex-col bg-background font-sans text-foreground xl:flex-row xl:items-stretch">
            {/* ── Sidebar ───────────────────────────────────────── */}
            <aside className="admin-sidebar flex shrink-0 flex-col overflow-y-auto border-b border-border/50 bg-card/80 backdrop-blur-xl xl:min-h-screen xl:w-70 xl:border-b-0 xl:border-r xl:border-border/50 shadow-2xl z-50 relative">
                {/* Logo */}
                <div className="border-b border-border/50 px-4 pb-4 pt-5 sm:px-5 sm:pb-5 sm:pt-6 relative overflow-hidden">
                    <div className="absolute -top-10 -left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="mb-3 flex items-center gap-2.5 relative z-10">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-[0_0_15px_rgba(var(--primary),0.2)]">
                            <Shield size={16} />
                        </div>
                        <span className="text-foreground font-black text-lg tracking-widest uppercase">
                            Admin <span className="text-primary drop-shadow-sm">Console</span>
                        </span>
                    </div>
                    <div className="text-xs text-muted-foreground tracking-widest uppercase font-bold relative z-10">
                        System Level Access
                    </div>
                    <div className="mt-4 text-[13px] text-muted-foreground bg-background/50 p-3 rounded-xl border border-border/50 relative z-10">
                        <div className="mb-1">
                            <span>Logged in as: </span>
                            <span className="text-foreground font-bold">{adminUser}</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {roleNames.map((r) => (
                                <span
                                    key={r}
                                    className="text-[10px] py-0.5 px-2 bg-primary/10 rounded-md text-primary font-bold tracking-widest uppercase border border-primary/20"
                                >
                                    {r}
                                </span>
                            ))}
                        </div>
                    </div>

                    <Button
                        asChild
                        variant="outline"
                        className="mt-4 w-full justify-center gap-2 bg-transparent border-border/50 hover:bg-background/80 hover:text-foreground text-muted-foreground font-bold tracking-widest uppercase text-xs rounded-xl relative z-10"
                    >
                        <Link href="/">
                            <ArrowLeft size={16} /> Exit To Market
                        </Link>
                    </Button>
                </div>

                {/* Nav */}
                <nav className="flex gap-2 overflow-x-auto px-3 py-4 xl:flex-1 xl:flex-col xl:gap-1 xl:px-3">
                    {navItems
                        .filter((n) =>
                            n.id === "admin-mgmt"
                                ? canSeeAdminMgmt
                                : canSee(n.perm),
                        )
                        .map((n) => (
                            <Button
                                key={n.id}
                                onClick={() => setSection(n.id)}
                                variant="ghost"
                                className={cn(
                                    "flex shrink-0 items-center justify-start gap-3 whitespace-nowrap rounded-xl px-4 py-3 text-sm font-bold uppercase tracking-wider transition-all duration-300 xl:w-full",
                                    section === n.id
                                        ? "bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(var(--primary),0.15)]"
                                        : "text-muted-foreground border border-transparent hover:bg-muted/10 hover:text-foreground",
                                )}
                            >
                                <span className={cn("inline-flex transition-transform duration-300", section === n.id ? "scale-110" : "")}>
                                    {n.icon}
                                </span>
                                <span className="flex-1 text-left">
                                    {n.label}
                                </span>
                                {n.badge ? (
                                    <Badge
                                        variant="secondary"
                                        className="text-[10px] bg-primary/20 text-primary border-primary/30 ml-2"
                                    >
                                        {n.badge}
                                    </Badge>
                                ) : null}
                            </Button>
                        ))}
                </nav>

                {/* Footer */}
                <div className="border-t border-border/50 px-4 py-4 text-xs font-mono text-muted-foreground sm:px-5">
                    V2.0 // SILVERBULLET
                </div>
            </aside>

            {/* ── Main content ──────────────────────────────────── */}
            <main className="admin-main min-w-0 flex-1 px-0 py-5 sm:py-7 lg:py-9 xl:min-h-screen relative overflow-hidden bg-background">
                {/* Background glow effects for the main content area */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none"></div>
                
                <div className="admin-content mx-auto w-full max-w-400 px-4 pb-6 pt-0 sm:px-6 sm:pb-7 lg:px-8 lg:pb-8 relative z-10">
                    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between bg-card/40 backdrop-blur-md border border-border/50 rounded-2xl p-4 sm:px-6">
                        <div className="text-muted-foreground text-xs uppercase tracking-widest font-bold flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                            Administration Area // {section.toUpperCase()}
                        </div>
                        <Button asChild variant="outline" className="gap-2 bg-transparent border-border/50 hover:bg-muted/30 text-xs font-bold uppercase tracking-widest rounded-xl">
                            <Link href="/market">
                                <ArrowLeft size={16} /> Back to Market
                            </Link>
                        </Button>
                    </div>

                    {/* ═══ DASHBOARD ═══════════════════════════════════ */}
                    {section === "dashboard" && (
                        <div>
                            <PageHeader
                                title="Global Telemetry"
                                sub="Real-time platform overview"
                            />
                            {!stats ? (
                                <Loader />
                            ) : (
                                <>
                                    <div className="grid gap-3.5 mb-7 grid-cols-[repeat(auto-fill,minmax(180px,1fr))]">
                                        <StatCard
                                            label="Total Users"
                                            value={stats.userCount}
                                            accent="#3b82f6"
                                        />
                                        <StatCard
                                            label="Active Vendors"
                                            value={stats.vendorCount}
                                            accent="#10b981"
                                        />
                                        <StatCard
                                            label="Buyers"
                                            value={stats.buyerCount}
                                            accent="#6366f1"
                                        />
                                        <StatCard
                                            label="Administrators"
                                            value={stats.adminCount}
                                            accent="#ef4444"
                                        />
                                        <StatCard
                                            label="Daily Deposits"
                                            value={`$${stats.dailyGross}`}
                                            accent="#f59e0b"
                                        />
                                        <StatCard
                                            label="Earning Net"
                                            value={`$${stats.platformProfit}`}
                                            accent="#22c55e"
                                        />
                                        <StatCard
                                            label="Market Volume"
                                            value={`$${stats.totalVolume}`}
                                            accent="#0ea5e9"
                                        />
                                        <StatCard
                                            label="Open Disputes"
                                            value={stats.openDisputes}
                                            accent="#f97316"
                                        />
                                        <StatCard
                                            label="Pending Tickets"
                                            value={stats.pendingTickets}
                                            accent="#a855f7"
                                        />
                                        <StatCard
                                            label="Pending Withdraws"
                                            value={stats.pendingWithdraw}
                                            accent="#ec4899"
                                        />
                                        <StatCard
                                            label="Pending Requests"
                                            value={stats.pendingRequests}
                                            accent="#14b8a6"
                                        />
                                    </div>

                                    {/* Revenue mini-chart */}
                                    <div className="bg-[#050d1a] border border-slate-900 rounded-xl p-6 mb-5">
                                        <div className="text-slate-500 text-xs uppercase tracking-[0.08em] mb-4">
                                            7-Day Revenue (USD)
                                        </div>
                                        <div className="flex items-end gap-2 h-20">
                                            {chartData.map((d, i) => {
                                                const max = Math.max(
                                                    ...chartData.map(
                                                        (c) => c.amount,
                                                    ),
                                                    1,
                                                );
                                                const pct = Math.max(
                                                    (d.amount / max) * 100,
                                                    4,
                                                );
                                                return (
                                                    <div
                                                        key={i}
                                                        className="flex-1 flex flex-col items-center gap-1"
                                                    >
                                                        <div className="text-[11px] text-slate-700">
                                                            $
                                                            {d.amount.toFixed(
                                                                0,
                                                            )}
                                                        </div>
                                                        <div
                                                            className="w-full bg-blue-700 rounded-[4px_4px_0_0] min-h-1 transition-[height_0.3s]"
                                                            style={{
                                                                height: `${pct}%`,
                                                            }}
                                                        />
                                                        <div className="text-[11px] text-slate-600">
                                                            {d.day}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Quick actions */}
                                    <div className="bg-[#050d1a] border border-slate-900 rounded-xl p-6">
                                        <div className="text-slate-500 text-xs uppercase tracking-[0.08em] mb-4">
                                            Quick Actions
                                        </div>
                                        <div className="flex gap-2.5 flex-wrap">
                                            {stats.pendingWithdraw > 0 && (
                                                <ActionBtn
                                                    onClick={() =>
                                                        setSection(
                                                            "withdrawals",
                                                        )
                                                    }
                                                >
                                                    💸 Review{" "}
                                                    {stats.pendingWithdraw}{" "}
                                                    Withdrawal
                                                    {stats.pendingWithdraw !== 1
                                                        ? "s"
                                                        : ""}
                                                </ActionBtn>
                                            )}
                                            {stats.openDisputes > 0 && (
                                                <ActionBtn
                                                    onClick={() =>
                                                        setSection("disputes")
                                                    }
                                                    variant="danger"
                                                >
                                                    ⚖ Arbitrate{" "}
                                                    {stats.openDisputes} Dispute
                                                    {stats.openDisputes !== 1
                                                        ? "s"
                                                        : ""}
                                                </ActionBtn>
                                            )}
                                            {stats.pendingTickets > 0 && (
                                                <ActionBtn
                                                    onClick={() =>
                                                        setSection("tickets")
                                                    }
                                                    variant="ghost"
                                                >
                                                    ✉ Answer{" "}
                                                    {stats.pendingTickets}{" "}
                                                    Ticket
                                                    {stats.pendingTickets !== 1
                                                        ? "s"
                                                        : ""}
                                                </ActionBtn>
                                            )}
                                            {stats.pendingRequests > 0 && (
                                                <ActionBtn
                                                    onClick={() =>
                                                        setSection("requests")
                                                    }
                                                    variant="success"
                                                >
                                                    📦 Review{" "}
                                                    {stats.pendingRequests}{" "}
                                                    Request
                                                    {stats.pendingRequests !== 1
                                                        ? "s"
                                                        : ""}
                                                </ActionBtn>
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* ═══ SETTINGS ════════════════════════════════════ */}
                    {section === "settings" && (
                        <div>
                            <PageHeader
                                title="Global Banner Settings"
                                sub="Configure the announcement banner displayed to all users."
                            />
                            <Card className="max-w-2xl bg-[#050d1a] border border-slate-900 rounded-xl p-6">
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3">
                                        <Checkbox
                                            id="bannerActive"
                                            checked={bannerActive}
                                            onCheckedChange={(checked) => setBannerActive(!!checked)}
                                        />
                                        <Label htmlFor="bannerActive" className="text-white cursor-pointer font-medium">Enable Global Banner</Label>
                                    </div>

                                    <div>
                                        <Label className="text-slate-400 mb-2 block text-xs uppercase tracking-widest">Banner Message</Label>
                                        <ShadcnInput 
                                            value={bannerMessage}
                                            onChange={(e) => setBannerMessage(e.target.value)}
                                            placeholder="E.g., Welcome to the new Silverbullet marketplace!"
                                            className="bg-[#0a1628] border-slate-800 text-white font-mono"
                                        />
                                    </div>

                                    <div>
                                        <Label className="text-slate-400 mb-2 block text-xs uppercase tracking-widest">Banner Color</Label>
                                        <select 
                                            value={bannerColor}
                                            onChange={(e) => setBannerColor(e.target.value)}
                                            className="w-full bg-[#0a1628] border border-slate-800 text-white rounded-md p-2 outline-none focus:border-blue-500 font-mono text-sm"
                                        >
                                            <option value="bg-indigo-600">Indigo</option>
                                            <option value="bg-blue-600">Blue</option>
                                            <option value="bg-green-600">Green</option>
                                            <option value="bg-red-600">Red</option>
                                            <option value="bg-yellow-600">Yellow</option>
                                            <option value="bg-purple-600">Purple</option>
                                            <option value="bg-slate-800">Dark</option>
                                        </select>
                                    </div>

                                    <Button 
                                        onClick={saveSettings} 
                                        disabled={loading}
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold tracking-widest uppercase text-xs"
                                    >
                                        {loading ? "Saving..." : "Save Settings"}
                                    </Button>
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* ═══ USERS ══════════════════════════════════════════ */}
                    {section === "users" && (
                        <div>
                            <PageHeader
                                title="User Database"
                                sub={`${userTotal} total identities`}
                            />
                            <div className="flex gap-3 mb-5">
                                <div className="flex-1">
                                    <ShadcnInput
                                        placeholder="Search username or email..."
                                        value={userSearch}
                                        onChange={(e) => {
                                            setUserSearch(e.target.value);
                                            setUserPage(0);
                                        }}
                                        className="sb-input font-[inherit] box-border h-auto"
                                    />
                                </div>
                                <ActionBtn onClick={loadUsers}>
                                    Refresh
                                </ActionBtn>
                            </div>

                            <Table
                                headers={[
                                    "Username",
                                    "Email",
                                    "Rank",
                                    "BLT",
                                    "Vault",
                                    "Status",
                                    "Actions",
                                ]}
                            >
                                {users.map((u) => (
                                    <tr
                                        key={u.id}
                                        className="border-b border-b-slate-900"
                                    >
                                        <Td>
                                            <span
                                                onClick={() => {
                                                    setSelectedUser(u);
                                                    loadUserDetail(u.username);
                                                }}
                                                className="text-blue-400 cursor-pointer font-bold"
                                            >
                                                {u.username}
                                            </span>
                                            {u.hasBlueBadge && (
                                                <span className="ml-1.5 text-[11px]">
                                                    🔵
                                                </span>
                                            )}
                                        </Td>
                                        <Td>
                                            <span className="text-slate-500 text-[13px]">
                                                {u.email}
                                            </span>
                                        </Td>
                                        <Td>
                                            <Pill
                                                label={u.rank}
                                                color={RANK_COLORS[u.rank]}
                                            />
                                        </Td>
                                        <Td>
                                            <span className="text-amber-500 font-mono">
                                                {u.credits.toFixed(0)}
                                            </span>
                                        </Td>
                                        <Td>
                                            <span className="text-green-500 font-mono">
                                                $
                                                {u.vendorBalance?.toFixed(2) ||
                                                    "0.00"}
                                            </span>
                                        </Td>
                                        <Td>
                                            {u.bannedUntil ? (
                                                <Pill
                                                    label="BANNED"
                                                    color="#ef4444"
                                                />
                                            ) : (
                                                <Pill
                                                    label="ACTIVE"
                                                    color="#22c55e"
                                                />
                                            )}
                                        </Td>
                                        <Td>
                                            <div className="flex gap-1.5">
                                                <MiniBtn
                                                    onClick={() => {
                                                        setSelectedUser(u);
                                                        loadUserDetail(
                                                            u.username,
                                                        );
                                                    }}
                                                >
                                                    View
                                                </MiniBtn>
                                                {perms.includes("ban_user") &&
                                                    !u.bannedUntil &&
                                                    u.rank !== "ADMIN" && (
                                                        <MiniBtn
                                                            variant="danger"
                                                            onClick={() => {
                                                                setSelectedUser(
                                                                    u,
                                                                );
                                                                setUserModal(
                                                                    "ban",
                                                                );
                                                            }}
                                                        >
                                                            Ban
                                                        </MiniBtn>
                                                    )}
                                                {perms.includes("unban_user") &&
                                                    u.bannedUntil && (
                                                        <MiniBtn
                                                            variant="success"
                                                            onClick={() =>
                                                                doAction(
                                                                    `/api/admin/users/${u.username}/unban`,
                                                                    {},
                                                                    `${u.username} unbanned`,
                                                                )
                                                            }
                                                        >
                                                            Unban
                                                        </MiniBtn>
                                                    )}
                                            </div>
                                        </Td>
                                    </tr>
                                ))}
                            </Table>

                            <Pagination
                                page={userPage}
                                total={userTotal}
                                perPage={20}
                                onPage={setUserPage}
                            />

                            {/* User detail drawer */}
                            {selectedUser && (
                                <UserDetailPanel
                                    user={selectedUser}
                                    detail={userDetail}
                                    perms={perms}
                                    onClose={() => {
                                        setSelectedUser(null);
                                        setUserDetail(null);
                                    }}
                                    onAction={(modal) => setUserModal(modal)}
                                />
                            )}

                            {/* ── User action modals ── */}
                            {userModal === "ban" && selectedUser && (
                                <Modal
                                    title={`Ban: ${selectedUser.username}`}
                                    onClose={() => setUserModal(null)}
                                >
                                    <Input
                                        label="Duration (days)"
                                        value={mBanDays}
                                        onChange={setMBanDays}
                                        type="number"
                                        placeholder="e.g. 7"
                                    />
                                    <Input
                                        label="Public Ban Reason"
                                        value={mBanReason}
                                        onChange={setMBanReason}
                                        placeholder="Visible to user on login"
                                    />
                                    <div className="flex gap-2.5 justify-end mt-1">
                                        <ActionBtn
                                            variant="ghost"
                                            onClick={() => setUserModal(null)}
                                        >
                                            Cancel
                                        </ActionBtn>
                                        <ActionBtn
                                            variant="danger"
                                            disabled={loading}
                                            onClick={() =>
                                                doAction(
                                                    `/api/admin/users/${selectedUser.username}/ban`,
                                                    {
                                                        days: mBanDays,
                                                        reason: mBanReason,
                                                    },
                                                    `${selectedUser.username} banned for ${mBanDays} days`,
                                                    () => {
                                                        setMBanDays("");
                                                        setMBanReason("");
                                                    },
                                                )
                                            }
                                        >
                                            Execute Ban
                                        </ActionBtn>
                                    </div>
                                </Modal>
                            )}
                            {userModal === "rename" && selectedUser && (
                                <Modal
                                    title={`Rename: ${selectedUser.username}`}
                                    onClose={() => setUserModal(null)}
                                >
                                    <Input
                                        label="New Username"
                                        value={mNewUser}
                                        onChange={setMNewUser}
                                        placeholder="New identity"
                                    />
                                    <div className="flex gap-2.5 justify-end">
                                        <ActionBtn
                                            variant="ghost"
                                            onClick={() => setUserModal(null)}
                                        >
                                            Cancel
                                        </ActionBtn>
                                        <ActionBtn
                                            disabled={loading}
                                            onClick={() =>
                                                doAction(
                                                    `/api/admin/users/${selectedUser.username}/rename`,
                                                    { newUsername: mNewUser },
                                                    `Username changed to ${mNewUser}`,
                                                    () => setMNewUser(""),
                                                )
                                            }
                                        >
                                            Rename
                                        </ActionBtn>
                                    </div>
                                </Modal>
                            )}
                            {userModal === "email" && selectedUser && (
                                <Modal
                                    title={`Change Email: ${selectedUser.username}`}
                                    onClose={() => setUserModal(null)}
                                >
                                    <Input
                                        label="New Email"
                                        value={mNewEmail}
                                        onChange={setMNewEmail}
                                        type="email"
                                        placeholder="new@email.com"
                                    />
                                    <div className="flex gap-2.5 justify-end">
                                        <ActionBtn
                                            variant="ghost"
                                            onClick={() => setUserModal(null)}
                                        >
                                            Cancel
                                        </ActionBtn>
                                        <ActionBtn
                                            disabled={loading}
                                            onClick={() =>
                                                doAction(
                                                    `/api/admin/users/${selectedUser.username}/email`,
                                                    { newEmail: mNewEmail },
                                                    `Email updated`,
                                                    () => setMNewEmail(""),
                                                )
                                            }
                                        >
                                            Update Email
                                        </ActionBtn>
                                    </div>
                                </Modal>
                            )}
                            {userModal === "password" && selectedUser && (
                                <Modal
                                    title={`Reset Password: ${selectedUser.username}`}
                                    onClose={() => setUserModal(null)}
                                >
                                    <Input
                                        label="New Password"
                                        value={mNewPass}
                                        onChange={setMNewPass}
                                        type="password"
                                        placeholder="Min 6 characters"
                                    />
                                    <div className="flex gap-2.5 justify-end">
                                        <ActionBtn
                                            variant="ghost"
                                            onClick={() => setUserModal(null)}
                                        >
                                            Cancel
                                        </ActionBtn>
                                        <ActionBtn
                                            variant="danger"
                                            disabled={loading}
                                            onClick={() =>
                                                doAction(
                                                    `/api/admin/users/${selectedUser.username}/password`,
                                                    { newPassword: mNewPass },
                                                    `Password reset`,
                                                    () => setMNewPass(""),
                                                )
                                            }
                                        >
                                            Reset Password
                                        </ActionBtn>
                                    </div>
                                </Modal>
                            )}
                        </div>
                    )}

                    {/* ═══ CREDITS ════════════════════════════════════════ */}
                    {section === "credits" && (
                        <div>
                            <PageHeader
                                title="BLT Credit Management"
                                sub="Add or deduct credits from user accounts"
                            />
                            <div className="admin-two-col grid gap-5 grid-cols-2">
                                <CreditForm mode="add" toast={toast} />
                                <CreditForm mode="reduce" toast={toast} />
                            </div>
                        </div>
                    )}

                    {/* ═══ RANKS & SPLITS ═════════════════════════════════ */}
                    {section === "ranks" && (
                        <div>
                            <PageHeader
                                title="Ranks & Revenue Splits"
                                sub="Manage user tiers and vendor split overrides"
                            />
                            <div className="admin-two-col grid gap-5 grid-cols-2">
                                <SimpleForm
                                    title="Change Rank"
                                    onSubmit={async (vals) => {
                                        try {
                                            await apiFetch(
                                                `/api/admin/users/${vals.username}/rank`,
                                                {
                                                    method: "POST",
                                                    body: JSON.stringify({
                                                        rank: vals.rank,
                                                    }),
                                                },
                                            );
                                            showToast(
                                                `Rank updated for ${vals.username}`,
                                                "ok",
                                            );
                                        } catch (e: any) {
                                            showToast(
                                                e.message || "Operation failed",
                                                "err",
                                            );
                                            throw e;
                                        }
                                    }}
                                >
                                    {(vals: any, set: any) => (
                                        <>
                                            <Input
                                                label="Username"
                                                value={vals.username || ""}
                                                onChange={(v) =>
                                                    set({
                                                        ...vals,
                                                        username: v,
                                                    })
                                                }
                                                placeholder="Target username"
                                            />
                                            <div className="mb-3.5">
                                                <label className="block text-slate-500 text-xs uppercase tracking-[0.06em] mb-1.5">
                                                    New Rank
                                                </label>
                                                <select
                                                    value={vals.rank || ""}
                                                    onChange={(e) =>
                                                        set({
                                                            ...vals,
                                                            rank: e.target
                                                                .value,
                                                        })
                                                    }
                                                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2.5 px-3.5 text-slate-100 text-sm outline-none font-[inherit]"
                                                >
                                                    <option value="">
                                                        — Select rank —
                                                    </option>
                                                    {RANK_LIST.map((r) => (
                                                        <option
                                                            key={r}
                                                            value={r}
                                                        >
                                                            {r}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </>
                                    )}
                                </SimpleForm>

                                <SimpleForm
                                    title="Override Revenue Split %"
                                    onSubmit={async (vals) => {
                                        try {
                                            const split =
                                                vals.split === "clear"
                                                    ? null
                                                    : vals.split;
                                            await apiFetch(
                                                `/api/admin/users/${vals.username}/split`,
                                                {
                                                    method: "POST",
                                                    body: JSON.stringify({
                                                        split,
                                                    }),
                                                },
                                            );
                                            showToast(
                                                `Split updated for ${vals.username}`,
                                                "ok",
                                            );
                                        } catch (e: any) {
                                            showToast(
                                                e.message || "Operation failed",
                                                "err",
                                            );
                                            throw e;
                                        }
                                    }}
                                >
                                    {(vals: any, set: any) => (
                                        <>
                                            <Input
                                                label="Username"
                                                value={vals.username || ""}
                                                onChange={(v) =>
                                                    set({
                                                        ...vals,
                                                        username: v,
                                                    })
                                                }
                                                placeholder="Target username"
                                            />
                                            <Input
                                                label='Split Multiplier (0.00–1.00, or "clear")'
                                                value={vals.split || ""}
                                                onChange={(v) =>
                                                    set({ ...vals, split: v })
                                                }
                                                placeholder="e.g. 0.90 for 90%, or 'clear'"
                                            />
                                        </>
                                    )}
                                </SimpleForm>
                            </div>
                        </div>
                    )}

                    {/* ═══ BADGES ═════════════════════════════════════════ */}
                    {section === "badges" && (
                        <div>
                            <PageHeader
                                title="Cosmetic Badge Assignment"
                                sub="Toggle or clear badges on any user"
                            />
                            <BadgePanel toast={toast} />
                        </div>
                    )}

                    {/* ═══ DISPUTES ═══════════════════════════════════════ */}
                    {section === "disputes" && (
                        <div>
                            <PageHeader
                                title="Dispute Arbitration"
                                sub="Open disputes require your resolution"
                            />
                            <FilterBar
                                options={[
                                    "OPEN",
                                    "REFUND_APPROVED",
                                    "REFUND_REJECTED",
                                    "ALL",
                                ]}
                                value={dispFilter}
                                onChange={setDispFilter}
                            />
                            <Table
                                headers={[
                                    "Order ID",
                                    "Buyer",
                                    "Vendor",
                                    "Status",
                                    "Opened",
                                    "Actions",
                                ]}
                            >
                                {disputes.map((d) => (
                                    <tr
                                        key={d.id}
                                        className="border-b border-b-slate-900"
                                    >
                                        <Td>
                                            <span className="font-mono text-slate-400 text-xs">
                                                {d.orderId?.substring(0, 12)}...
                                            </span>
                                        </Td>
                                        <Td>{d.buyerName}</Td>
                                        <Td>{d.vendorName}</Td>
                                        <Td>
                                            <DisputeStatusPill
                                                status={d.status}
                                            />
                                        </Td>
                                        <Td>
                                            <span className="text-slate-600 text-xs">
                                                {new Date(
                                                    d.createdAt,
                                                ).toLocaleDateString()}
                                            </span>
                                        </Td>
                                        <Td>
                                            <div className="flex gap-1.5">
                                                <MiniBtn
                                                    variant="primary"
                                                    onClick={() => window.open(`/disputes/${d.orderId}`, "_blank")}
                                                >
                                                    👁 View Chat
                                                </MiniBtn>
                                                {d.status === "OPEN" &&
                                                    perms.includes("resolve_disputes") && (
                                                        <>
                                                            <MiniBtn
                                                                variant="success"
                                                                onClick={() =>
                                                                    doAction(
                                                                        `/api/admin/disputes/${d.orderId}/resolve`,
                                                                        {
                                                                            action: "APPROVE",
                                                                        },
                                                                        "Refund approved",
                                                                        loadDisputes,
                                                                    )
                                                                }
                                                            >
                                                                ✅ Refund
                                                            </MiniBtn>
                                                            <MiniBtn
                                                                variant="danger"
                                                                onClick={() =>
                                                                    doAction(
                                                                        `/api/admin/disputes/${d.orderId}/resolve`,
                                                                        {
                                                                            action: "REJECT",
                                                                        },
                                                                        "Refund rejected",
                                                                        loadDisputes,
                                                                    )
                                                                }
                                                            >
                                                                ❌ Reject
                                                            </MiniBtn>
                                                        </>
                                                    )}
                                            </div>
                                        </Td>
                                    </tr>
                                ))}
                            </Table>
                            {disputes.length === 0 && (
                                <EmptyState msg="No disputes found." />
                            )}
                        </div>
                    )}

                    {/* ═══ TICKETS ════════════════════════════════════════ */}
                    {section === "tickets" && (
                        <div>
                            <PageHeader
                                title="Support Tickets"
                                sub="Reply or close support requests"
                            />
                            <FilterBar
                                options={[
                                    "PENDING",
                                    "ANSWERED",
                                    "CLOSED",
                                    "ALL",
                                ]}
                                value={ticketFilter}
                                onChange={setTicketFilter}
                            />
                            <Table
                                headers={[
                                    "User",
                                    "Subject",
                                    "Status",
                                    "Created",
                                    "Actions",
                                ]}
                            >
                                {tickets.map((t) => (
                                    <tr
                                        key={t.id}
                                        className="border-b border-b-slate-900"
                                    >
                                        <Td>{t.username}</Td>
                                        <Td>
                                            <span className="text-[13px]">
                                                {t.subject}
                                            </span>
                                        </Td>
                                        <Td>
                                            <TicketStatusPill
                                                status={t.status}
                                            />
                                        </Td>
                                        <Td>
                                            <span className="text-slate-600 text-xs">
                                                {new Date(
                                                    t.createdAt,
                                                ).toLocaleDateString()}
                                            </span>
                                        </Td>
                                        <Td>
                                            <div className="flex gap-1.5">
                                                {perms.includes(
                                                    "reply_tickets",
                                                ) &&
                                                    t.status !== "CLOSED" && (
                                                        <MiniBtn
                                                            variant="primary"
                                                            onClick={() => {
                                                                setReplyModal(
                                                                    t,
                                                                );
                                                                setReplyText(
                                                                    "",
                                                                );
                                                            }}
                                                        >
                                                            Reply
                                                        </MiniBtn>
                                                    )}
                                                {perms.includes(
                                                    "close_tickets",
                                                ) &&
                                                    t.status !== "CLOSED" && (
                                                        <MiniBtn
                                                            onClick={() =>
                                                                doAction(
                                                                    `/api/admin/tickets/${t.id}/close`,
                                                                    {},
                                                                    "Ticket closed",
                                                                    loadTickets,
                                                                )
                                                            }
                                                        >
                                                            Close
                                                        </MiniBtn>
                                                    )}
                                            </div>
                                        </Td>
                                    </tr>
                                ))}
                            </Table>
                            {tickets.length === 0 && (
                                <EmptyState msg="No tickets found." />
                            )}
                        </div>
                    )}

                    {/* Ticket reply modal */}
                    {replyModal && (
                        <Modal
                            title={`Reply: ${replyModal.subject}`}
                            onClose={() => setReplyModal(null)}
                        >
                            <div className="mb-3">
                                {replyModal.messages?.map(
                                    (m: any, i: number) => (
                                        <div
                                            key={i}
                                            className={cn(
                                                "py-2.5 px-3.5 rounded-lg mb-2",
                                                m.senderRank === "ADMIN"
                                                    ? "bg-[#1e3a5f]"
                                                    : "bg-slate-900",
                                                m.senderRank === "ADMIN"
                                                    ? "border border-[#1d4ed855]"
                                                    : "border border-slate-900",
                                            )}
                                        >
                                            <div className="text-[11px] text-slate-500 mb-1">
                                                {m.senderRank === "ADMIN"
                                                    ? "🛡 ADMIN"
                                                    : "👤 USER"}{" "}
                                                ·{" "}
                                                {new Date(
                                                    m.createdAt,
                                                ).toLocaleString()}
                                            </div>
                                            <div className="text-[13px] text-slate-300">
                                                {m.message}
                                            </div>
                                        </div>
                                    ),
                                )}
                            </div>
                            <textarea
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                                placeholder="Type your reply..."
                                rows={4}
                                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2.5 px-3.5 text-slate-100 text-[13px] outline-none font-[inherit] resize-y box-border"
                            />
                            <div className="flex gap-2.5 justify-end mt-3">
                                <ActionBtn
                                    variant="ghost"
                                    onClick={() => setReplyModal(null)}
                                >
                                    Cancel
                                </ActionBtn>
                                <ActionBtn
                                    disabled={loading || !replyText}
                                    onClick={async () => {
                                        setLoading(true);
                                        try {
                                            await apiFetch(
                                                `/api/admin/tickets/${replyModal.id}/reply`,
                                                {
                                                    method: "POST",
                                                    body: JSON.stringify({
                                                        message: replyText,
                                                    }),
                                                },
                                            );
                                            showToast("Reply sent", "ok");
                                            setReplyModal(null);
                                            loadTickets();
                                        } catch (e: any) {
                                            showToast(e.message, "err");
                                        } finally {
                                            setLoading(false);
                                        }
                                    }}
                                >
                                    Send Reply
                                </ActionBtn>
                            </div>
                        </Modal>
                    )}

                    {/* ═══ WITHDRAWALS ════════════════════════════════════ */}
                    {section === "withdrawals" && (
                        <div>
                            <PageHeader
                                title="Withdrawal Queue"
                                sub="Approve or reject pending payouts"
                            />
                            <FilterBar
                                options={["PENDING", "SENT", "REJECTED", "ALL"]}
                                value={wdFilter}
                                onChange={setWdFilter}
                            />
                            <Table
                                headers={[
                                    "Vendor",
                                    "Amount",
                                    "Network",
                                    "Address",
                                    "Status",
                                    "Date",
                                    "Actions",
                                ]}
                            >
                                {wds.map((w) => (
                                    <tr
                                        key={w.id}
                                        className="border-b border-b-slate-900"
                                    >
                                        <Td>
                                            <span className="text-slate-400">
                                                {w.user?.username || "?"}
                                            </span>
                                        </Td>
                                        <Td>
                                            <span className="text-amber-500 font-mono font-bold">
                                                ${w.amount.toFixed(2)}
                                            </span>
                                        </Td>
                                        <Td>
                                            <Pill
                                                label={w.network}
                                                color="#3b82f6"
                                            />
                                        </Td>
                                        <Td>
                                            <span className="font-mono text-[11px] text-slate-500">
                                                {w.cryptoAddress?.substring(
                                                    0,
                                                    20,
                                                )}
                                                ...
                                            </span>
                                        </Td>
                                        <Td>
                                            <WdStatusPill status={w.status} />
                                        </Td>
                                        <Td>
                                            <span className="text-slate-600 text-xs">
                                                {new Date(
                                                    w.createdAt,
                                                ).toLocaleDateString()}
                                            </span>
                                        </Td>
                                        <Td>
                                            {w.status === "PENDING" &&
                                                perms.includes(
                                                    "approve_withdrawals",
                                                ) && (
                                                    <div className="flex gap-1.5">
                                                        <MiniBtn
                                                            variant="success"
                                                            onClick={() =>
                                                                doAction(
                                                                    `/api/admin/withdrawals/${w.id}/approve`,
                                                                    {},
                                                                    "Marked as SENT",
                                                                    loadWds,
                                                                )
                                                            }
                                                        >
                                                            ✅ Pay
                                                        </MiniBtn>
                                                        <MiniBtn
                                                            variant="danger"
                                                            onClick={() =>
                                                                doAction(
                                                                    `/api/admin/withdrawals/${w.id}/reject`,
                                                                    {},
                                                                    "Rejected & refunded",
                                                                    loadWds,
                                                                )
                                                            }
                                                        >
                                                            ❌ Deny
                                                        </MiniBtn>
                                                    </div>
                                                )}
                                        </Td>
                                    </tr>
                                ))}
                            </Table>
                            {wds.length === 0 && (
                                <EmptyState msg="No withdrawals found." />
                            )}
                        </div>
                    )}

                    {/* ═══ REQUESTS ═══════════════════════════════════════ */}
                    {section === "requests" && (
                        <div>
                            <PageHeader
                                title="Custom Requests"
                                sub="Approve or reject user tool requests"
                            />
                            <FilterBar
                                options={[
                                    "PENDING",
                                    "APPROVED",
                                    "REJECTED",
                                    "FULFILLED",
                                    "ALL",
                                ]}
                                value={reqFilter}
                                onChange={setReqFilter}
                            />
                            <div className="flex flex-col gap-3">
                                {requests.map((r) => (
                                    <div
                                        key={r.id}
                                        className="bg-[#050d1a] border border-slate-900 rounded-xl p-5"
                                    >
                                        <div className="flex justify-between items-start mb-2.5">
                                            <div>
                                                <div className="text-slate-100 font-bold text-[15px] mb-1">
                                                    {r.title}
                                                </div>
                                                <div className="text-slate-500 text-xs">
                                                    By {r.user?.username} ·{" "}
                                                    {new Date(
                                                        r.createdAt,
                                                    ).toLocaleDateString()}
                                                </div>
                                            </div>
                                            <ReqStatusPill status={r.status} />
                                        </div>
                                        <div className="text-slate-400 text-[13px] leading-[1.6] mb-3.5">
                                            {r.description}
                                        </div>
                                        {r.status === "PENDING" &&
                                            perms.includes(
                                                "approve_requests",
                                            ) && (
                                                <div className="flex gap-2.5">
                                                    <ActionBtn
                                                        variant="success"
                                                        onClick={() =>
                                                            doAction(
                                                                `/api/admin/requests/${r.id}/approve`,
                                                                {},
                                                                "Request approved",
                                                                loadRequests,
                                                            )
                                                        }
                                                    >
                                                        ✅ Approve to Board
                                                    </ActionBtn>
                                                    <ActionBtn
                                                        variant="danger"
                                                        onClick={() =>
                                                            doAction(
                                                                `/api/admin/requests/${r.id}/reject`,
                                                                {},
                                                                "Request rejected",
                                                                loadRequests,
                                                            )
                                                        }
                                                    >
                                                        ❌ Reject
                                                    </ActionBtn>
                                                </div>
                                            )}
                                    </div>
                                ))}
                                {requests.length === 0 && (
                                    <EmptyState msg="No requests found." />
                                )}
                            </div>
                        </div>
                    )}

                    {/* ═══ ADS ════════════════════════════════════════════ */}
                    {section === "ads" && (
                        <div>
                            <PageHeader
                                title="Advertisement Management"
                                sub="Monitor and terminate active ad slots"
                            />
                            <div className="grid gap-3.5 grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
                                {ads.map((ad) => (
                                    <div
                                        key={ad.id}
                                        className="bg-[#050d1a] border border-slate-900 rounded-xl overflow-hidden"
                                    >
                                        <div className="bg-slate-900 py-3 px-4 flex justify-between items-center">
                                            <span className="text-slate-500 text-xs">
                                                Slot #{ad.slotId}
                                            </span>
                                            <Pill
                                                label={ad.status}
                                                color={
                                                    ad.status === "ACTIVE"
                                                        ? "#22c55e"
                                                        : "#94a3b8"
                                                }
                                            />
                                        </div>
                                        <div className="p-4">
                                            <div className="text-slate-400 text-xs mb-2">
                                                Vendor:{" "}
                                                <span className="text-slate-100 font-semibold">
                                                    {ad.vendor?.username}
                                                </span>
                                            </div>
                                            <div className="text-slate-500 text-xs mb-1">
                                                Clicks:{" "}
                                                <span className="text-amber-500">
                                                    {ad.clicks}
                                                </span>
                                            </div>
                                            <div className="text-slate-500 text-xs mb-1">
                                                Expires:{" "}
                                                {ad.expiresAt
                                                    ? new Date(
                                                          ad.expiresAt,
                                                      ).toLocaleDateString()
                                                    : "Never"}
                                            </div>
                                            <div className="text-slate-700 text-[11px] break-all mb-3">
                                                {ad.targetUrl}
                                            </div>
                                            {perms.includes("delete_ads") && (
                                                <ActionBtn
                                                    variant="danger"
                                                    onClick={() =>
                                                        doDelete(
                                                            `/api/admin/ads/${ad.id}`,
                                                            "Ad terminated",
                                                            loadAds,
                                                        )
                                                    }
                                                >
                                                    🗑 Terminate Ad
                                                </ActionBtn>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {ads.length === 0 && (
                                    <EmptyState msg="No active advertisements." />
                                )}
                            </div>
                        </div>
                    )}

                    {/* ═══ ADMIN MANAGEMENT ═══════════════════════════════ */}
                    {section === "admin-mgmt" && (
                        <div>
                            <PageHeader
                                title="Admin Management"
                                sub="Create admins and assign role titles"
                            />
                            <div className="admin-two-col grid gap-5 grid-cols-2">
                                {/* Create Admin */}
                                {perms.includes("create_admin") && (
                                    <div className="bg-[#050d1a] border border-slate-900 rounded-xl p-6">
                                        <div className="text-red-500 text-xs uppercase tracking-[0.08em] mb-5">
                                            ⬡ Deploy New Admin
                                        </div>
                                        <Input
                                            label="Username"
                                            value={newAdminForm.username}
                                            onChange={(v) =>
                                                setNewAdminForm((p) => ({
                                                    ...p,
                                                    username: v,
                                                }))
                                            }
                                            placeholder="Admin username"
                                        />
                                        <Input
                                            label="Email"
                                            value={newAdminForm.email}
                                            onChange={(v) =>
                                                setNewAdminForm((p) => ({
                                                    ...p,
                                                    email: v,
                                                }))
                                            }
                                            type="email"
                                            placeholder="admin@domain.com"
                                        />
                                        <Input
                                            label="Password"
                                            value={newAdminForm.password}
                                            onChange={(v) =>
                                                setNewAdminForm((p) => ({
                                                    ...p,
                                                    password: v,
                                                }))
                                            }
                                            type="password"
                                            placeholder="Min 8 characters"
                                        />
                                        <ActionBtn
                                            disabled={loading}
                                            onClick={async () => {
                                                setLoading(true);
                                                try {
                                                    await apiFetch(
                                                        "/api/admin/create-admin",
                                                        {
                                                            method: "POST",
                                                            body: JSON.stringify(
                                                                newAdminForm,
                                                            ),
                                                        },
                                                    );
                                                    showToast(
                                                        `Admin '${newAdminForm.username}' created`,
                                                        "ok",
                                                    );
                                                    setNewAdminForm({
                                                        username: "",
                                                        email: "",
                                                        password: "",
                                                    });
                                                    loadAllAdmins();
                                                } catch (e: any) {
                                                    showToast(e.message, "err");
                                                } finally {
                                                    setLoading(false);
                                                }
                                            }}
                                        >
                                            Deploy Administrator
                                        </ActionBtn>
                                    </div>
                                )}

                                {/* Assign Admin Roles */}
                                {perms.includes("set_admin_roles") && (
                                    <div className="bg-[#050d1a] border border-slate-900 rounded-xl p-6">
                                        <div className="text-amber-500 text-xs uppercase tracking-[0.08em] mb-5">
                                            ◆ Assign Role Titles
                                        </div>

                                        <div className="mb-4">
                                            <div className="text-slate-500 text-xs mb-2 uppercase tracking-[0.06em]">
                                                Select Admins
                                            </div>
                                            <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                                                {allAdmins.map((a) => (
                                                    <label
                                                        key={a.id}
                                                        className={cn(
                                                            "flex items-center gap-2 cursor-pointer py-1.5 px-2.5 rounded-md",
                                                            selectedAdmins.includes(
                                                                a.username,
                                                            )
                                                                ? "bg-slate-800"
                                                                : "bg-transparent",
                                                        )}
                                                    >
                                                        <Checkbox
                                                            checked={selectedAdmins.includes(
                                                                a.username,
                                                            )}
                                                            onCheckedChange={(
                                                                checked,
                                                            ) =>
                                                                setSelectedAdmins(
                                                                    (p) =>
                                                                        checked
                                                                            ? [
                                                                                  ...p,
                                                                                  a.username,
                                                                              ]
                                                                            : p.filter(
                                                                                  (
                                                                                      x,
                                                                                  ) =>
                                                                                      x !==
                                                                                      a.username,
                                                                              ),
                                                                )
                                                            }
                                                            className="accent-blue-500"
                                                        />
                                                        <span className="text-slate-100 text-[13px]">
                                                            {a.username}
                                                        </span>
                                                        {a.adminRoles && (
                                                            <span className="text-[11px] text-slate-500">
                                                                [
                                                                {a.adminRoles
                                                                    .split(",")
                                                                    .map(
                                                                        (
                                                                            r: string,
                                                                        ) =>
                                                                            ROLE_NAMES[
                                                                                +r
                                                                            ] ||
                                                                            r,
                                                                    )
                                                                    .join(", ")}
                                                                ]
                                                            </span>
                                                        )}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="mb-4">
                                            <div className="text-slate-500 text-xs mb-2 uppercase tracking-[0.06em]">
                                                Select Roles
                                            </div>
                                            <div className="grid gap-2 grid-cols-2">
                                                {[0, 1, 2, 3].map((r) => (
                                                    <label
                                                        key={r}
                                                        className="flex items-center gap-2 cursor-pointer py-2 px-3 rounded-lg"
                                                        style={{
                                                            border: `1px solid ${selectedRoles.includes(r) ? ROLE_COLORS[r] : "#1e293b"}`,
                                                            background:
                                                                selectedRoles.includes(
                                                                    r,
                                                                )
                                                                    ? `${ROLE_COLORS[r]}15`
                                                                    : "transparent",
                                                        }}
                                                    >
                                                        <Checkbox
                                                            checked={selectedRoles.includes(
                                                                r,
                                                            )}
                                                            onCheckedChange={(
                                                                checked,
                                                            ) =>
                                                                setSelectedRoles(
                                                                    (p) =>
                                                                        checked
                                                                            ? [
                                                                                  ...p,
                                                                                  r,
                                                                              ]
                                                                            : p.filter(
                                                                                  (
                                                                                      x,
                                                                                  ) =>
                                                                                      x !==
                                                                                      r,
                                                                              ),
                                                                )
                                                            }
                                                            style={{
                                                                accentColor:
                                                                    ROLE_COLORS[
                                                                        r
                                                                    ],
                                                            }}
                                                        />
                                                        <span
                                                            className="text-[13px] font-semibold"
                                                            style={{
                                                                color: selectedRoles.includes(
                                                                    r,
                                                                )
                                                                    ? ROLE_COLORS[
                                                                          r
                                                                      ]
                                                                    : "#64748b",
                                                            }}
                                                        >
                                                            {ROLE_NAMES[r]}
                                                        </span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>

                                        <ActionBtn
                                            disabled={
                                                loading ||
                                                selectedAdmins.length === 0
                                            }
                                            onClick={async () => {
                                                setLoading(true);
                                                try {
                                                    await apiFetch(
                                                        "/api/admin/users/admin-roles",
                                                        {
                                                            method: "POST",
                                                            body: JSON.stringify(
                                                                {
                                                                    usernames:
                                                                        selectedAdmins,
                                                                    roles: selectedRoles,
                                                                },
                                                            ),
                                                        },
                                                    );
                                                    showToast(
                                                        `Roles applied to ${selectedAdmins.length} admin(s)`,
                                                        "ok",
                                                    );
                                                    setSelectedAdmins([]);
                                                    setSelectedRoles([]);
                                                    loadAllAdmins();
                                                } catch (e: any) {
                                                    showToast(e.message, "err");
                                                } finally {
                                                    setLoading(false);
                                                }
                                            }}
                                        >
                                            Apply Role Titles
                                        </ActionBtn>
                                    </div>
                                )}
                            </div>

                            {/* Current admins table */}
                            <div className="mt-6 bg-[#050d1a] border border-slate-900 rounded-xl p-6">
                                <div className="text-slate-400 text-xs uppercase tracking-[0.08em] mb-4">
                                    Current Administrators
                                </div>
                                <Table
                                    headers={[
                                        "Username",
                                        "Email",
                                        "Admin Roles",
                                        "Credits",
                                        "Split",
                                    ]}
                                >
                                    {allAdmins.map((a) => (
                                        <tr
                                            key={a.id}
                                            className="border-b border-b-slate-900"
                                        >
                                            <Td>
                                                <span className="text-red-500 font-bold">
                                                    {a.username}
                                                </span>
                                            </Td>
                                            <Td>
                                                <span className="text-slate-500 text-[13px]">
                                                    {a.email}
                                                </span>
                                            </Td>
                                            <Td>
                                                <div className="flex gap-1 flex-wrap">
                                                    {(a.adminRoles || "")
                                                        .split(",")
                                                        .filter(Boolean)
                                                        .map((r: string) => (
                                                            <Pill
                                                                key={r}
                                                                label={
                                                                    ROLE_NAMES[
                                                                        +r
                                                                    ] || r
                                                                }
                                                                color={
                                                                    ROLE_COLORS[
                                                                        +r
                                                                    ]
                                                                }
                                                            />
                                                        ))}
                                                    {!a.adminRoles && (
                                                        <Pill
                                                            label="Legacy (Full)"
                                                            color="#ef4444"
                                                        />
                                                    )}
                                                </div>
                                            </Td>
                                            <Td>
                                                <span className="text-amber-500 font-mono">
                                                    {a.credits}
                                                </span>
                                            </Td>
                                            <Td>
                                                <span className="text-slate-500 text-xs">
                                                    {a.customSplit !== null
                                                        ? `${(a.customSplit * 100).toFixed(0)}%`
                                                        : "DEFAULT"}
                                                </span>
                                            </Td>
                                        </tr>
                                    ))}
                                </Table>
                            </div>
                        </div>
                    )}

                    {/* ═══ AUDIT LOG ══════════════════════════════════════ */}
                    {section === "audit" && (
                        <div>
                            <PageHeader
                                title="Audit Trail"
                                sub={`${auditTotal} recorded events`}
                            />
                            <Table
                                headers={[
                                    "Timestamp",
                                    "Admin",
                                    "Action",
                                    "Target",
                                    "Details",
                                ]}
                            >
                                {auditLogs.map((log) => (
                                    <tr
                                        key={log.id}
                                        className="border-b border-b-slate-900"
                                    >
                                        <Td>
                                            <span className="text-slate-600 text-xs font-mono">
                                                {new Date(
                                                    log.createdAt,
                                                ).toLocaleString()}
                                            </span>
                                        </Td>
                                        <Td>
                                            <span className="text-red-500 font-semibold">
                                                {log.adminUsername}
                                            </span>
                                        </Td>
                                        <Td>
                                            <Pill
                                                label={log.action}
                                                color={
                                                    log.action.includes("BAN")
                                                        ? "#ef4444"
                                                        : log.action.includes(
                                                                "APPROVE",
                                                            )
                                                          ? "#22c55e"
                                                          : "#3b82f6"
                                                }
                                            />
                                        </Td>
                                        <Td>
                                            <span className="text-slate-400 font-mono text-xs">
                                                {log.target}
                                            </span>
                                        </Td>
                                        <Td>
                                            <span className="text-slate-700 text-[11px] font-mono">
                                                {(() => {
                                                    try {
                                                        const d = JSON.parse(
                                                            log.details,
                                                        );
                                                        return Object.entries(d)
                                                            .map(
                                                                ([k, v]) =>
                                                                    `${k}:${v}`,
                                                            )
                                                            .join(" ");
                                                    } catch {
                                                        return log.details;
                                                    }
                                                })()}
                                            </span>
                                        </Td>
                                    </tr>
                                ))}
                            </Table>
                            {auditLogs.length === 0 && (
                                <EmptyState msg="No audit events recorded yet." />
                            )}
                            <Pagination
                                page={auditPage}
                                total={auditTotal}
                                perPage={50}
                                onPage={(p) => {
                                    setAuditPage(p);
                                    loadAudit();
                                }}
                            />
                        </div>
                    )}
                </div>
            </main>

            <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }

                @media (max-width: 1024px) {
          .admin-two-col {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────
// Small helper components
// ─────────────────────────────────────────────────────────────
function PageHeader({ title, sub }: { title: string; sub?: string }) {
    return (
        <div className="mb-8">
            <h1 className="text-3xl font-black m-0 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-primary via-primary/80 to-muted-foreground drop-shadow-sm">
                {title}
            </h1>
            {sub && (
                <p className="text-muted-foreground text-[15px] mt-2 mx-0 mb-0 font-medium">
                    {sub}
                </p>
            )}
        </div>
    );
}

function Td({ children }: { children: React.ReactNode }) {
    return <td className="py-4 px-5 align-middle text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">{children}</td>;
}

function Table({
    headers,
    children,
}: {
    headers: string[];
    children: React.ReactNode;
}) {
    return (
        <div className="bg-card/40 backdrop-blur-md rounded-2xl border border-border/50 shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-muted/20 border-b border-border/50">
                            {headers.map((h) => (
                                <th
                                    key={h}
                                    className="py-4 px-5 text-left text-xs uppercase tracking-widest font-bold text-muted-foreground"
                                >
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="[&>tr]:border-b [&>tr]:border-border/10 [&>tr:last-child]:border-0 [&>tr]:transition-colors [&>tr]:duration-200 hover:[&>tr]:bg-muted/10">
                        {children}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function Loader() {
    return (
        <div className="text-primary font-mono animate-pulse text-center p-12 text-[15px] uppercase tracking-widest font-bold">
            Loading Telemetry...
        </div>
    );
}

function EmptyState({ msg }: { msg: string }) {
    return (
        <div className="bg-card/20 border border-dashed border-border/50 rounded-2xl text-muted-foreground text-center p-12 text-[15px] mt-4 font-mono">
            {msg}
        </div>
    );
}

function FilterBar({
    options,
    value,
    onChange,
}: {
    options: string[];
    value: string;
    onChange: (v: string) => void;
}) {
    return (
        <div className="flex gap-2 mb-4">
            {options.map((o) => (
                <button
                    key={o}
                    onClick={() => onChange(o)}
                    className={cn(
                        "rounded-lg py-2.25 px-4 text-[13px] cursor-pointer font-[inherit] uppercase tracking-[0.06em]",
                        value === o ? "bg-slate-800" : "bg-transparent",
                        value === o ? "text-slate-100" : "text-slate-600",
                        value === o
                            ? "border border-slate-700"
                            : "border border-slate-900",
                    )}
                >
                    {o}
                </button>
            ))}
        </div>
    );
}

function Pagination({
    page,
    total,
    perPage,
    onPage,
}: {
    page: number;
    total: number;
    perPage: number;
    onPage: (p: number) => void;
}) {
    const pages = Math.ceil(total / perPage);
    if (pages <= 1) return null;
    return (
        <div className="flex gap-2 justify-center mt-4">
            <button
                onClick={() => onPage(Math.max(0, page - 1))}
                disabled={page === 0}
                className="bg-slate-900 border border-slate-800 text-slate-500 rounded-lg py-2.25 px-3.5 cursor-pointer text-[13px]"
            >
                ◀
            </button>
            <span className="py-2.25 px-3.5 text-slate-600 text-[13px]">
                Page {page + 1} / {pages}
            </span>
            <button
                onClick={() => onPage(Math.min(pages - 1, page + 1))}
                disabled={page >= pages - 1}
                className="bg-slate-900 border border-slate-800 text-slate-500 rounded-lg py-2.25 px-3.5 cursor-pointer text-[13px]"
            >
                ▶
            </button>
        </div>
    );
}

function DisputeStatusPill({ status }: { status: string }) {
    const c: Record<string, string> = {
        OPEN: "#f97316",
        REFUND_APPROVED: "#22c55e",
        REFUND_REJECTED: "#ef4444",
        PENDING_ADMIN: "#f59e0b",
    };
    return <Pill label={status} color={c[status] || "#94a3b8"} />;
}

function TicketStatusPill({ status }: { status: string }) {
    const c: Record<string, string> = {
        PENDING: "#f59e0b",
        ANSWERED: "#3b82f6",
        CLOSED: "#475569",
    };
    return <Pill label={status} color={c[status] || "#94a3b8"} />;
}

function WdStatusPill({ status }: { status: string }) {
    const c: Record<string, string> = {
        PENDING: "#f59e0b",
        SENT: "#22c55e",
        REJECTED: "#ef4444",
    };
    return <Pill label={status} color={c[status] || "#94a3b8"} />;
}

function ReqStatusPill({ status }: { status: string }) {
    const c: Record<string, string> = {
        PENDING: "#f59e0b",
        APPROVED: "#22c55e",
        REJECTED: "#ef4444",
        FULFILLED: "#3b82f6",
    };
    return <Pill label={status} color={c[status] || "#94a3b8"} />;
}

// CreditForm — standalone credit add/reduce form
function CreditForm({
    mode,
    toast,
}: {
    mode: "add" | "reduce";
    toast: Function;
}) {
    const [username, setUsername] = useState("");
    const [amount, setAmount] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async () => {
        setLoading(true);
        try {
            const path = mode === "add" ? "add" : "reduce";
            await apiFetch(`/api/admin/users/${username}/credits/${path}`, {
                method: "POST",
                body: JSON.stringify({ amount }),
            });
            toast(
                `${mode === "add" ? "Added" : "Deducted"} ${amount} BLT ${mode === "add" ? "to" : "from"} ${username}`,
                "ok",
            );
            setUsername("");
            setAmount("");
        } catch (e: any) {
            toast(e.message, "err");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className={cn(
                "sb-card rounded-xl p-6",
                mode === "add" ? "border-green-900" : "border-red-900",
            )}
        >
            <div
                className={cn(
                    "text-xs uppercase tracking-[0.08em] mb-5",
                    mode === "add" ? "text-green-500" : "text-red-500",
                )}
            >
                {mode === "add" ? "Add BLT Credits" : "Deduct BLT Credits"}
            </div>
            <Input
                label="Target Username"
                value={username}
                onChange={setUsername}
                placeholder="Username"
            />
            <Input
                label="Amount (BLT)"
                value={amount}
                onChange={setAmount}
                type="number"
                placeholder="Integer amount"
            />
            <ActionBtn
                variant={mode === "add" ? "success" : "danger"}
                disabled={loading || !username || !amount}
                onClick={submit}
            >
                {mode === "add" ? "Add BLT" : "Deduct BLT"}
            </ActionBtn>
        </div>
    );
}

// SimpleForm — generic 2-field form card
function SimpleForm({
    title,
    onSubmit,
    children,
}: {
    title: string;
    onSubmit: (vals: any) => Promise<void>;
    children: (vals: any, set: (v: any) => void) => React.ReactNode;
}) {
    const [vals, setVals] = useState<any>({});
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");

    return (
        <div className="sb-card rounded-xl p-6">
            <div className="text-(--text-muted) text-xs uppercase tracking-[0.08em] mb-5">
                {title}
            </div>
            {err && (
                <div className="text-red-300 text-[13px] mb-3 py-2 px-3 bg-[#7f1d1d22] rounded-md">
                    {err}
                </div>
            )}
            {children(vals, setVals)}
            <ActionBtn
                disabled={loading}
                onClick={async () => {
                    setLoading(true);
                    setErr("");
                    try {
                        await onSubmit(vals);
                        setVals({});
                    } catch (e: any) {
                        setErr(e.message);
                    } finally {
                        setLoading(false);
                    }
                }}
            >
                Apply
            </ActionBtn>
        </div>
    );
}

// BadgePanel — badge toggle UI
function BadgePanel({ toast }: { toast: Function }) {
    const [username, setUsername] = useState("");
    const [userBadges, setUserBadges] = useState<string[]>([]);
    const [fetched, setFetched] = useState(false);
    const [loading, setLoading] = useState(false);

    const lookup = async () => {
        if (!username) return;
        setLoading(true);
        try {
            const d = await apiFetch(`/api/admin/users/${username}/info`);
            const badges = (d.user.customBadges || "")
                .split(",")
                .filter(Boolean);
            setUserBadges(badges);
            setFetched(true);
        } catch (e: any) {
            toast(e.message, "err");
        } finally {
            setLoading(false);
        }
    };

    const toggle = async (badge: string) => {
        setLoading(true);
        try {
            const d = await apiFetch(`/api/admin/users/${username}/badges`, {
                method: "POST",
                body: JSON.stringify({ badge, action: "toggle" }),
            });
            setUserBadges(d.badges || []);
            toast(`Badge ${badge} toggled`, "ok");
        } catch (e: any) {
            toast(e.message, "err");
        } finally {
            setLoading(false);
        }
    };

    const clearAll = async () => {
        setLoading(true);
        try {
            await apiFetch(`/api/admin/users/${username}/badges`, {
                method: "POST",
                body: JSON.stringify({ badge: null, action: "clear" }),
            });
            setUserBadges([]);
            toast("All badges cleared", "ok");
        } catch (e: any) {
            toast(e.message, "err");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="sb-card rounded-xl p-6 max-w-120">
            <div className="flex gap-2.5 mb-5">
                <div className="flex-1">
                    <Input
                        label="Target Username"
                        value={username}
                        onChange={setUsername}
                        placeholder="Username to manage"
                    />
                </div>
                <div className="pt-7">
                    <ActionBtn onClick={lookup} disabled={loading}>
                        Lookup
                    </ActionBtn>
                </div>
            </div>

            {fetched && (
                <>
                    <div className="text-(--text-muted) text-xs uppercase tracking-[0.06em] mb-3">
                        Toggle Badges for {username}
                    </div>
                    <div className="grid gap-2.5 mb-4 grid-cols-2">
                        {BADGE_LIST.map((badge) => {
                            const active = userBadges.includes(badge);
                            return (
                                <button
                                    key={badge}
                                    onClick={() => toggle(badge)}
                                    disabled={loading}
                                    className={cn(
                                        "py-3 px-4 rounded-lg text-[13px] font-semibold cursor-pointer font-[inherit] text-left flex items-center gap-2",
                                        active
                                            ? "bg-(--bg-tertiary)"
                                            : "bg-transparent",
                                        active
                                            ? "text-(--text-primary)"
                                            : "text-(--text-secondary)",
                                        active
                                            ? "border border-(--text-primary)"
                                            : "border border-(--border-color)",
                                    )}
                                >
                                    <span className="text-base">
                                        {active ? "✅" : "⬜"}
                                    </span>
                                    {badge}
                                </button>
                            );
                        })}
                    </div>
                    <ActionBtn
                        variant="danger"
                        disabled={loading}
                        onClick={clearAll}
                    >
                        🧹 Clear All Badges
                    </ActionBtn>
                </>
            )}
        </div>
    );
}

// UserDetailPanel — slide-in detail view
function UserDetailPanel({
    user,
    detail,
    perms,
    onClose,
    onAction,
}: {
    user: UserRow;
    detail: any;
    perms: string[];
    onClose: () => void;
    onAction: (modal: string) => void;
}) {
    return (
        <div className="fixed right-0 top-0 bottom-0 w-95 bg-[#050d1a] border-l border-l-slate-900 z-1000 overflow-y-auto shadow-[-20px_0_40px_rgba(0,0,0,0.5)]">
            <div className="p-6">
                <div className="flex justify-between items-center mb-5">
                    <span className="text-red-500 text-xs uppercase tracking-[0.08em]">
                        ⬡ Target Dossier
                    </span>
                    <button
                        onClick={onClose}
                        className="bg-slate-800 border-0 text-slate-400 rounded-md py-1 px-2.5 cursor-pointer"
                    >
                        ✕
                    </button>
                </div>

                <div className="text-center mb-5">
                    <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-[28px] mt-0 mx-auto mb-3">
                        {user.username[0].toUpperCase()}
                    </div>
                    <div className="text-slate-100 font-extrabold text-lg">
                        {user.username}
                    </div>
                    <div className="mt-1.5 flex gap-1.5 justify-center flex-wrap">
                        <Pill
                            label={user.rank}
                            color={RANK_COLORS[user.rank]}
                        />
                        {user.hasBlueBadge && (
                            <Pill label="VERIFIED" color="#3b82f6" />
                        )}
                        {user.bannedUntil && (
                            <Pill label="BANNED" color="#ef4444" />
                        )}
                        {(user.customBadges || "")
                            .split(",")
                            .filter(Boolean)
                            .map((b) => (
                                <Pill key={b} label={b} color="#8b5cf6" />
                            ))}
                    </div>
                </div>

                <div className="bg-slate-900 rounded-lg p-4 mb-4">
                    {[
                        ["ID", user.id?.substring(0, 16) + "..."],
                        ["Email", user.email],
                        ["BLT Credits", user.credits?.toFixed(0)],
                        [
                            "Vault Balance",
                            `$${user.vendorBalance?.toFixed(2) || "0.00"}`,
                        ],
                        [
                            "Split Override",
                            user.customSplit !== null
                                ? `${((user.customSplit || 0) * 100).toFixed(0)}%`
                                : "DEFAULT",
                        ],
                        [
                            "Joined",
                            new Date(user.createdAt).toLocaleDateString(),
                        ],
                        [
                            "Last Online",
                            new Date(user.lastOnline).toLocaleString(),
                        ],
                        [
                            "Ban Until",
                            user.bannedUntil
                                ? new Date(
                                      user.bannedUntil,
                                  ).toLocaleDateString()
                                : "N/A",
                        ],
                        ["Ban Reason", user.banReason || "N/A"],
                    ].map(([k, v]) => (
                        <div
                            key={k}
                            className="flex justify-between py-1.5 px-0 border-b border-b-slate-800"
                        >
                            <span className="text-slate-600 text-xs">{k}</span>
                            <span className="text-slate-400 text-xs font-mono max-w-50 break-all text-right">
                                {String(v)}
                            </span>
                        </div>
                    ))}
                </div>

                {detail && (
                    <div className="bg-slate-900 rounded-lg p-4 mb-4">
                        <div className="text-slate-500 text-[11px] uppercase tracking-[0.06em] mb-2.5">
                            Recent Deposits
                        </div>
                        {(detail.recentDeposits || [])
                            .slice(0, 5)
                            .map((d: any, i: number) => (
                                <div
                                    key={i}
                                    className="flex justify-between py-1.25 px-0 border-b border-b-slate-800"
                                >
                                    <span className="text-slate-500 text-xs">
                                        {new Date(
                                            d.createdAt,
                                        ).toLocaleDateString()}
                                    </span>
                                    <span className="text-amber-500 text-xs font-mono">
                                        ${d.amountUsd}
                                    </span>
                                    <Pill
                                        label={d.status}
                                        color={
                                            d.status === "COMPLETED"
                                                ? "#22c55e"
                                                : "#94a3b8"
                                        }
                                    />
                                </div>
                            ))}
                        {!detail.recentDeposits?.length && (
                            <div className="text-slate-700 text-xs">
                                No deposits
                            </div>
                        )}
                    </div>
                )}

                {/* Action buttons */}
                <div className="flex flex-col gap-2">
                    {perms.includes("change_username") && (
                        <ActionBtn
                            variant="ghost"
                            onClick={() => onAction("rename")}
                        >
                            Change Username
                        </ActionBtn>
                    )}
                    {perms.includes("change_email") && (
                        <ActionBtn
                            variant="ghost"
                            onClick={() => onAction("email")}
                        >
                            Change Email
                        </ActionBtn>
                    )}
                    {perms.includes("change_password") && (
                        <ActionBtn
                            variant="ghost"
                            onClick={() => onAction("password")}
                        >
                            Reset Password
                        </ActionBtn>
                    )}
                    {perms.includes("ban_user") &&
                        !user.bannedUntil &&
                        user.rank !== "ADMIN" && (
                            <ActionBtn
                                variant="danger"
                                onClick={() => onAction("ban")}
                            >
                                {" "}
                                Ban User
                            </ActionBtn>
                        )}
                </div>
            </div>
        </div>
    );
}
