"use client";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslation } from "@/i18n/TranslationContext";
import { Globe } from "lucide-react";
import Image from "next/image";

export default function LanguageSwitcher({
    direction = "down",
    compact = false,
}: {
    direction?: "up" | "down";
    compact?: boolean;
}) {
    const { language, setLanguage } = useTranslation();

    const getLangName = (code: string) => {
        switch (code) {
            case "en":
                return "English";
            case "es":
                return "Español";
            case "zh":
                return "中文";
            default:
                return "English";
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <Globe size={14} />
                    <span className={compact ? "hidden sm:inline" : "inline"}>
                        {getLangName(language)}
                    </span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                align="end"
                side={direction === "up" ? "top" : "bottom"}
            >
                <DropdownMenuItem
                    onClick={() => setLanguage("en")}
                    className="gap-2"
                >
                    <Image
                        src="https://flagcdn.com/w20/us.png"
                        alt="US"
                        width={20}
                        height={15}
                        sizes="20px"
                        className="w-5 rounded-sm"
                    />{" "}
                    English
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => setLanguage("es")}
                    className="gap-2"
                >
                    <Image
                        src="https://flagcdn.com/w20/es.png"
                        alt="ES"
                        width={20}
                        height={15}
                        sizes="20px"
                        className="w-5 rounded-sm"
                    />{" "}
                    Español
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => setLanguage("zh")}
                    className="gap-2"
                >
                    <Image
                        src="https://flagcdn.com/w20/cn.png"
                        alt="CN"
                        width={20}
                        height={15}
                        sizes="20px"
                        className="w-5 rounded-sm"
                    />{" "}
                    中文
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
