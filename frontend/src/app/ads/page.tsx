"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
    getApiAdsSlots,
    postApiAdsPurchase,
    PostApiAdsPurchaseBodyDurationDays,
} from "@/service/api";
import { postApiAdsPurchaseBody } from "@/service/api/zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const adSchema = postApiAdsPurchaseBody
    .pick({ imageUrl: true, targetUrl: true })
    .extend({
        imageUrl: z.string().url("Must be a valid URL."),
        targetUrl: z.string().url("Must be a valid URL."),
    });

type AdFormValues = z.infer<typeof adSchema>;

type AdSlot = {
    slotId: number;
    imageUrl?: string;
    expiresAt: string;
};

export default function AdsStorefront() {
    const [slots, setSlots] = useState<AdSlot[]>([]);
    const [loading, setLoading] = useState(true);

    const [activeModalSlot, setActiveModalSlot] = useState<number | null>(null);
    const [durationDays, setDurationDays] = useState<number>(14);
    const [purchasing, setPurchasing] = useState(false);

    const form = useForm<AdFormValues>({
        resolver: zodResolver(adSchema),
        defaultValues: { imageUrl: "", targetUrl: "" },
    });

    useEffect(() => {
        fetchSlots();
    }, []);

    const fetchSlots = async () => {
        try {
            const data = (await getApiAdsSlots()) as unknown as {
                ads?: AdSlot[];
            };
            setSlots(data.ads || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handlePurchase = async (values: AdFormValues) => {
        setPurchasing(true);
        try {
            const data = (await postApiAdsPurchase({
                slotId: activeModalSlot!,
                durationDays:
                    durationDays as (typeof PostApiAdsPurchaseBodyDurationDays)[keyof typeof PostApiAdsPurchaseBodyDurationDays],
                imageUrl: values.imageUrl,
                targetUrl: values.targetUrl,
            })) as unknown as { message?: string };
            toast.success(data?.message || "Ad purchased.");
            setActiveModalSlot(null);
            form.reset();
            fetchSlots();
        } catch {
            toast.error("Transaction failed.");
        }
        setPurchasing(false);
    };

    const handleCloseModal = () => {
        setActiveModalSlot(null);
        form.reset();
    };

    const isSlotTaken = (slotId: number) => {
        return slots.find((s) => s.slotId === slotId);
    };

    const renderSlot = (id: number) => {
        const adData = isSlotTaken(id);
        const isTaken = !!adData;

        return (
            <div
                key={id}
                className={cn(
                    "bg-(--bg-secondary) rounded-lg h-62.5 flex flex-col items-center justify-center transition-all duration-200 relative overflow-hidden",
                    isTaken ? "cursor-not-allowed" : "cursor-pointer",
                    isTaken
                        ? "border border-(--border-color)"
                        : "border border-(--text-primary)",
                )}
                onClick={() => {
                    if (!isTaken) setActiveModalSlot(id);
                }}
            >
                {isTaken && adData.imageUrl && (
                    <div
                        className="absolute top-0 left-0 w-full h-full opacity-20 bg-cover bg-center"
                        style={{ backgroundImage: `url(${adData.imageUrl})` }}
                    />
                )}

                <div className="relative z-1 text-center p-4">
                    <h3
                        className={cn(
                            "text-2xl mb-2 font-mono",
                            isTaken
                                ? "text-(--text-muted)"
                                : "text-(--text-primary)",
                        )}
                    >
                        SLOT #{id}
                    </h3>

                    {isTaken ? (
                        <div>
                            <Badge
                                variant="destructive"
                                className="text-[0.7rem] mb-2.5"
                            >
                                OCCUPIED
                            </Badge>
                            <p className="text-slate-400 text-[0.9rem] m-0">
                                Available on:
                                <br />
                                {new Date(
                                    adData.expiresAt,
                                ).toLocaleDateString()}
                            </p>
                        </div>
                    ) : (
                        <div>
                            <Badge className="bg-emerald-500 text-black text-[0.7rem] mb-2.5">
                                AVAILABLE
                            </Badge>
                            <p className="text-(--text-secondary) text-[0.9rem] m-0">
                                Click to Purchase
                            </p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <main className="min-h-screen bg-(--bg-primary)">
            <div className="container max-w-250 my-16 mx-auto py-0 px-8">
                <div className="mb-12 text-center">
                    <h1 className="text-5xl text-(--text-primary) mt-0 mr-0 mb-4 pl-0 font-mono">
                        MASTER AD NETWORK
                    </h1>
                    <p className="text-(--text-secondary) text-[1.2rem] max-w-150 mx-auto">
                        Deploy your marketing banner permanently to the top 6
                        global slots on both the Marketplace and Config Index.
                        We accept static images and smaller format GIFs.
                    </p>
                </div>

                {loading ? (
                    <div className="text-slate-400 text-center p-12">
                        Polling active campaigns...
                    </div>
                ) : (
                    <div className="mobile-grid-1 grid gap-6 grid-cols-3">
                        {[1, 2, 3, 4, 5, 6].map(renderSlot)}
                    </div>
                )}
            </div>

            {}
            <Dialog
                open={activeModalSlot !== null}
                onOpenChange={(open) => {
                    if (!open) handleCloseModal();
                }}
            >
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="font-mono text-[1.8rem]">
                            BUY SLOT #{activeModalSlot}
                        </DialogTitle>
                    </DialogHeader>
                    <p className="text-(--text-secondary) mb-4">
                        Lock down this premium placement instantly using your
                        Silverbullet (BLT) Balance.
                    </p>

                    <Form {...form}>
                        <form
                            onSubmit={form.handleSubmit(handlePurchase)}
                            className="flex flex-col gap-6"
                        >
                            <FormField
                                control={form.control}
                                name="imageUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="block mb-2 font-semibold">
                                            Image / GIF URL
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="https://imgur.com/your-ad.gif"
                                                className="h-auto p-[0.8rem]"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="targetUrl"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="block mb-2 font-semibold">
                                            Click Destination Link
                                        </FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="https://t.me/your_telegram"
                                                className="h-auto p-[0.8rem]"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div>
                                <Label className="block mb-2 font-semibold">
                                    Campaign Duration
                                </Label>
                                <div className="mobile-grid-1 grid gap-4 grid-cols-2">
                                    <Button
                                        type="button"
                                        variant={
                                            durationDays === 14
                                                ? "default"
                                                : "outline"
                                        }
                                        className="p-4 h-auto font-semibold"
                                        onClick={() => setDurationDays(14)}
                                    >
                                        2 Weeks (250 BLT)
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={
                                            durationDays === 30
                                                ? "default"
                                                : "outline"
                                        }
                                        className="p-4 h-auto font-semibold"
                                        onClick={() => setDurationDays(30)}
                                    >
                                        1 Month (480 BLT)
                                    </Button>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                disabled={purchasing}
                                className="mt-4 w-full p-4 h-auto font-semibold"
                            >
                                {purchasing
                                    ? "PROCESSING TRANSACTION..."
                                    : `PAY ${durationDays === 14 ? "250" : "480"} BLT`}
                            </Button>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </main>
    );
}
