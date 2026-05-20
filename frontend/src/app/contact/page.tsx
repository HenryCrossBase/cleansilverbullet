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
import { cn } from "@/lib/utils";
import { postApiContact } from "@/service/api";
import { postApiContactBody } from "@/service/api/zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    AlertCircle,
    CheckCircle,
    Mail,
    MessageSquare,
    Send,
} from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const contactSchema = postApiContactBody.extend({
    subject: z
        .string()
        .min(1, "Subject is required.")
        .max(200, "Subject must be at most 200 characters."),
    message: z
        .string()
        .min(10, "Message must be at least 10 characters.")
        .max(5000, "Message must be at most 5000 characters."),
});

type ContactFormValues = z.infer<typeof contactSchema>;

export default function ContactUs() {
    const [status, setStatus] = useState<
        "idle" | "loading" | "success" | "error"
    >("idle");
    const [feedbackMsg, setFeedbackMsg] = useState("");

    const form = useForm<ContactFormValues>({
        resolver: zodResolver(contactSchema),
        defaultValues: { email: "", subject: "", message: "" },
    });

    const onSubmit = async (values: ContactFormValues) => {
        setStatus("loading");
        try {
            const data: any = await postApiContact(values);
            setStatus("success");
            setFeedbackMsg(data?.message || "Message sent successfully.");
            form.reset();
        } catch (err: any) {
            setStatus("error");
            setFeedbackMsg(err.message);
        }
    };

    return (
        <div className="min-h-screen flex flex-col">
            <header className="border-b bg-transparent px-8 py-16 text-center pt-24 pb-12">
                <div className="container">
                    <MessageSquare
                        size={64}
                        color="#fafafa"
                        className="mt-0 mx-auto mb-6 filter-[drop-shadow(0_0_10px_rgba(250,250,250,0.3))]"
                    />
                    <h1 className="glow-text font-mono font-extrabold tracking-tight text-7xl mb-4 uppercase ">
                        Contact Us
                    </h1>
                    <p className="mx-auto max-w-3xl text-muted-foreground text-2xl">
                        Send an email directly to the Silverbullet Team. We will
                        respond back as soon as possible.
                    </p>
                </div>
            </header>

            <main className="container pt-8 px-0 pb-24 max-w-187.5 w-full">
                <div className="glass-panel p-16 rounded-xl bg-(--bg-secondary) border border-(--border-color) w-full">
                    {status === "success" && (
                        <Alert className="border-green-500 bg-green-500/10 text-green-500 p-6 rounded mb-8">
                            <AlertDescription className="flex items-center gap-4 text-[1.2rem]">
                                <CheckCircle size={24} />
                                <span>{feedbackMsg}</span>
                            </AlertDescription>
                        </Alert>
                    )}

                    {status === "error" && (
                        <Alert variant="destructive" className="p-6 mb-8">
                            <AlertDescription className="flex items-center gap-4 text-[1.2rem]">
                                <AlertCircle size={24} />
                                <span>{feedbackMsg}</span>
                            </AlertDescription>
                        </Alert>
                    )}

                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(onSubmit)}
                            className="flex flex-col gap-8"
                        >
                            <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col gap-[0.8rem] space-y-0">
                                        <FormLabel className="text-(--text-muted) text-[1.2rem] uppercase tracking-[1px]">
                                            Your Email Address
                                        </FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Mail
                                                    size={24}
                                                    color="#52525b"
                                                    className="absolute left-3.75 top-3.75"
                                                />
                                                <Input
                                                    type="email"
                                                    placeholder="name@email.com"
                                                    className="w-full pt-6 pr-4 pb-6 pl-16 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) text-2xl font-[inherit] h-auto"
                                                    {...field}
                                                />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="subject"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col gap-[0.8rem] space-y-0">
                                        <FormLabel className="text-(--text-muted) text-[1.2rem] uppercase tracking-[1px]">
                                            Subject Matter
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="Ex: I need help with my account"
                                                className="w-full p-6 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) text-2xl font-[inherit] h-auto"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="message"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col gap-[0.8rem] space-y-0">
                                        <FormLabel className="text-(--text-muted) text-[1.2rem] uppercase tracking-[1px]">
                                            Your Message
                                        </FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Type your message here..."
                                                rows={10}
                                                className="w-full p-6 bg-(--bg-tertiary) border border-(--border-color) rounded-lg text-(--text-primary) text-2xl font-[inherit] resize-y h-auto"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <Button
                                type="submit"
                                size="lg"
                                disabled={status === "loading"}
                                className={cn(
                                    "mt-4 w-full flex items-center justify-center gap-5 p-6 bg-(--text-primary) text-(--bg-primary) rounded-lg text-2xl font-extrabold uppercase tracking-[2px] transition-all duration-200 shadow-[0_0_20px_rgba(250,250,250,0.2)] h-auto",
                                    status === "loading"
                                        ? "cursor-not-allowed"
                                        : "cursor-pointer",
                                )}
                            >
                                {status === "loading" ? (
                                    "Sending Message..."
                                ) : (
                                    <>
                                        <Send size={28} />
                                        Send Message
                                    </>
                                )}
                            </Button>
                        </form>
                    </Form>
                </div>
            </main>
        </div>
    );
}
