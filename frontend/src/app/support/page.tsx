"use client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
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
import { postApiSupportTicketBody } from "@/service/api/zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle, Clock, Send, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const supportSchema = postApiSupportTicketBody.extend({
    subject: z.string().min(3, "Subject must be at least 3 characters."),
    message: z.string().min(10, "Message must be at least 10 characters."),
});

type SupportFormValues = z.infer<typeof supportSchema>;

export default function GlobalSupport() {
    const [status, setStatus] = useState("");
    const [tickets, setTickets] = useState<any[]>([]);

    const form = useForm<SupportFormValues>({
        resolver: zodResolver(supportSchema),
        defaultValues: { subject: "", message: "" },
    });

    const fetchTickets = async () => {
        try {
            const token = document.cookie.replace(
                /(?:(?:^|.*;\s*)sb_token\s*\=\s*([^;]*).*$)|^.*$/,
                "$1",
            );
            if (!token) return;
            const res = await fetch(`/api/support/tickets`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (res.ok && data.success) {
                setTickets(data.tickets);
            }
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        fetchTickets();
    }, []);

    const submitTicket = async (values: SupportFormValues) => {
        try {
            const res = await fetch(`/api/support/ticket`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${document.cookie.replace(/(?:(?:^|.*;\s*)sb_token\s*\=\s*([^;]*).*$)|^.*$/, "$1")}`,
                },
                body: JSON.stringify({
                    subject: values.subject,
                    message: values.message,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                setStatus(
                    "Support ticket submitted successfully. An Admin will review it shortly.",
                );
                form.reset();
                fetchTickets();
                setTimeout(() => setStatus(""), 5000);
            } else {
                alert(data.error);
            }
        } catch {
            alert("Transmission failed.");
        }
    };

    const getStatusIcon = (status: string) => {
        if (status === "ANSWERED")
            return <CheckCircle size={16} color="#22c55e" />;
        if (status === "CLOSED") return <XCircle size={16} color="#ef4444" />;
        return <Clock size={16} color="#eab308" />;
    };

    const getStatusColor = (status: string) => {
        if (status === "ANSWERED") return "#22c55e";
        if (status === "CLOSED") return "#ef4444";
        return "#eab308"; // PENDING
    };

    return (
        <main className="min-h-screen bg-background flex flex-col pt-24 pb-20">
            <div className="container max-w-4xl mx-auto px-4 md:px-8 flex flex-col gap-16">
                
                {/* Contact Form Section */}
                <div className="animation-[fadeIn_0.3s_ease-out]">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-2 h-8 bg-primary rounded-full shadow-[0_0_10px_var(--primary)]"></div>
                        <h1 className="text-3xl md:text-4xl text-foreground font-black tracking-tight uppercase m-0">
                            Contact Support
                        </h1>
                    </div>

                    <div className="bg-card/40 backdrop-blur-md border border-border/50 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/50 via-purple-500 to-primary/50 opacity-70 transition-opacity duration-500"></div>
                        <div className="absolute -top-32 -right-32 w-64 h-64 bg-primary/10 rounded-full blur-[100px] pointer-events-none"></div>

                        <p className="text-muted-foreground mb-10 leading-relaxed text-[1.05rem] max-w-2xl relative z-10">
                            Need help? Send a message directly to the Administrators. 
                            <br />
                            Please provide a clear subject and detailed explanation of your issue so we can assist you faster.
                        </p>

                        {status && (
                            <div className="mb-8 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-4 rounded-xl flex items-center justify-center gap-3 font-bold shadow-sm animation-[fadeIn_0.3s_ease-out]">
                                <CheckCircle size={20} />
                                {status}
                            </div>
                        )}

                        <Form {...form}>
                            <form onSubmit={form.handleSubmit(submitTicket)} className="relative z-10">
                                <FormField
                                    control={form.control}
                                    name="subject"
                                    render={({ field }) => (
                                        <FormItem className="mb-8">
                                            <FormLabel className="block text-muted-foreground text-xs uppercase font-black tracking-wider mb-3">
                                                Ticket Subject
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    placeholder="Briefly state the issue..."
                                                    className="w-full bg-background/50 border border-border/50 text-foreground py-4 px-5 rounded-xl text-[0.95rem] outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm h-auto"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage className="text-red-500 mt-2 font-medium" />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="message"
                                    render={({ field }) => (
                                        <FormItem className="mb-10">
                                            <FormLabel className="block text-muted-foreground text-xs uppercase font-black tracking-wider mb-3">
                                                Message Details
                                            </FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    placeholder="Describe your issue in detail..."
                                                    className="w-full bg-background/50 border border-border/50 text-foreground p-5 rounded-xl text-[0.95rem] resize-y min-h-[160px] outline-none focus:ring-2 focus:ring-primary/50 transition-all shadow-sm"
                                                    {...field}
                                                />
                                            </FormControl>
                                            <FormMessage className="text-red-500 mt-2 font-medium" />
                                        </FormItem>
                                    )}
                                />

                                <button
                                    type="submit"
                                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-4 px-6 rounded-xl font-black text-lg uppercase tracking-widest transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-3 cursor-pointer active:scale-[0.98]"
                                >
                                    <Send size={22} />
                                    Submit Ticket
                                </button>
                            </form>
                        </Form>
                    </div>
                </div>

                {/* Active Tickets Section */}
                <div className="animation-[fadeIn_0.4s_ease-out]">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-1.5 h-6 bg-muted-foreground rounded-full"></div>
                        <h2 className="text-2xl md:text-3xl text-foreground font-bold tracking-tight m-0">
                            My Active Tickets
                        </h2>
                    </div>

                    <div className="flex flex-col gap-5">
                        {tickets.length === 0 ? (
                            <div className="p-16 text-center bg-card/30 border border-dashed border-border/50 rounded-3xl text-muted-foreground font-medium text-lg">
                                You have no active support tickets.
                            </div>
                        ) : (
                            tickets.map((t: any) => (
                                <Link
                                    href={`/support/${t.id}`}
                                    key={t.id}
                                    className="block no-underline group"
                                >
                                    <div className="bg-card/40 backdrop-blur-sm border border-border/50 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-all duration-300 group-hover:border-primary/50 group-hover:bg-primary/5 group-hover:shadow-lg">
                                        <div className="flex flex-col gap-2">
                                            <h3 className="text-xl text-foreground m-0 font-bold group-hover:text-primary transition-colors">
                                                {t.subject}
                                            </h3>
                                            <div className="text-[0.85rem] text-muted-foreground font-mono bg-background/50 self-start px-3 py-1 rounded-md border border-border/30">
                                                ID: {t.id}
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-3">
                                            <div
                                                className="flex items-center gap-2 text-[0.75rem] font-black uppercase tracking-wider py-1.5 px-3 rounded-lg border shadow-sm"
                                                style={{
                                                    color: getStatusColor(t.status),
                                                    backgroundColor: `${getStatusColor(t.status)}15`,
                                                    borderColor: `${getStatusColor(t.status)}30`,
                                                }}
                                            >
                                                {getStatusIcon(t.status)}
                                                {t.status}
                                            </div>
                                            <div className="text-xs text-muted-foreground/80 font-medium whitespace-nowrap">
                                                Opened {new Date(t.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                </Link>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
