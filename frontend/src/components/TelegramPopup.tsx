"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "./ui/button";

export default function TelegramPopup() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const isClosed = localStorage.getItem("sb_telegram_popup_closed");
        const isLoggedIn = localStorage.getItem("sb_user");
        
        if (!isClosed && isLoggedIn) {
            // Slight delay so it pops up after page load
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        localStorage.setItem("sb_telegram_popup_closed", "true");
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 flex w-72 animate-in slide-in-from-bottom-5 fade-in duration-500">
            <div className="relative flex w-full flex-col overflow-hidden rounded-xl border border-border/50 bg-card/90 p-4 shadow-2xl backdrop-blur-md transition-all hover:border-sky-500/50">
                <button
                    onClick={handleClose}
                    className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    aria-label="Close"
                >
                    <X className="h-4 w-4" />
                </button>
                
                <div className="mb-2 flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-500/10 text-sky-500">
                        <svg
                            viewBox="0 0 24 24"
                            className="h-5 w-5 fill-current"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.223-.548.223l.188-2.85 5.18-4.686c.223-.198-.054-.31-.346-.116l-6.405 4.04-2.777-.866c-.602-.19-.611-.604.126-.89l10.839-4.18c.5-.184.954.121.803.957z" />
                        </svg>
                    </div>
                    <div>
                        <h4 className="font-bold text-sm tracking-tight">Official Channel</h4>
                        <p className="text-xs text-sky-400 font-mono">@sbmrkt</p>
                    </div>
                </div>
                
                <Button
                    asChild
                    variant="default"
                    size="sm"
                    className="mt-2 w-full bg-sky-500 text-white hover:bg-sky-600 font-semibold"
                >
                    <a
                        href="https://t.me/sbmrkt"
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={handleClose}
                    >
                        Join
                    </a>
                </Button>
            </div>
        </div>
    );
}
