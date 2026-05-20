"use client";

import { useTranslation } from "@/i18n/TranslationContext";
import React from "react";

export default function AuthSplitView({
    children,
}: {
    children: React.ReactNode;
}) {
    const { t } = useTranslation();

    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-background relative overflow-hidden">
            {/* Animated Background Orbs */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-purple-600/20 blur-[100px] animate-pulse mix-blend-screen" style={{ animationDuration: "10s" }}></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[35vw] h-[35vw] rounded-full bg-blue-600/20 blur-[100px] animate-pulse mix-blend-screen" style={{ animationDuration: "12s", animationDelay: "2s" }}></div>
                <div className="absolute top-[40%] left-[30%] w-[25vw] h-[25vw] rounded-full bg-pink-600/20 blur-[100px] animate-pulse mix-blend-screen" style={{ animationDuration: "15s", animationDelay: "4s" }}></div>
            </div>

            <div className="hidden lg:flex border-r dark:bg-background/40 bg-background/80 backdrop-blur-3xl relative z-10 dark:border-white/5 border-black/5">
                <div className="max-w-xl mx-auto px-10 py-14 space-y-8 animate-in slide-in-from-left duration-1000">
                    <div>
                        <h1 className="text-5xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-foreground to-muted-foreground drop-shadow-sm">
                            {t("auth.welcome")}
                        </h1>
                        <p className="mt-4 text-muted-foreground text-lg font-medium">
                            {t("auth.premier")}
                        </p>
                    </div>

                    <div className="grid grid-cols-3 rounded-xl border dark:border-white/10 border-black/10 dark:bg-card/40 bg-card/80 backdrop-blur-md shadow-2xl overflow-hidden transition-all duration-300 hover:shadow-purple-500/10 dark:hover:border-white/20 hover:border-black/20 hover:-translate-y-1">
                        <div className="p-4 text-center">
                            <div className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-br from-blue-400 to-purple-500">99.9%</div>
                            <div className="text-xs text-muted-foreground mt-1">
                                {t("auth.networkUptime")}
                            </div>
                        </div>
                        <div className="border-x dark:border-white/10 border-black/10 p-4 text-center">
                            <div className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-br from-emerald-400 to-cyan-500">24/7</div>
                            <div className="text-xs text-muted-foreground mt-1">
                                {t("auth.activeSupport")}
                            </div>
                        </div>
                        <div className="p-4 text-center">
                            <div className="text-xl font-semibold bg-clip-text text-transparent bg-gradient-to-br from-orange-400 to-pink-500">50k+</div>
                            <div className="text-xs text-muted-foreground mt-1">
                                {t("auth.activeMembers")}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="group transition-all duration-300 hover:translate-x-2">
                            <h2 className="font-semibold text-foreground flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.8)]"></span>
                                {t("auth.wideVariety")}
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                                {t("auth.wideVarietyDesc")}
                            </p>
                        </div>
                        <div className="group transition-all duration-300 hover:translate-x-2">
                            <h2 className="font-semibold text-foreground flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]"></span>
                                {t("auth.instantSecure")}
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                                {t("auth.instantSecureDesc")}
                            </p>
                        </div>
                        <div className="group transition-all duration-300 hover:translate-x-2">
                            <h2 className="font-semibold text-foreground flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-pink-500 shadow-[0_0_10px_rgba(236,72,153,0.8)]"></span>
                                {t("auth.growNetwork")}
                            </h2>
                            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                                {t("auth.growNetworkDesc")}
                            </p>
                        </div>
                    </div>

                    <div className="rounded-xl border dark:border-white/10 border-black/10 bg-gradient-to-br dark:from-card/60 dark:to-card/20 from-card/90 to-card/50 backdrop-blur-md p-5 shadow-lg relative overflow-hidden group hover:-translate-y-1 transition-transform duration-300">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <h3 className="font-semibold text-foreground flex items-center gap-2 relative z-10">
                            <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                            {t("auth.ironclad")}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-2 leading-relaxed relative z-10">
                            {t("auth.ironcladDesc")}
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-center px-4 py-10 relative z-10">
                <div className="w-full max-w-md animate-in fade-in zoom-in-95 duration-700">{children}</div>
            </div>
        </div>
    );
}

