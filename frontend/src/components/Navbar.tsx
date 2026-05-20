"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BadgeCheck, Bell, Plus, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import AnimatedLogo from "./AnimatedLogo";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeSwitcher from "./ThemeSwitcher";

type StoredUser = {
    username: string;
    rank?: string;
    credits?: number;
    nameColor?: string;
    nameEffect?: string;
    hasBlueBadge?: boolean;
    avatarUrl?: string;
};

type UserProfileResponse = {
    error?: string;
    user?: Partial<StoredUser>;
};

type NotificationItem = {
    id: string | number;
    read: boolean;
    message: string;
    link?: string;
    createdAt: string;
};

type NotificationsResponse = {
    error?: string;
    success?: boolean;
    notifications: NotificationItem[];
};

type AudioWindow = Window & {
    AudioContext?: typeof AudioContext;
    webkitAudioContext?: typeof AudioContext;
};

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

export default function Navbar() {
    const [user, setUser] = useState<StoredUser | null>(null);
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState<NotificationItem[]>([]);
    const [notifMenuOpen, setNotifMenuOpen] = useState(false);
    const [authLoading, setAuthLoading] = useState(true);

    useEffect(() => {
        const parsedUser = parseStoredUser(localStorage.getItem("sb_user"));
        let nf: NodeJS.Timeout | undefined;
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
                    .then((res) => res.json() as Promise<UserProfileResponse>)
                    .then((data) => {
                        if (data.error === "BANNED") {
                            localStorage.removeItem("sb_user");
                            document.cookie = "sb_token=; Max-Age=0; path=/";
                            window.location.href = "/auth/login";
                            return;
                        }
                        if (data.user) {
                            const nextUser = {
                                ...parsedUser,
                                rank: data.user.rank,
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
                        .then(
                            (res) =>
                                res.json() as Promise<NotificationsResponse>,
                        )
                        .then((data) => {
                            if (data.error === "BANNED") {
                                localStorage.removeItem("sb_user");
                                document.cookie =
                                    "sb_token=; Max-Age=0; path=/";
                                window.location.href = "/auth/login";
                                return;
                            }
                            if (data.success) {
                                setNotifications(data.notifications);
                                const unread = data.notifications.filter(
                                    (notification) => !notification.read,
                                ).length;
                                setUnreadCount((prev) => {
                                    if (unread > prev && prev !== 0) {
                                        toast.success(
                                            "You have a new unread message in your security terminal.",
                                        );
                                        try {
                                            const audioWindow =
                                                window as AudioWindow;
                                            const AudioCtor =
                                                audioWindow.AudioContext ??
                                                audioWindow.webkitAudioContext;
                                            if (!AudioCtor) return unread;
                                            const ctx = new AudioCtor();
                                            const osc = ctx.createOscillator();
                                            const gain = ctx.createGain();
                                            osc.connect(gain);
                                            gain.connect(ctx.destination);
                                            osc.type = "sine";
                                            osc.frequency.setValueAtTime(
                                                880,
                                                ctx.currentTime,
                                            );
                                            osc.frequency.exponentialRampToValueAtTime(
                                                1200,
                                                ctx.currentTime + 0.1,
                                            );
                                            gain.gain.setValueAtTime(
                                                0,
                                                ctx.currentTime,
                                            );
                                            gain.gain.linearRampToValueAtTime(
                                                0.3,
                                                ctx.currentTime + 0.05,
                                            );
                                            gain.gain.linearRampToValueAtTime(
                                                0,
                                                ctx.currentTime + 0.5,
                                            );
                                            osc.start(ctx.currentTime);
                                            osc.stop(ctx.currentTime + 0.5);
                                        } catch {}
                                    }
                                    return unread;
                                });
                            }
                        })
                        .catch(() => {});
                };
                nf = setInterval(fetchNotifs, 10000);
            }
        }

        setTimeout(() => {
            setAuthLoading(false);
        }, 50);

        return () => {
            mounted = false;
            if (nf) clearInterval(nf);
        };
    }, []);

    const avatarSrc =
        user?.avatarUrl && user.avatarUrl !== "/default-user-avatar.png"
            ? user.avatarUrl.startsWith("http")
                ? user.avatarUrl
                : user.avatarUrl.startsWith("/")
                  ? user.avatarUrl
                  : `/${user.avatarUrl}`
            : "/default-user-avatar.png";

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
            <div className="relative flex w-full min-h-(--navbar-height) items-center justify-end px-4 py-2 sm:px-6 lg:px-8 gap-3 sm:gap-4">
                {/* Logo */}
                <Link
                    href="/"
                    className="absolute left-[30%] -translate-x-1/2 pl-0 md:left-0 md:translate-x-0 md:pl-6 lg:pl-8 shrink-0 flex items-center transition-opacity hover:opacity-80"
                >
                    <AnimatedLogo />
                </Link>
                <div className="flex items-center gap-1.5 sm:gap-2">
                    {user && (
                        <>
                            <ThemeSwitcher direction="down" />

                            {/* Notifications */}
                            <DropdownMenu
                                open={notifMenuOpen}
                                onOpenChange={setNotifMenuOpen}
                            >
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="relative"
                                    >
                                        <Bell className="h-5 w-5" />
                                        {unreadCount > 0 && (
                                            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                                                {unreadCount}
                                            </Badge>
                                        )}
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="end"
                                    className="flex max-h-[min(26rem,calc(100vh-5rem))] w-[min(20rem,calc(100vw-1rem))] flex-col overflow-hidden p-0 sm:w-80"
                                >
                                    <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/50 font-semibold text-sm">
                                        <Bell className="h-4 w-4" /> Alert Hub
                                    </div>
                                    <ScrollArea className="flex-1 max-h-96">
                                        {notifications.length === 0 ? (
                                            <div className="py-8 text-center text-sm text-muted-foreground">
                                                Network silence...
                                            </div>
                                        ) : (
                                            notifications.map((n, i) => (
                                                <div
                                                    key={i}
                                                    className={`flex gap-2 px-3 py-3 border-b text-sm ${!n.read ? "bg-muted/30" : ""}`}
                                                >
                                                    <div
                                                        className="flex-1 cursor-pointer"
                                                        onClick={async () => {
                                                            if (!n.read) {
                                                                const token =
                                                                    document.cookie.replace(
                                                                        /(?:(?:^|.*;\s*)sb_token\s*\=\s*([^;]*).*$)|^.*$/,
                                                                        "$1",
                                                                    );
                                                                await fetch(
                                                                    `/api/user/notifications/${n.id}/read`,
                                                                    {
                                                                        method: "POST",
                                                                        headers:
                                                                            {
                                                                                Authorization: `Bearer ${token}`,
                                                                            },
                                                                    },
                                                                );
                                                                setNotifications(
                                                                    (prev) =>
                                                                        prev.map(
                                                                            (
                                                                                x,
                                                                            ) =>
                                                                                x.id ===
                                                                                n.id
                                                                                    ? {
                                                                                          ...x,
                                                                                          read: true,
                                                                                      }
                                                                                    : x,
                                                                        ),
                                                                );
                                                                setUnreadCount(
                                                                    (prev) =>
                                                                        Math.max(
                                                                            0,
                                                                            prev -
                                                                                1,
                                                                        ),
                                                                );
                                                            }
                                                            if (n.link)
                                                                window.location.href =
                                                                    n.link;
                                                        }}
                                                    >
                                                        <div
                                                            dangerouslySetInnerHTML={{
                                                                __html: n.message,
                                                            }}
                                                            className="leading-snug"
                                                        />
                                                        <div className="text-xs text-muted-foreground mt-1">
                                                            {new Date(
                                                                n.createdAt,
                                                            ).toLocaleString()}
                                                        </div>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6 text-muted-foreground hover:text-foreground self-start shrink-0"
                                                    >
                                                        <X size={14} />
                                                    </Button>
                                                </div>
                                            ))
                                        )}
                                    </ScrollArea>
                                </DropdownMenuContent>
                            </DropdownMenu>

                            {/* Credits */}
                            <div className="flex items-center gap-1">
                                <div className="flex h-8 sm:h-10 items-center gap-1 sm:gap-2 rounded-md border px-1.5 sm:px-3 text-xs sm:text-sm font-semibold">
                                    <Image
                                        src="/bullet-token.svg"
                                        alt="BLT"
                                        width={24}
                                        height={24}
                                        className="w-4 h-4 sm:w-6 sm:h-6"
                                    />
                                    <span>{user.credits}</span>
                                    <span className="hidden sm:inline">BLT</span>
                                </div>
                                <Link href="/deposit-history">
                                    <Button
                                        size="icon"
                                        className="h-9 w-9 bg-emerald-500 text-black hover:bg-sky-500 sm:h-10.5 sm:w-10.5"
                                        aria-label="Add credits"
                                    >
                                        <Plus className="h-5 w-5" />
                                    </Button>
                                </Link>
                            </div>

                            {/* User menu */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        className="flex min-w-0 items-center gap-2 px-1.5 sm:px-2"
                                    >
                                        <Avatar className="h-7 w-7 rounded">
                                            <AvatarImage
                                                src={avatarSrc}
                                                alt={user.username}
                                            />
                                            <AvatarFallback className="rounded text-xs">
                                                {user.username
                                                    ?.charAt(0)
                                                    .toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span
                                            className="hidden max-w-28 truncate text-sm font-bold sm:inline"
                                            style={{
                                                color:
                                                    user.nameColor ===
                                                        "#ffffff" ||
                                                    !user.nameColor
                                                        ? undefined
                                                        : user.nameColor,
                                            }}
                                        >
                                            {user.hasBlueBadge && (
                                                <BadgeCheck className="inline h-3.5 w-3.5 text-blue-500 mr-1" />
                                            )}
                                            {user.username}
                                        </span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent
                                    align="end"
                                    className="w-48"
                                >
                                    <DropdownMenuLabel className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">
                                        {user.rank}
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem asChild>
                                        <Link href={`/user/${user.username}`}>
                                            My Profile
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link href="/deposit-history">
                                            Deposit History
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link href="/purchases">
                                            My Purchases
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem asChild>
                                        <Link href="/support">
                                            Support Tickets
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        className="text-destructive focus:text-destructive cursor-pointer"
                                        onClick={() => {
                                            localStorage.removeItem("sb_user");
                                            document.cookie =
                                                "sb_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                                            window.location.href =
                                                "/auth/login";
                                        }}
                                    >
                                        Log Out
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </>
                    )}

                    {!user && !authLoading && (
                        <div className="flex items-center gap-2 sm:gap-3">
                            <ThemeSwitcher direction="down" />
                            <LanguageSwitcher direction="down" compact />
                            <Button
                                variant="outline"
                                asChild
                                className="px-3 sm:px-4"
                            >
                                <Link href="/auth/login">Sign In</Link>
                            </Button>
                            <Button asChild className="hidden sm:inline-flex">
                                <Link href="/auth/register">
                                    Create Account
                                </Link>
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}
