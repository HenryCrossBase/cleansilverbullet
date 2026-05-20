"use client";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { useEffect, useState } from "react";
import LanguageSwitcher from "./LanguageSwitcher";

export default function Footer() {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const storedUser = localStorage.getItem("sb_user");
        if (storedUser) setUser(JSON.parse(storedUser));
    }, []);

    return (
        <footer className="border-t mt-16 py-8 px-4">
            <div className="flex flex-col items-center gap-4 text-sm text-muted-foreground">
                <div className="flex gap-6 flex-wrap justify-center">
                    <Link
                        href="/why-us"
                        className="font-semibold hover:text-foreground transition-colors"
                    >
                        Why Us
                    </Link>
                    <Link
                        href="/tos"
                        className="font-semibold hover:text-foreground transition-colors"
                    >
                        Terms of Service
                    </Link>
                    <Link
                        href="/privacy"
                        className="font-semibold hover:text-foreground transition-colors"
                    >
                        Privacy Policy
                    </Link>
                    <Button
                        variant="link"
                        asChild
                        className="font-bold text-blue-500 hover:brightness-150 transition-all gap-1.5 h-auto p-0"
                    >
                        <a
                            href="https://t.me/SilverBullet_Soft"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            <svg
                                viewBox="0 0 24 24"
                                width="14"
                                height="14"
                                stroke="currentColor"
                                strokeWidth="2"
                                fill="none"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <path d="M21.5 2L2.5 10l5 2 1.5 8 3.5-4 5.5 3 3.5-17z" />
                                <path d="M11 12l8-7" />
                            </svg>
                            Official Telegram
                        </a>
                    </Button>
                </div>

                <Separator className="max-w-2xl w-full" />

                <div className="w-full max-w-2xl flex justify-between items-center flex-wrap gap-3">
                    <span className={user ? "" : "w-full text-center"}>
                        &copy; {new Date().getFullYear()} Silverbullet
                        Ecosystem. All network activity is heavily encrypted and
                        protected.
                    </span>
                    {user && <LanguageSwitcher direction="up" />}
                </div>
            </div>
        </footer>
    );
}
