"use client";

export { useTheme } from "next-themes";

import type { ThemeProviderProps } from "next-themes";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export default function ThemeProvider({
    children,
    ...props
}: ThemeProviderProps) {
    return (
        <NextThemesProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            themes={["light", "dark", "contrast", "pink", "custom"]}
            {...props}
        >
            {children}
        </NextThemesProvider>
    );
}
