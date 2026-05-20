"use client";
import KineticText from "@/components/KineticText";
import {
  getApiMarketProductId,
  postApiMarketPurchaseProductId,
} from "@/service/api";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ProductCheckout() {
    const { id } = useParams();
    const [product, setProduct] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState<number | string>(1);
    const [purchaseSuccess, setPurchaseSuccess] = useState(false);
    const router = useRouter();

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const data: any = await getApiMarketProductId(id as string);
                setProduct(data?.product || null);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchProduct();
    }, [id]);

    const handlePurchase = async () => {
        try {
            await postApiMarketPurchaseProductId(id as string, {
                amount: Number(quantity) || 1,
            });
            setPurchaseSuccess(true);
        } catch {
            toast.error("Something went wrong");
        }
    };

    if (loading)
        return (
            <div className="text-foreground text-center p-20 font-mono">
                Establishing secure connection to Vendor...
            </div>
        );
    if (!product)
        return (
            <div className="text-foreground text-center p-20 font-bold font-mono text-xl">
                404 PRODUCT NOT FOUND
            </div>
        );

    return (
        <div className="pt-24 pb-12 px-4 md:px-8 max-w-5xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
                <ShieldCheck className="text-muted-foreground" size={32} />
                <h1 className="text-3xl md:text-[2rem] text-foreground m-0 font-bold tracking-tight uppercase">
                    SECURE CHECKOUT
                </h1>
            </div>

            <div className="grid gap-8 grid-cols-1 lg:grid-cols-[2fr_1fr]">
                <div className="bg-card border border-border/30 rounded-2xl p-8 shadow-sm flex flex-col gap-8">
                    <div>
                        <div className="text-muted-foreground text-[0.85rem] uppercase tracking-wider font-bold mb-2">
                            Target Payload
                        </div>
                        <h2 className="text-foreground text-2xl md:text-[1.8rem] m-0 font-bold">
                            {product.productName}
                        </h2>
                    </div>

                    <div className="bg-background/50 border border-border/30 rounded-xl p-6">
                        <div className="flex items-center gap-4 mb-6">
                            <Image
                                src={
                                    product.shop.avatarUrl ||
                                    product.shop.owner.avatarUrl ||
                                    "/default-avatar.png"
                                }
                                width={48}
                                height={48}
                                unoptimized
                                className="w-12 h-12 rounded-lg border border-border/30 object-cover"
                                alt="Store"
                                onError={(e) => { e.currentTarget.srcset = ""; e.currentTarget.src='/default-avatar.png'; }}
                            />
                            <div>
                                <div className="text-muted-foreground text-xs uppercase tracking-wider font-bold mb-1">
                                    Store
                                </div>
                                <div className="flex items-center gap-2">
                                    <KineticText
                                        text={product.shop.shopName}
                                        effect={
                                            product.shop.activeEffect || "none"
                                        }
                                        className="font-bold text-lg"
                                        style={{ color:
                                                product.shop.activeColor ||
                                                "var(--foreground)" }}
                                    />
                                    {product.shop.isTrusted && (
                                        <span
                                            className="flex items-center filter-[drop-shadow(0_0_5px_rgba(59,_130,_246,_0.5))]"
                                            title="Verified Store"
                                        >
                                            <svg
                                                width="20"
                                                height="20"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    fill="#3b82f6"
                                                />
                                                <path
                                                    fill="none"
                                                    stroke="white"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M8 12.5l3 3 5-6"
                                                />
                                            </svg>
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <p className="text-muted-foreground leading-relaxed m-0 text-[0.95rem]">
                            {product.description}
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-8 border-t border-border/30 pt-6">
                        <div>
                            <div className="text-muted-foreground text-xs uppercase tracking-wider font-bold mb-1">
                                Origin Region
                            </div>
                            <div className="text-foreground font-bold">
                                {product.country}
                            </div>
                        </div>
                        <div>
                            <div className="text-muted-foreground text-xs uppercase tracking-wider font-bold mb-1">
                                Category
                            </div>
                            <div className="text-foreground font-bold uppercase">
                                {product.category}
                            </div>
                        </div>
                        <div>
                            <div className="text-muted-foreground text-xs uppercase tracking-wider font-bold mb-1">
                                Available Stock
                            </div>
                            <div
                                className={cn(
                                    "font-bold",
                                    product.stock > 0
                                        ? "text-emerald-500"
                                        : "text-red-500"
                                )}
                            >
                                {product.stock} Units
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-card border border-border/30 rounded-2xl p-8 flex flex-col gap-6 shadow-sm">
                    <h3 className="m-0 text-foreground text-xl font-bold pb-4 border-b border-border/30">
                        Order Summary
                    </h3>

                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground font-medium">
                            Price per Line
                        </span>
                        <span className="text-foreground font-bold text-xl font-mono">
                            {product.price}{" "}
                            <span className="text-sm text-muted-foreground font-sans">
                                BLT
                            </span>
                        </span>
                    </div>

                    <div className="flex justify-between items-center">
                        <span className="text-muted-foreground font-medium">
                            Quantity
                        </span>
                        <input
                            type="number"
                            min="1"
                            max={product.stock}
                            value={quantity}
                            onChange={(e) => {
                                const raw = e.target.value;
                                if (raw === "") {
                                    setQuantity("");
                                    return;
                                }
                                let val = parseInt(raw, 10);
                                if (isNaN(val)) return;
                                if (val > product.stock) val = product.stock;
                                setQuantity(val);
                            }}
                            onBlur={() => {
                                if (quantity === "" || Number(quantity) < 1) {
                                    setQuantity(1);
                                }
                            }}
                            className="bg-background/50 border border-border/30 text-foreground p-2 rounded-lg w-24 text-right font-mono outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        />
                    </div>

                    <div className="flex justify-between items-center pt-6 mt-2 border-t border-border/30">
                        <span className="text-foreground font-bold">
                            Total Escrow
                        </span>
                        <span className="text-emerald-500 font-black text-3xl font-mono tracking-tight">
                            {product.price * (Number(quantity) || 1)}{" "}
                            <span className="text-lg font-sans text-emerald-500/80">BLT</span>
                        </span>
                    </div>

                    <button
                        className={cn(
                            "w-full mt-4 p-4 text-lg font-bold rounded-xl border-0 cursor-pointer transition-all uppercase tracking-wider",
                            product.stock < 1
                                ? "bg-muted text-muted-foreground cursor-not-allowed"
                                : "bg-emerald-500 hover:bg-emerald-600 text-white shadow-md hover:shadow-lg"
                        )}
                        onClick={handlePurchase}
                        disabled={product.stock < 1}
                    >
                        {product.stock < 1 ? "OUT OF STOCK" : "PAY NOW"}
                    </button>
                    <div className="text-center text-xs text-muted-foreground leading-relaxed">
                        By proceeding, you agree to the 5-minute strict Escrow
                        Policy logic. All transactions are final if unaltered.
                    </div>
                </div>
            </div>

            {purchaseSuccess && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-md flex items-center justify-center z-[100] p-4">
                    <div className="bg-card border border-border/30 w-full max-w-md rounded-2xl p-10 text-center shadow-xl animation-[fadeIn_0.3s_ease-out]">
                        <div className="text-emerald-500 mb-6 flex justify-center filter drop-shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                            <CheckCircle2 size={64} />
                        </div>
                        <h2 className="text-foreground text-2xl mt-0 mb-4 font-black uppercase tracking-wider">
                            Payment Successful
                        </h2>
                        <p className="text-muted-foreground mb-8 leading-relaxed">
                            Your order has been fully processed and the
                            encrypted log is now waiting for you in your
                            Purchased Logs section.
                        </p>
                        <div className="flex gap-4">
                            <button
                                onClick={() => router.push("/purchases")}
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white border-0 py-4 px-6 rounded-xl cursor-pointer font-bold uppercase tracking-wider transition-all shadow-md"
                            >
                                Check your order
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
