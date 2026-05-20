import React from "react";

interface HiddenContentProps {
    isUnlocked: boolean;
    actualContent?: React.ReactNode;
}

export default function HiddenContent({
    isUnlocked,
    actualContent,
}: HiddenContentProps) {
    if (isUnlocked) {
        return (
            <div className="mt-6">
                <div className="mb-4 rounded-md bg-emerald-500 px-4 py-3 text-center text-sm font-semibold text-black">
                    VirusTotal link:{" "}
                    <a href="#" className="underline text-emerald-900">
                        https://www.virustotal.com/gui/file/d35547...
                    </a>
                </div>
                <div className="rounded-md border bg-muted/40 p-4">
                    {actualContent}
                </div>
            </div>
        );
    }

    return (
        <div className="mt-6 overflow-hidden rounded-md border bg-card shadow-sm">
            <div className="flex items-center gap-2 border-b border-dashed bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
                <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
                Hidden Content
            </div>

            <div className="px-6 py-6">
                <p className="mb-6 text-[0.95rem] font-medium text-destructive">
                    You must reply to this thread to view this content or{" "}
                    <a href="/upgrade" className="underline">
                        upgrade your account
                    </a>
                    .
                </p>
                <p className="text-sm leading-relaxed text-amber-600 dark:text-amber-400">
                    <strong>Note:</strong>{" "}
                    <a href="/upgrade" className="underline">
                        Upgrade
                    </a>{" "}
                    your account to see all hidden content on every post without
                    replying and prevent getting banned.
                </p>
            </div>

            <div className="border-t bg-muted/30 p-4 text-center">
                <h4 className="text-base font-semibold tracking-wide text-destructive">
                    Silverbullet Pro - Premium Netflix/Hulu Checking Config
                </h4>
            </div>
        </div>
    );
}
