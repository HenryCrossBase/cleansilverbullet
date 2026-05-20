"use client";
import Navbar from "@/components/Navbar";
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
import { postApiAdminTicketsIdReplyBody } from "@/service/api/zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    ArrowLeft,
    CheckCircle,
    Clock,
    Send,
    ShieldAlert,
    XCircle,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const replySchema = postApiAdminTicketsIdReplyBody.extend({
    message: z.string().min(1, "Message cannot be empty."),
});

type ReplyFormValues = z.infer<typeof replySchema>;

export default function TicketChat() {
    const { id } = useParams();
    const router = useRouter();
    const [ticket, setTicket] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const form = useForm<ReplyFormValues>({
        resolver: zodResolver(replySchema),
        defaultValues: { message: "" },
    });

    const fetchTicket = async () => {
        try {
            const token = document.cookie.replace(
                /(?:(?:^|.*;\s*)sb_token\s*\=\s*([^;]*).*$)|^.*$/,
                "$1",
            );
            if (!token) {
                router.push("/auth/login");
                return;
            }
            const res = await fetch(`/api/support/ticket/${id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setTicket(data.ticket);
            } else {
                alert(data.error || "System failure locating entity.");
                router.push("/support");
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTicket();

        const interval = setInterval(fetchTicket, 10000);
        return () => clearInterval(interval);
    }, [id]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [ticket?.messages]);

    const sendReply = async (values: ReplyFormValues) => {
        const msg = values.message;
        form.reset(); // Optimistic clear

        try {
            const res = await fetch(`/api/support/ticket/${id}/reply`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${document.cookie.replace(/(?:(?:^|.*;\s*)sb_token\s*\=\s*([^;]*).*$)|^.*$/, "$1")}`,
                },
                body: JSON.stringify({ message: msg }),
            });
            const data = await res.json();
            if (res.ok) {
                fetchTicket();
            } else {
                alert(data.error);
                form.setValue("message", msg); // Rollback
            }
        } catch {
            alert("Transmission failed.");
        }
    };

    if (loading) {
        return (
            <div>
                <Navbar />
                <div className="py-24 px-8 text-center text-(--text-secondary) font-mono">
                    Establishing Handshake...
                </div>
            </div>
        );
    }

    if (!ticket) return null;

    return (
        <main className="min-h-screen bg-background flex flex-col pt-24 pb-20">
            <div className="container max-w-4xl mx-auto px-4 md:px-8">
                
                <div className="bg-card/40 backdrop-blur-xl border border-border/50 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[75vh] min-h-[600px] relative">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/50 via-blue-500 to-primary/50 opacity-70"></div>
                    
                    {/* Header */}
                    <div className="bg-background/80 backdrop-blur-md border-b border-border/50 py-6 px-8 flex flex-wrap items-center justify-between gap-5 z-10 sticky top-0">
                        <div className="flex items-center gap-4">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => router.push("/support")}
                                className="text-muted-foreground hover:bg-primary/10 hover:text-primary rounded-xl transition-all"
                            >
                                <ArrowLeft size={20} />
                            </Button>

                            <div>
                                <h1 className="text-xl md:text-2xl text-foreground font-bold m-0 flex items-center gap-2">
                                    {ticket.subject}
                                </h1>
                                <div className="text-muted-foreground text-xs font-mono mt-1 bg-muted/50 inline-block px-2 py-0.5 rounded border border-border/30">
                                    ID: {ticket.id}
                                </div>
                            </div>
                        </div>

                        <div
                            className={cn(
                                "flex items-center gap-2 py-1.5 px-4 rounded-lg text-xs font-black tracking-wider uppercase border shadow-sm",
                                ticket.status === "ANSWERED"
                                    ? "text-emerald-500 bg-emerald-500/10 border-emerald-500/20"
                                    : ticket.status === "CLOSED"
                                      ? "text-red-500 bg-red-500/10 border-red-500/20"
                                      : "text-amber-500 bg-amber-500/10 border-amber-500/20",
                            )}
                        >
                            {ticket.status === "ANSWERED" ? (
                                <CheckCircle size={14} />
                            ) : ticket.status === "CLOSED" ? (
                                <XCircle size={14} />
                            ) : (
                                <Clock size={14} />
                            )}
                            {ticket.status}
                        </div>
                    </div>

                    {/* Chat Area */}
                    <div className="flex-1 overflow-y-auto p-6 md:p-8 flex flex-col gap-6 bg-black/20 scroll-smooth">
                        <div className="text-center">
                            <span className="text-muted-foreground/60 text-xs font-medium px-4 py-1.5 rounded-full bg-background/50 border border-border/30 backdrop-blur-sm">
                                Secure Connection Encrypted • {new Date(ticket.createdAt).toLocaleDateString()}
                            </span>
                        </div>

                        {ticket.messages.map((m: any) => {
                            const isAdmin = m.senderRank === "ADMIN";

                            return (
                                <div
                                    key={m.id}
                                    className={cn(
                                        "flex flex-col gap-1.5 max-w-[85%] md:max-w-[75%]",
                                        isAdmin ? "self-start items-start" : "self-end items-end",
                                    )}
                                >
                                    <div className={cn("text-[0.65rem] font-black tracking-widest uppercase flex items-center gap-1.5 px-1", isAdmin ? "text-primary" : "text-muted-foreground")}>
                                        {isAdmin ? (
                                            <>
                                                <ShieldAlert size={12} /> Administrator
                                            </>
                                        ) : (
                                            "You"
                                        )}
                                    </div>

                                    <div
                                        className={cn(
                                            "p-4 text-[0.95rem] leading-relaxed whitespace-pre-wrap shadow-sm backdrop-blur-md",
                                            isAdmin 
                                                ? "bg-card/80 text-foreground border border-border/50 rounded-2xl rounded-tl-sm" 
                                                : "bg-primary text-primary-foreground border-0 rounded-2xl rounded-tr-sm shadow-[0_4px_15px_rgba(var(--primary),0.3)]",
                                        )}
                                    >
                                        {m.message}
                                    </div>

                                    <span className="text-[0.65rem] text-muted-foreground/80 font-medium px-1">
                                        {new Date(m.createdAt).toLocaleTimeString(
                                            [],
                                            { hour: "2-digit", minute: "2-digit" },
                                        )}
                                    </span>
                                </div>
                            );
                        })}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Input Area */}
                    <div className="bg-background/80 backdrop-blur-md p-6 border-t border-border/50">
                        {ticket.status === "CLOSED" ? (
                            <div className="text-center text-red-500 font-bold p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                                This ticket has been firmly closed by an Administrator.
                            </div>
                        ) : (
                            <Form {...form}>
                                <form
                                    onSubmit={form.handleSubmit(sendReply)}
                                    className="flex gap-4 items-end"
                                >
                                    <FormField
                                        control={form.control}
                                        name="message"
                                        render={({ field }) => (
                                            <FormItem className="flex-1 space-y-0 relative">
                                                <FormControl>
                                                    <Textarea
                                                        placeholder="Type your response here... (Press Enter to send, Shift+Enter for new line)"
                                                        className="w-full bg-background/50 border border-border/50 rounded-xl p-4 pr-4 text-foreground text-[0.95rem] resize-none min-h-[60px] max-h-[150px] outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-inner"
                                                        onKeyDown={(e) => {
                                                            if (
                                                                e.key === "Enter" &&
                                                                !e.shiftKey
                                                            ) {
                                                                e.preventDefault();
                                                                form.handleSubmit(
                                                                    sendReply,
                                                                )();
                                                            }
                                                        }}
                                                        {...field}
                                                    />
                                                </FormControl>
                                                <FormMessage className="absolute -top-6 left-0 text-red-500 text-xs" />
                                            </FormItem>
                                        )}
                                    />
                                    <button
                                        type="submit"
                                        className="h-[60px] w-[60px] flex-shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl flex items-center justify-center transition-all shadow-md hover:shadow-lg cursor-pointer active:scale-95"
                                    >
                                        <Send size={22} className="-ml-1" />
                                    </button>
                                </form>
                            </Form>
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
