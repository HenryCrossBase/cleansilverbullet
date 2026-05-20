"use client";

import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Monitor,
    Moon,
    Sun,
    Palette,
    Paintbrush
} from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect } from "react";

function hexToHSL(H: string) {
    let r = 0, g = 0, b = 0;
    if (H.length == 4) {
        r = parseInt(H[1] + H[1], 16);
        g = parseInt(H[2] + H[2], 16);
        b = parseInt(H[3] + H[3], 16);
    } else if (H.length == 7) {
        r = parseInt(H.substring(1, 3), 16);
        g = parseInt(H.substring(3, 5), 16);
        b = parseInt(H.substring(5, 7), 16);
    }
    r /= 255;
    g /= 255;
    b /= 255;
    let cmin = Math.min(r, g, b),
        cmax = Math.max(r, g, b),
        delta = cmax - cmin,
        h = 0,
        s = 0,
        l = 0;

    if (delta == 0) h = 0;
    else if (cmax == r) h = ((g - b) / delta) % 6;
    else if (cmax == g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;

    h = Math.round(h * 60);
    if (h < 0) h += 360;

    l = (cmax + cmin) / 2;
    s = delta == 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
    s = +(s * 100).toFixed(1);
    l = +(l * 100).toFixed(1);

    return { h, s, l };
}

export default function ThemeSwitcher({
    align = "right",
    direction = "down",
}: {
    align?: "left" | "right";
    direction?: "up" | "down";
}) {
    const { setTheme } = useTheme();

    useEffect(() => {
        const savedColor = localStorage.getItem("custom-theme-color");
        if (savedColor) {
            document.documentElement.style.setProperty("--custom-primary", savedColor);
        }
    }, []);

    const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const hex = e.target.value;
        const hsl = hexToHSL(hex);
        const colorString = `${hsl.h} ${hsl.s}% ${hsl.l}%`;
        document.documentElement.style.setProperty("--custom-primary", colorString);
        localStorage.setItem("custom-theme-color", colorString);
    };

    return (
        <>
            <input
                id="custom-color-picker"
                type="color"
                className="absolute opacity-0 w-0 h-0 pointer-events-none"
                onChange={handleCustomColorChange}
            />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" title="Theme Settings">
                        <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                        <span className="sr-only">Toggle theme</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                    align={align === "right" ? "end" : "start"}
                    side={direction === "up" ? "top" : "bottom"}
                >
                    <DropdownMenuItem onClick={() => setTheme("system")}>
                        <Monitor className="mr-2 h-4 w-4" />
                        System Default
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("dark")}>
                        <Moon className="mr-2 h-4 w-4" />
                        Dark
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("light")}>
                        <Sun className="mr-2 h-4 w-4" />
                        Light
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("pink")}>
                        <Paintbrush className="mr-2 h-4 w-4 text-pink-500" />
                        Pink
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => {
                        setTheme("custom");
                        document.getElementById("custom-color-picker")?.click();
                    }}>
                        <Palette className="mr-2 h-4 w-4" />
                        Custom
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </>
    );
}
