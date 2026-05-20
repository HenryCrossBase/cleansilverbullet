"use client";

import {
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    Sidebar as SidebarRoot,
    SidebarTrigger,
    useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n/TranslationContext";
import type { LucideIcon } from "lucide-react";
import {
    Archive,
    ArrowUpCircle,
    BadgeDollarSign,
    DollarSign,
    FileJson,
    GitPullRequest,
    Home,
    LayoutDashboard,
    PlusCircle,
    Scale,
    Settings,
    ShieldAlert,
    ShoppingBag,
    ShoppingCart,
    Star,
    Tag,
    Server,
    Terminal,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type StoredUser = {
    username: string;
    rank?: string;
    credits?: number;
    nameColor?: string;
    nameEffect?: string;
    hasBlueBadge?: boolean;
    avatarUrl?: string;
};

type ProfileResponse = {
    user?: Partial<StoredUser>;
};

type NavItem = {
    name: string;
    href: string;
    icon: LucideIcon;
};

type SellerNavItem = NavItem & {
    tab: string;
};

const SELLER_RANKS = new Set([
    "STARTER",
    "PRO",
    "PREMIUM",
    "ENTERPRISE",
    "ADMIN",
]);

function parseStoredUser(value: string | null): StoredUser | null {
    if (!value) return null;

    try {
        const parsed = JSON.parse(value) as Partial<StoredUser>;
        return typeof parsed.username === "string"
            ? (parsed as StoredUser)
            : null;
    } catch {
        return null;
    }
}

function SidebarNavLink({
    item,
    active,
    onNavigate,
}: {
    item: NavItem;
    active: boolean;
    onNavigate?: (item: NavItem) => void;
}) {
    const { setOpenMobile } = useSidebar();
    const Icon = item.icon;

    return (
        <SidebarMenuItem>
            <SidebarMenuButton
                asChild
                isActive={active}
                tooltip={item.name}
                className="h-9"
            >
                <Link
                    href={item.href}
                    onClick={() => {
                        setOpenMobile(false);
                        onNavigate?.(item);
                    }}
                >
                    <Icon />
                    <span>{item.name}</span>
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
}

function SidebarSection({
    label,
    items,
    isActive,
    onNavigate,
    danger = false,
}: {
    label: string;
    items: NavItem[];
    isActive: (item: NavItem) => boolean;
    onNavigate?: (item: NavItem) => void;
    danger?: boolean;
}) {
    return (
        <SidebarGroup>
            <SidebarGroupLabel className={danger ? "text-destructive" : ""}>
                {label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
                <SidebarMenu>
                    {items.map((item) => (
                        <SidebarNavLink
                            key={item.href}
                            item={item}
                            active={isActive(item)}
                            onNavigate={onNavigate}
                        />
                    ))}
                </SidebarMenu>
            </SidebarGroupContent>
        </SidebarGroup>
    );
}

export default function Sidebar() {
    const { t } = useTranslation();
    const [user, setUser] = useState<StoredUser | null>(null);
    const [activeTab, setActiveTab] = useState<string | null>(null);
    const pathname = usePathname();

    useEffect(() => {
        const storedUser = localStorage.getItem("sb_user");
        const parsedUser = parseStoredUser(storedUser);
        let nf: ReturnType<typeof setInterval> | undefined;
        let mounted = true;

        if (parsedUser) {
            queueMicrotask(() => {
                if (mounted) setUser(parsedUser);
            });

            const token = document.cookie.replace(
                /(?:(?:^|.*;\s*)sb_token\s*\=\s*([^;]*).*$)|^.*$/,
                "$1",
            );

            if (token) {
                fetch(`/api/user/profile/${parsedUser.username}`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                    .then((res) => res.json() as Promise<ProfileResponse>)
                    .then((data) => {
                        if (data.user) {
                            const nextUser = {
                                ...parsedUser,
                                credits: data.user.credits,
                                nameColor: data.user.nameColor,
                                nameEffect: data.user.nameEffect,
                                hasBlueBadge: data.user.hasBlueBadge,
                                avatarUrl: data.user.avatarUrl,
                            };
                            localStorage.setItem(
                                "sb_user",
                                JSON.stringify(nextUser),
                            );
                            setUser(nextUser);
                        }
                    })
                    .catch(console.error);

                const fetchNotifs = () => {
                    fetch("/api/user/notifications", {
                        headers: { Authorization: `Bearer ${token}` },
                    })
                        .then((res) => res.json())
                        .then((data) => {
                            if (data.success) {
                                // Keep polling call to preserve side-effects/authorization checks.
                            }
                        })
                        .catch(() => {});
                };
                nf = setInterval(fetchNotifs, 10000);
            }
        }

        return () => {
            mounted = false;
            if (nf) clearInterval(nf);
        };
    }, []);

    useEffect(() => {
        let mounted = true;

        const syncActiveTab = () => {
            const nextTab = new URLSearchParams(window.location.search).get(
                "tab",
            );

            queueMicrotask(() => {
                if (mounted) setActiveTab(nextTab);
            });
        };

        syncActiveTab();
        window.addEventListener("popstate", syncActiveTab);

        return () => {
            mounted = false;
            window.removeEventListener("popstate", syncActiveTab);
        };
    }, [pathname]);

    const navLinks: NavItem[] = [
        { name: t("nav.home"), href: "/", icon: Home },
        { name: t("nav.market"), href: "/market", icon: ShoppingCart },
        { name: "RDP Network", href: "/rdp", icon: Server },
        { name: "My RDPs", href: "/rdp/manage", icon: Terminal },
        { name: t("nav.configs"), href: "/configs", icon: FileJson },
        { name: "Upgrade", href: "/upgrade", icon: ArrowUpCircle },
        {
            name: t("nav.customRequests"),
            href: "/custom-requests",
            icon: GitPullRequest,
        },
        { name: "Purchase Ads", href: "/ads", icon: BadgeDollarSign },
    ];

    const sellerLinks: SellerNavItem[] = [
        {
            name: "Dashboard",
            href: "/vendor/dashboard?tab=overview",
            icon: LayoutDashboard,
            tab: "overview",
        },
        {
            name: "Add Product (Bulk)",
            href: "/vendor/dashboard?tab=add_product",
            icon: PlusCircle,
            tab: "add_product",
        },
        {
            name: "Add Single Item",
            href: "/vendor/dashboard?tab=add_single",
            icon: PlusCircle,
            tab: "add_single",
        },
        {
            name: "Sold Products",
            href: "/vendor/dashboard?tab=sold_products",
            icon: ShoppingBag,
            tab: "sold_products",
        },
        {
            name: "Unsold Products",
            href: "/vendor/dashboard?tab=unsold_products",
            icon: Archive,
            tab: "unsold_products",
        },
        {
            name: "Change Prices",
            href: "/vendor/dashboard?tab=edit_prices",
            icon: Tag,
            tab: "edit_prices",
        },
        {
            name: "Disputes",
            href: "/vendor/dashboard?tab=disputes",
            icon: Scale,
            tab: "disputes",
        },
        {
            name: "Store Reviews",
            href: "/vendor/dashboard?tab=store_reviews",
            icon: Star,
            tab: "store_reviews",
        },
        {
            name: "Store Settings",
            href: "/vendor/dashboard?tab=settings",
            icon: Settings,
            tab: "settings",
        },
        {
            name: "Payment History",
            href: "/vendor/dashboard?tab=payment_history",
            icon: DollarSign,
            tab: "payment_history",
        },
    ];

    const adminLinks: NavItem[] = [
        {
            name: "Admin Dashboard",
            href: "/admin/dashboard",
            icon: ShieldAlert,
        },
    ];

    const rdpSellerLinks: NavItem[] = [
        {
            name: "RDP Control Panel",
            href: "/rdp-seller/dashboard",
            icon: Server,
        },
    ];

    const systemLinks: NavItem[] = [
        user
            ? {
                  href: `/user/${user.username}`,
                  icon: Settings,
                  name: "Profile",
              }
            : {
                  href: "/auth/login",
                  icon: Settings,
                  name: "Profile",
              },
        {
            href: "/tos",
            icon: FileJson,
            name: "Terms of Service",
        },
    ];

    if (pathname.startsWith("/auth")) return null;

    const canAccessSellerDashboard =
        typeof user?.rank === "string" && SELLER_RANKS.has(user.rank);

    const canAccessRDPSellerDashboard = 
        user?.rank === "ADMIN" || user?.rank === "RDP_SELLER" || user?.rank === "ENTERPRISE";

    const isRouteActive = (item: NavItem) => pathname === item.href;
    const isSellerRouteActive = (item: SellerNavItem) =>
        pathname.startsWith("/vendor/dashboard") &&
        (activeTab === item.tab || (!activeTab && item.tab === "overview"));

    return (
        <>
            <SidebarTrigger className="fixed left-4 top-4 z-60 md:hidden" />
            <SidebarRoot collapsible="offcanvas">
                <SidebarHeader className="h-16 shrink-0 md:hidden" />
                <SidebarContent className="gap-2 px-2 py-4">
                    <SidebarSection
                        label="Platform"
                        items={navLinks}
                        isActive={isRouteActive}
                    />

                    {canAccessSellerDashboard && (
                        <SidebarSection
                            label="Seller Dashboard"
                            items={sellerLinks}
                            isActive={(item) =>
                                isSellerRouteActive(item as SellerNavItem)
                            }
                            onNavigate={(item) =>
                                setActiveTab((item as SellerNavItem).tab)
                            }
                        />
                    )}

                    {canAccessRDPSellerDashboard && (
                        <SidebarSection
                            label="RDP Management"
                            items={rdpSellerLinks}
                            isActive={isRouteActive}
                        />
                    )}

                    {user?.rank === "ADMIN" && (
                        <SidebarSection
                            label="Control Panel"
                            items={adminLinks}
                            isActive={() => pathname.startsWith("/admin")}
                            danger
                        />
                    )}

                        <SidebarSection
                            label="System"
                            items={systemLinks}
                            isActive={isRouteActive}
                        />
                </SidebarContent>
            </SidebarRoot>
        </>
    );
}
