"use client";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { useEffect, useState } from "react";

type AdItem = {
    id: string;
    targetUrl: string;
    imageUrl: string;
};

type AdsResponse = {
    success?: boolean;
    ads?: AdItem[];
};

export default function AdBanner() {
    const [ads, setAds] = useState<AdItem[]>([]);

    useEffect(() => {
        fetch("/api/ads/slots")
            .then((res) => res.json() as Promise<AdsResponse>)
            .then((data) => {
                if (data.success && data.ads) {
                    const shuffled = [...data.ads].sort(
                        () => 0.5 - Math.random(),
                    );
                    setAds(shuffled.slice(0, 2));
                }
            })
            .catch(() => {});
    }, []);

    if (ads.length === 0) return null;

    const handleClick = (id: string, url: string) => {
        fetch(`/api/ads/${id}/click`, { method: "POST" }).catch(() => {});
        window.open(url, "_blank");
    };

    return (
        <div className="mb-6 flex flex-wrap justify-center gap-3 sm:mb-8 sm:gap-4">
            {ads.map((ad) => (
                <div
                    key={ad.id}
                    onClick={() => handleClick(ad.id, ad.targetUrl)}
                    className={cn(
                        "relative h-28 w-full cursor-pointer overflow-hidden rounded-lg border bg-card transition-transform hover:scale-[1.02] sm:h-32.5",
                        ads.length === 1
                            ? "max-w-150"
                            : "sm:w-[calc(50%-0.5rem)] sm:min-w-[16rem]",
                    )}
                >
                    <span className="absolute top-0 right-0 bg-foreground text-background text-[10px] font-semibold px-2 py-1 rounded-bl-lg uppercase tracking-widest z-10">
                        Sponsored
                    </span>
                    <Image
                        src={ad.imageUrl}
                        alt="Sponsored"
                        fill
                        unoptimized
                        sizes="(max-width: 768px) 100vw, 50vw"
                        className="object-contain block bg-black"
                        onError={(e) => {
                            e.currentTarget.style.display = "none";
                            if (e.currentTarget.parentElement)
                                e.currentTarget.parentElement.style.display =
                                    "none";
                        }}
                    />
                </div>
            ))}
        </div>
    );
}
