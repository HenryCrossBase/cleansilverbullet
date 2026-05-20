import AppChrome from "@/components/AppChrome";
import GlobalBanner from "@/components/GlobalBanner";
import SecurityShield from "@/components/SecurityShield";
import TelegramPopup from "@/components/TelegramPopup";
import ThemeProvider from "@/components/ThemeProvider";
import { Toaster } from "@/components/ui/sonner";
import { TranslationProvider } from "@/i18n/TranslationContext";
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./animations.css";
import "./globals.css";

const inter = Inter({
    variable: "--font-inter",
    subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
    variable: "--font-jetbrains-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "SilverBullet | The #1 Tool MarketPlace",
    description:
        "Silverbullet.to - The new standard for secure discussions, marketplace, and leaks.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html
            lang="en"
            suppressHydrationWarning
            className={`${inter.variable} ${jetbrainsMono.variable}`}
        >
            <body>
                <ThemeProvider>
                    <TranslationProvider>
                        <Toaster />
                        <SecurityShield />
                        <GlobalBanner />
                        <AppChrome>{children}</AppChrome>
                        <TelegramPopup />
                    </TranslationProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}
