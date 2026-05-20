"use client";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star, ThumbsUp, ShieldCheck, Download, Lock, Clock, CalendarDays, Key, Users, MessageSquare, Trash2 } from "lucide-react";

export default function ConfigThread() {
    const { id } = useParams();
    const [thread, setThread] = useState<any>(null);
    const [replies, setReplies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [firewall, setFirewall] = useState({
        isUnlocked: false,
        average: "0.0",
        total: 0,
        hasLiked: false,
        hasRated: false,
        earlyAccessBlocked: false,
        timeRemaining: 0,
    });
    const [rating, setRating] = useState(0);

    useEffect(() => {
        const initData = async () => {
            try {
                const token = `Bearer ${document.cookie.replace(/(?:(?:^|.*;\s*)sb_token\s*\=\s*([^;]*).*$)|^.*$/, "$1")}`;
                const [resThread, resStatus] = await Promise.all([
                    fetch(`/api/configs/${id}`, {
                        headers: { Authorization: token },
                    }),
                    fetch(`/api/configs/${id}/status`, {
                        headers: { Authorization: token },
                    }),
                ]);

                if (!resThread.ok) throw new Error("Blocked");
                const data = await resThread.json();
                setThread(data.threadData);
                setReplies(data.replies || []);

                if (resStatus.ok) {
                    const statusData = await resStatus.json();
                    setFirewall({
                        isUnlocked: statusData.isUnlocked,
                        average: statusData.averageScore,
                        total: statusData.totalRatings,
                        hasLiked: statusData.hasLiked,
                        hasRated: statusData.hasRated,
                        earlyAccessBlocked: statusData.earlyAccessBlocked,
                        timeRemaining: statusData.timeRemaining,
                    });
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        initData();
    }, [id]);

    const submitRating = async () => {
        if (rating === 0) {
            toast.error("Select at least 1 star.");
            return;
        }
        try {
            const res = await fetch(`/api/configs/${id}/rate`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${document.cookie.replace(/(?:(?:^|.*;\s*)sb_token\s*\=\s*([^;]*).*$)|^.*$/, "$1")}`,
                },
                body: JSON.stringify({ score: rating }),
            });
            if (res.ok) {
                setFirewall((prev) => ({
                    ...prev,
                    hasRated: true,
                    isUnlocked: prev.hasLiked,
                    total: prev.total + 1,
                    average: rating.toFixed(1),
                }));
                toast.success("Rating submitted successfully!");
            } else {
                const errorData = await res.json();
                toast.error(errorData.error || "Something went wrong");
            }
        } catch (err) {
            toast.error("Something went wrong");
        }
    };

    const submitLike = async () => {
        try {
            const res = await fetch(`/api/configs/${id}/like`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${document.cookie.replace(/(?:(?:^|.*;\s*)sb_token\s*\=\s*([^;]*).*$)|^.*$/, "$1")}`,
                },
            });
            if (res.ok) {
                setFirewall((prev) => ({
                    ...prev,
                    hasLiked: true,
                    isUnlocked: prev.hasRated,
                }));
                toast.success("Thread liked!");
            } else {
                const errorData = await res.json();
                toast.error(errorData.error || "Something went wrong");
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Are you sure you want to delete this config?")) return;
        try {
            const res = await fetch(`/api/configs/${id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${document.cookie.replace(/(?:(?:^|.*;\s*)sb_token\s*\=\s*([^;]*).*$)|^.*$/, "$1")}`,
                },
            });
            if (res.ok) {
                toast.success("Config deleted successfully");
                window.location.href = "/configs";
            } else {
                const errorData = await res.json();
                toast.error(errorData.error || "Failed to delete");
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to delete config");
        }
    };

    if (loading)
        return (
            <div className="min-h-screen flex items-center justify-center text-emerald-500 font-semibold animate-pulse text-xl">
                Decrypting Protocol...
            </div>
        );
    if (!thread)
        return (
            <div className="min-h-screen flex items-center justify-center text-red-500 font-extrabold text-2xl">
                404 THREAD NOT FOUND
            </div>
        );

    const isAdmin = thread.author.rank === "ADMIN";

    return (
        <div className="max-w-[1200px] min-h-[calc(100vh-var(--navbar-height))] pt-24 pb-16 px-6 sm:px-10 mx-auto">
            {/* Thread Header */}
            <div className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-3 tracking-tight flex items-center gap-3">
                        <ShieldCheck className="w-10 h-10 text-emerald-500" />
                        {thread.title}
                    </h1>
                    <div className="text-muted-foreground text-sm flex items-center gap-2">
                        Started by <span className="font-bold text-foreground px-2 py-0.5 bg-card/60 rounded-md">{thread.author.username}</span>
                        • <CalendarDays className="w-4 h-4 ml-1" /> {new Date(thread.createdAt).toLocaleDateString()}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {isAdmin && (
                        <button 
                            onClick={handleDelete}
                            className="p-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-colors border border-red-500/20"
                            title="Delete Config"
                        >
                            <Trash2 className="w-5 h-5" />
                        </button>
                    )}
                    <div className="rounded-xl border border-border bg-card/60 shadow-lg px-6 py-3 flex items-center gap-3 backdrop-blur-sm">
                        <Star className="w-6 h-6 text-amber-500 fill-amber-500" />
                        <div className="flex flex-col">
                            <span className="text-xl font-black text-amber-500 leading-none">{firewall.average}</span>
                            <span className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">{firewall.total} Ratings</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8">
                {/* Author Sidebar */}
                <div className="space-y-6">
                    <Card className="border-border/50 bg-card/40 backdrop-blur-sm overflow-hidden relative">
                        {isAdmin && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500"></div>}
                        <CardContent className="p-6 text-center">
                            <h2 className={cn("text-xl font-bold mb-4 font-mono", isAdmin ? "text-red-500 drop-shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse" : "text-emerald-500")}>
                                {thread.author.username}
                            </h2>
                            <div className="w-32 h-32 mx-auto rounded-2xl overflow-hidden border-2 border-border/50 mb-6 relative group">
                                <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors z-10"></div>
                                <Image
                                    src={thread.author.avatarUrl.startsWith("http") ? thread.author.avatarUrl : `/${thread.author.avatarUrl}`}
                                    width={150}
                                    height={150}
                                    unoptimized
                                    className="w-full h-full object-cover scale-110 group-hover:scale-100 transition-transform duration-500"
                                    alt="Avatar"
                                />
                            </div>

                            {isAdmin && (
                                <div className="bg-red-500/10 text-red-500 px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest border border-red-500/20 mb-6">
                                    Silverbullet Staff
                                </div>
                            )}

                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between items-center py-2 border-b border-border/30">
                                    <span className="text-muted-foreground">Joined</span>
                                    <strong className="text-foreground">{new Date(thread.author.joined).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }).toUpperCase()}</strong>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-border/30">
                                    <span className="text-muted-foreground">Threads</span>
                                    <strong className="text-foreground">{thread.author.threads}</strong>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-border/30">
                                    <span className="text-muted-foreground">Posts</span>
                                    <strong className="text-foreground">{thread.author.posts}</strong>
                                </div>
                                <div className="flex justify-between items-center py-2">
                                    <span className="text-muted-foreground">Wealth</span>
                                    <strong className="text-emerald-500">{thread.author.credits} BLT</strong>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content */}
                <div className="space-y-8">
                    <Card className="border-border/50 bg-card/40 backdrop-blur-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
                        <CardContent className="p-8">
                            <div className="flex justify-between items-center border-b border-border/50 pb-4 mb-6">
                                <span className="bg-emerald-500/10 text-emerald-500 px-3 py-1 rounded-md text-xs font-bold tracking-widest uppercase">Original Post</span>
                                <span className="text-muted-foreground text-sm font-mono">#{String(id).substring(0, 8)}</span>
                            </div>

                            <div className="prose prose-invert max-w-none">
                                <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm mb-8 bg-card/60 py-3 rounded-lg border border-border/30">
                                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                                    This Config is thoroughly validated by the <span className="font-semibold text-foreground">Silverbullet Architecture Team</span>
                                </div>

                                <div className="bg-card/80 border border-border rounded-xl p-8 mb-10 text-center relative overflow-hidden">
                                    <div className="absolute left-0 top-0 w-1 h-full bg-emerald-500"></div>
                                    <div className="text-emerald-500/70 text-xs font-black uppercase tracking-[0.2em] mb-6">Config Parameters</div>
                                    <div className="text-foreground font-medium whitespace-pre-line text-lg leading-relaxed">
                                        {thread.description}
                                    </div>
                                    <div className="mt-8 pt-6 border-t border-border/50 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                                        <Key className="w-4 h-4" />
                                        Requirement: Silverbullet Architecture Access
                                    </div>
                                </div>

                                <div className="text-center mb-6">
                                    <h3 className="text-sm font-black text-muted-foreground uppercase tracking-widest inline-flex items-center gap-2">
                                        <Download className="w-4 h-4" />
                                        Download Portal
                                    </h3>
                                </div>

                                {firewall.earlyAccessBlocked ? (
                                    <div className="border border-amber-500/30 bg-amber-500/5 p-10 rounded-2xl text-center relative overflow-hidden">
                                        <Lock className="w-12 h-12 text-amber-500/50 absolute -right-4 -bottom-4 rotate-12" />
                                        <h4 className="text-amber-500 font-bold text-xl mb-3 flex items-center justify-center gap-2">
                                            <Clock className="w-6 h-6" />
                                            15-Min Early Drop Access
                                        </h4>
                                        <p className="text-muted-foreground">
                                            This elite config is currently locked for <strong className="text-foreground">VIP/PRO Access Only</strong>.<br />
                                            It will automatically unlock for Free Users in <span className="text-amber-500 font-bold">{firewall.timeRemaining}</span> minutes.
                                        </p>
                                    </div>
                                ) : !firewall.isUnlocked ? (
                                    <div className="border border-border/50 bg-card/60 p-8 rounded-2xl">
                                        <div className="text-center mb-8">
                                            <h4 className="text-foreground font-bold text-xl mb-2 flex items-center justify-center gap-2">
                                                <Lock className="w-5 h-5 text-emerald-500" />
                                                Multiple Authentications Required
                                            </h4>
                                            <p className="text-muted-foreground text-sm">You must explicitly LIKE and RATE this Config to permanently decrypt the download link.</p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Like Box */}
                                            <div className={cn(
                                                "p-6 rounded-xl border transition-all duration-300 flex flex-col items-center justify-center text-center",
                                                firewall.hasLiked ? "border-emerald-500/50 bg-emerald-500/5" : "border-border/50 bg-card/40"
                                            )}>
                                                <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Step 1: Endorse</div>
                                                <button
                                                    onClick={submitLike}
                                                    disabled={firewall.hasLiked}
                                                    className={cn(
                                                        "w-full py-3 px-6 rounded-lg font-bold flex items-center justify-center gap-2 transition-all duration-300",
                                                        firewall.hasLiked
                                                            ? "bg-emerald-500/20 text-emerald-500 cursor-not-allowed"
                                                            : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                                                    )}
                                                >
                                                    <ThumbsUp className="w-5 h-5" />
                                                    {firewall.hasLiked ? "Thread Liked" : "Like Thread"}
                                                </button>
                                            </div>

                                            {/* Rate Box */}
                                            <div className={cn(
                                                "p-6 rounded-xl border transition-all duration-300 flex flex-col items-center justify-center text-center",
                                                firewall.hasRated ? "border-amber-500/50 bg-amber-500/5" : "border-border/50 bg-card/40"
                                            )}>
                                                <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4">Step 2: Authenticate</div>
                                                {firewall.hasRated ? (
                                                    <div className="w-full py-3 px-6 rounded-lg font-bold bg-amber-500/20 text-amber-500 flex items-center justify-center gap-2">
                                                        <Star className="w-5 h-5 fill-amber-500" />
                                                        Rating Injected
                                                    </div>
                                                ) : (
                                                    <div className="w-full flex flex-col items-center">
                                                        <div className="flex gap-2 mb-4">
                                                            {[1, 2, 3, 4, 5].map((star) => (
                                                                <button
                                                                    key={star}
                                                                    onClick={() => setRating(star)}
                                                                    className="focus:outline-none transition-transform hover:scale-110"
                                                                >
                                                                    <Star className={cn("w-7 h-7 transition-colors", rating >= star ? "text-amber-500 fill-amber-500" : "text-muted-foreground")} />
                                                                </button>
                                                            ))}
                                                        </div>
                                                        <button
                                                            onClick={submitRating}
                                                            disabled={rating === 0}
                                                            className={cn(
                                                                "w-full py-3 px-6 rounded-lg font-bold transition-all duration-300",
                                                                rating > 0
                                                                    ? "bg-amber-500 hover:bg-amber-400 text-amber-950 shadow-lg shadow-amber-500/20"
                                                                    : "bg-muted text-muted-foreground cursor-not-allowed"
                                                            )}
                                                        >
                                                            Inject Rating
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="border border-emerald-500/30 bg-emerald-500/5 p-10 text-center rounded-2xl relative overflow-hidden">
                                        <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/10 blur-3xl rounded-full"></div>
                                        <div className="text-emerald-500 font-bold mb-6 uppercase tracking-widest text-sm">Decryption Successful</div>
                                        <a
                                            href={`/api/downloads/${thread.fileName}`}
                                            className="inline-flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 px-8 py-4 rounded-xl font-extrabold text-lg transition-all duration-300 shadow-[0_0_30px_rgba(16,185,129,0.3)] hover:shadow-[0_0_40px_rgba(16,185,129,0.5)] hover:-translate-y-1"
                                        >
                                            <Download className="w-6 h-6" />
                                            {thread.fileName}
                                        </a>
                                        <div className="text-sm text-muted-foreground mt-4 font-mono">
                                            {(thread.fileSize / 1024).toFixed(1)} KB • Encrypted .espk payload
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Replies Section */}
            <div className="mt-20">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-border/50">
                    <h3 className="text-2xl font-bold text-foreground flex items-center gap-3">
                        <Users className="w-6 h-6 text-emerald-500" />
                        Community Authentications
                    </h3>
                    <span className="bg-card px-4 py-1.5 rounded-full text-sm font-bold text-muted-foreground border border-border/50">
                        {replies.length} Records
                    </span>
                </div>

                <div className="space-y-6">
                    {replies.map((reply: any, idx: number) => {
                        const isUpgraded = reply.user.rank === "VIP" || reply.user.rank === "PRO" || reply.user.rank === "ADMIN";

                        return (
                            <Card key={reply.id} className="border-border/50 bg-card/40 backdrop-blur-sm overflow-hidden hover:border-emerald-500/30 transition-colors">
                                <div className="flex flex-col sm:flex-row">
                                    {/* Reply Sidebar */}
                                    <div className="w-full sm:w-64 bg-black/20 p-6 border-b sm:border-b-0 sm:border-r border-border/50 flex flex-col items-center text-center relative">
                                        {isUpgraded && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/0 via-emerald-500 to-emerald-500/0"></div>}
                                        
                                        <h2 className="text-lg font-bold font-mono mb-2">
                                            <span className={cn("text-inherit", isUpgraded ? "text-emerald-500" : "text-foreground")}>
                                                {reply.user.username.substring(0, 2) + "***" + reply.user.username.substring(reply.user.username.length - 1)}
                                            </span>
                                        </h2>

                                        <div className="text-[10px] font-black uppercase tracking-widest border border-border/50 bg-background px-3 py-1 rounded mb-4">
                                            {reply.user.rank}
                                        </div>

                                        <div className="w-20 h-20 rounded-xl overflow-hidden border border-border/50 mb-4 bg-background">
                                            {reply.user.avatarUrl && reply.user.avatarUrl !== "/default-avatar.png" ? (
                                                <Image
                                                    src={reply.user.avatarUrl.startsWith("http") ? reply.user.avatarUrl : `/${reply.user.avatarUrl}`}
                                                    width={80}
                                                    height={80}
                                                    unoptimized
                                                    className="w-full h-full object-cover"
                                                    alt="Avatar"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-3xl font-extrabold text-muted-foreground">?</div>
                                            )}
                                        </div>

                                        <div className="text-xs text-muted-foreground bg-black/40 py-1.5 px-3 rounded-md border border-border/30 w-full">
                                            Wealth: <strong className="text-emerald-500">{reply.user.credits} BLT</strong>
                                        </div>
                                    </div>

                                    {/* Reply Content */}
                                    <div className="flex-1 p-6 relative flex flex-col justify-center">
                                        <div className="absolute top-4 right-4 text-xs font-mono text-muted-foreground opacity-50 flex items-center gap-1">
                                            <MessageSquare className="w-3 h-3" /> #{idx + 2}
                                        </div>
                                        <div className="absolute bottom-4 right-4 text-xs text-muted-foreground font-mono">
                                            {new Date(reply.createdAt).toLocaleString()}
                                        </div>

                                        <div className="space-y-4">
                                            {reply.score > 0 && (
                                                <div className="flex items-center gap-4 bg-amber-500/5 p-4 rounded-xl border border-amber-500/20">
                                                    <div className="text-amber-500 text-[10px] font-black uppercase tracking-widest w-24">Rating Protocol</div>
                                                    <div className="flex gap-1">
                                                        {[1, 2, 3, 4, 5].map((star) => (
                                                            <Star key={star} className={cn("w-5 h-5", reply.score >= star ? "text-amber-500 fill-amber-500" : "text-muted-foreground opacity-30")} />
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {reply.hasLiked && (
                                                <div className="flex items-center gap-4 bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/20">
                                                    <div className="text-emerald-500 text-[10px] font-black uppercase tracking-widest w-24">Core Endorsement</div>
                                                    <div className="flex items-center gap-2 text-emerald-500 font-bold">
                                                        <ThumbsUp className="w-4 h-4" />
                                                        Thread Liked
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
