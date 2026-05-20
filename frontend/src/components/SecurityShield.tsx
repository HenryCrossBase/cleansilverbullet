"use client";

import { useEffect } from "react";

export default function SecurityShield() {
    useEffect(() => {
        if (process.env.NODE_ENV === "development") {
            console.log("Security Shield disabled in development mode.");
            return;
        }

        // 1. Block Context Menu (Right Click)
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
        };
        window.addEventListener("contextmenu", handleContextMenu);

        // 2. Block Keyboard Shortcuts (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U)
        const handleKeyDown = (e: KeyboardEvent) => {
            if (
                e.key === "F12" ||
                (e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "i" || e.key === "J" || e.key === "j" || e.key === "C" || e.key === "c")) ||
                (e.ctrlKey && (e.key === "U" || e.key === "u")) ||
                (e.metaKey && e.altKey && (e.key === "I" || e.key === "i" || e.key === "J" || e.key === "j" || e.key === "C" || e.key === "c" || e.key === "U" || e.key === "u"))
            ) {
                e.preventDefault();
                return false;
            }
        };
        window.addEventListener("keydown", handleKeyDown);

        const triggerKillSwitch = () => {
            document.body.innerHTML = "<div style='display:flex;justify-content:center;align-items:center;height:100vh;background:#050505;color:#ff3333;font-family:monospace;font-size:24px;font-weight:bold;'>[SEC-OP] UNAUTHORIZED INSPECTION DETECTED</div>";
            window.location.replace("about:blank");
        };

        // 3. DevTools Detection Trap (Debugger loop)
        const devtoolsTrap = setInterval(() => {
            const before = new Date().getTime();
            // eslint-disable-next-line no-debugger
            debugger;
            const after = new Date().getTime();
            if (after - before > 100) {
                // If the debugger triggered, it paused execution.
                triggerKillSwitch();
            }
        }, 1000);

        // 4. Dimension Checks (if DevTools opens and resizes window heavily)
        const checkDimensions = setInterval(() => {
            // Ignore on mobile devices: virtual keyboards cause large height differences
            if (typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent)) return;

            const threshold = 160;
            const widthDiff = window.outerWidth - window.innerWidth > threshold;
            const heightDiff = window.outerHeight - window.innerHeight > threshold;
            if (widthDiff || heightDiff) {
                 triggerKillSwitch();
            }
        }, 2000);

        // 5. Constant Console Clearing
        const consoleClear = setInterval(() => {
            console.clear();
            console.log("%cSTOP!", "color: red; font-size: 50px; font-weight: bold; text-shadow: 2px 2px 0px #000;");
            console.log("%cThis is a restricted environment. Any attempt to reverse engineer or capture traffic will result in immediate blacklisting.", "font-size: 18px; color: white; background: red; padding: 5px; border-radius: 4px;");
        }, 2000);

        return () => {
            window.removeEventListener("contextmenu", handleContextMenu);
            window.removeEventListener("keydown", handleKeyDown);
            clearInterval(devtoolsTrap);
            clearInterval(checkDimensions);
            clearInterval(consoleClear);
        };
    }, []);

    return null;
}
