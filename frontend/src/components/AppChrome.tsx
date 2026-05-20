"use client";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

export default function AppChrome({ children }: { children: ReactNode }) {
    const pathname = usePathname();
    const sidebarStyle = {
        "--sidebar-top": "var(--navbar-height)",
    } as CSSProperties;

    if (pathname.startsWith("/admin")) {
        return <>{children}</>;
    }

    return (
        <div className="flex flex-col min-h-screen">
            <Navbar />
            <SidebarProvider
                className="flex-1"
                style={sidebarStyle}
            >
                <Sidebar />
                <SidebarInset className="min-w-0 overflow-x-clip">
                    <div className="page-shell w-full py-4 sm:py-5 md:py-6">
                        {children}
                    </div>
                </SidebarInset>
            </SidebarProvider>
        </div>
    );
}
