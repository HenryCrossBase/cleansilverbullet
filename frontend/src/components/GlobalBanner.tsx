"use client";
import { useEffect, useState } from "react";
import { X, Megaphone } from "lucide-react";

export default function GlobalBanner() {
    const [banner, setBanner] = useState<{ active: boolean; message: string; color: string } | null>(null);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        const fetchBanner = async () => {
            try {
                const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/api/settings/banner`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.data?.active) {
                        setBanner(data.data);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch global banner");
            }
        };

        fetchBanner();
        // Check periodically
        const interval = setInterval(fetchBanner, 60000); // Check every minute
        return () => clearInterval(interval);
    }, []);

    if (!banner || dismissed) return null;

    return (
        <div className={`fixed left-0 right-0 top-[var(--navbar-height)] z-40 ${banner.color} text-white px-4 py-2.5 sm:py-3 shadow-md transition-all duration-300`}>
            <div className="max-w-7xl mx-auto flex items-center justify-center gap-3 pr-8 relative text-center">
                <Megaphone size={16} className="shrink-0 hidden sm:block opacity-80 animate-pulse" />
                <span className="text-xs sm:text-sm font-medium tracking-wide font-mono leading-tight">
                    {banner.message}
                </span>
                <button
                    onClick={() => setDismissed(true)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/20 transition-colors"
                    aria-label="Dismiss banner"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
}
