"use client";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import HiddenContent from "../../../components/Thread/HiddenContent";

export default function ThreadView() {
    const [hasReplied, setHasReplied] = useState(false);
    const [isVIP, setIsVIP] = useState(false);

    const isUnlocked = isVIP || hasReplied;

    return (
        <div className="container py-8 px-0">
            {}
            <div className="mb-8 p-4 bg-(--bg-tertiary) border border-(--border-color) rounded flex gap-4">
                <span className="font-semibold">Developer Controls:</span>
                <div className="flex items-center gap-1.25 cursor-pointer">
                    <Checkbox
                        id="hasReplied"
                        checked={hasReplied}
                        onCheckedChange={(v) => setHasReplied(!!v)}
                    />
                    <Label htmlFor="hasReplied">User has replied</Label>
                </div>
                <div className="flex items-center gap-1.25 cursor-pointer">
                    <Checkbox
                        id="isVIP"
                        checked={isVIP}
                        onCheckedChange={(v) => setIsVIP(!!v)}
                    />
                    <Label htmlFor="isVIP">User is VIP Upgraded</Label>
                </div>
            </div>

            <div className="bg-(--bg-secondary) border border-(--border-color) rounded-lg overflow-hidden">
                {}
                <div className="bg-[rgba(255,255,255,0.02)] p-6 border-b border-b-(--border-color)">
                    <h1 className="text-2xl text-(--text-primary) mb-2">
                        <span className="bg-red-500 text-(--text-primary) text-[0.7rem] py-0.5 px-1.5 rounded-[3px] mr-2.5 align-middle">
                            ADMIN RELEASE
                        </span>
                        Silverbullet Pro - Premium Netflix/Hulu Checking Config
                    </h1>
                    <div className="text-[0.85rem] text-(--text-muted)">
                        Started by{" "}
                        <strong className="text-red-500">
                            Silverbullet Core
                        </strong>
                        , Today at 10:45 AM
                    </div>
                </div>

                {}
                <div className="p-8">
                    <p className="text-(--text-secondary) leading-[1.6]">
                        Welcome to the official Silverbullet release for the
                        Netflix/Hulu combo checking config. This config utilizes
                        highly optimized logic for maximum CPM.
                        <br />
                        <br />
                        Features include:
                    </p>
                    <ul className="text-(--text-secondary) mt-4 mr-0 mb-4 pl-8 leading-[1.6]">
                        <li>Full Captcha Bypass</li>
                        <li>Custom Proxy Parsing Engine</li>
                        <li>Direct Telegram API hooking to send hits</li>
                    </ul>
                    <p className="text-(--text-secondary)">
                        Download link is below. Please do not leak this to other
                        boards.
                    </p>

                    <HiddenContent
                        isUnlocked={isUnlocked}
                        actualContent={
                            <div className="text-center">
                                <strong className="text-emerald-500 block mb-2.5">
                                    Download Link:
                                </strong>
                                <a
                                    href="https://mega.nz/file/..."
                                    className="text-blue-500 underline"
                                >
                                    https://mega.nz/file/WormGPT-Silverbullet-Release-v1.zip
                                </a>
                                <p className="mt-2.5 text-[0.8rem] text-(--text-muted)">
                                    Password: silverbullet.to
                                </p>
                            </div>
                        }
                    />
                </div>
            </div>
        </div>
    );
}
