#!/usr/bin/env node
/**
 * convert-to-cn.cjs
 *
 * Second-pass codemod:
 *  1. Converts remaining static style props to Tailwind classes
 *     (boxSizing, gridTemplateColumns, borderBottom/dashed, textUnderlineOffset, …)
 *  2. Converts ternary style props (both branches static) to cn() calls
 *  3. Leaves truly dynamic values (template literals with runtime vars,
 *     variable references, computed values) in style={{}}
 *  4. Adds `import { cn } from "@/lib/utils"` when cn() is first used
 *  5. Fixes `border-[1px_dashed_…]` → `[border:1px_dashed_…]` in className strings
 *
 * Run from frontend/:
 *   node scripts/convert-to-cn.cjs
 */

"use strict";

const fs = require("fs");
const path = require("path");
const ts = require("typescript");

// ─── Helpers ─────────────────────────────────────────────────────────────────

function walk(dir, out = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, out);
        else if (/\.(tsx|jsx)$/.test(e.name)) out.push(p);
    }
    return out;
}

function camelToKebab(s) {
    return s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

function esc(v) {
    return v.trim().replace(/\s+/g, "_");
}

// ─── Spacing scale ────────────────────────────────────────────────────────────

const REM_TO_TW = {
    0: "0",
    0.125: "0.5",
    0.25: "1",
    0.375: "1.5",
    0.5: "2",
    0.625: "2.5",
    0.75: "3",
    0.875: "3.5",
    1: "4",
    1.25: "5",
    1.5: "6",
    1.75: "7",
    2: "8",
    2.25: "9",
    2.5: "10",
    2.75: "11",
    3: "12",
    3.5: "14",
    4: "16",
    5: "20",
    6: "24",
    7: "28",
    8: "32",
    9: "36",
    10: "40",
    11: "44",
    12: "48",
    14: "56",
    16: "64",
    20: "80",
    24: "96",
};

function parseRemKey(num) {
    if (num === 0) return "0";
    const s =
        num % 1 === 0
            ? String(num)
            : parseFloat(num.toFixed(4))
                  .toString()
                  .replace(/0+$/, "")
                  .replace(/\.$/, "");
    return REM_TO_TW[s] ?? null;
}

function toTwScale(raw) {
    const v = String(raw).trim();
    if (v === "0" || v === "0px" || v === "0rem") return "0";
    if (v === "auto") return "auto";
    const remM = v.match(/^([\d.]+)rem$/);
    if (remM) {
        const k = remM[1].replace(/^(\d+\.\d*?)0+$/, "$1").replace(/\.$/, "");
        return REM_TO_TW[k] ?? `[${v}]`;
    }
    const pxM = v.match(/^([\d.]+)px$/);
    if (pxM) {
        const rem = parseFloat(pxM[1]) / 16;
        const tw = parseRemKey(rem);
        return tw ?? `[${v}]`;
    }
    const numM = v.match(/^([\d.]+)$/);
    if (numM) {
        const rem = parseFloat(numM[1]) / 16;
        const tw = parseRemKey(rem);
        return tw ?? `[${numM[1]}px]`;
    }
    if (v.endsWith("%")) {
        const p = parseFloat(v);
        if (p === 100) return "full";
        if (p === 50) return "1/2";
        if (p === 33) return "1/3";
        if (p === 25) return "1/4";
        if (p === 75) return "3/4";
        return `[${v}]`;
    }
    return `[${v}]`;
}

function spacingClass(prefix, val) {
    return `${prefix}-${toTwScale(val)}`;
}

// ─── Colour helpers ────────────────────────────────────────────────────────────

const COLORS = {
    white: "white",
    "#fff": "white",
    "#ffffff": "white",
    black: "black",
    "#000": "black",
    "#000000": "black",
    transparent: "transparent",
    currentcolor: "current",
    currentColor: "current",
    "#fafafa": "zinc-50",
    "#f4f4f5": "zinc-100",
    "#e4e4e7": "zinc-200",
    "#d4d4d8": "zinc-300",
    "#a1a1aa": "zinc-400",
    "#71717a": "zinc-500",
    "#52525b": "zinc-600",
    "#3f3f46": "zinc-700",
    "#27272a": "zinc-800",
    "#18181b": "zinc-900",
    "#09090b": "zinc-950",
    "#f8fafc": "slate-50",
    "#f1f5f9": "slate-100",
    "#e2e8f0": "slate-200",
    "#cbd5e1": "slate-300",
    "#94a3b8": "slate-400",
    "#64748b": "slate-500",
    "#475569": "slate-600",
    "#334155": "slate-700",
    "#1e293b": "slate-800",
    "#0f172a": "slate-900",
    "#ef4444": "red-500",
    "#dc2626": "red-600",
    "#b91c1c": "red-700",
    "#991b1b": "red-800",
    "#7f1d1d": "red-900",
    "#fca5a5": "red-300",
    "#f97316": "orange-500",
    "#ea580c": "orange-600",
    "#f59e0b": "amber-500",
    "#d97706": "amber-600",
    "#fbbf24": "amber-400",
    "#eab308": "yellow-500",
    "#facc15": "yellow-400",
    "#22c55e": "green-500",
    "#16a34a": "green-600",
    "#15803d": "green-700",
    "#166534": "green-800",
    "#14532d": "green-900",
    "#10b981": "emerald-500",
    "#059669": "emerald-600",
    "#047857": "emerald-700",
    "#86efac": "green-300",
    "#6ee7b7": "emerald-300",
    "#4ade80": "green-400",
    "#3b82f6": "blue-500",
    "#2563eb": "blue-600",
    "#1d4ed8": "blue-700",
    "#1e40af": "blue-800",
    "#1e3a8a": "blue-900",
    "#93c5fd": "blue-300",
    "#60a5fa": "blue-400",
    "#38bdf8": "sky-400",
    "#6366f1": "indigo-500",
    "#4f46e5": "indigo-600",
    "#8b5cf6": "violet-500",
    "#7c3aed": "violet-600",
    "#a855f7": "purple-500",
    "#9333ea": "purple-600",
    "#ec4899": "pink-500",
    "#db2777": "pink-600",
};

function resolveColor(v) {
    return COLORS[v.trim()] ?? COLORS[v.trim().toLowerCase()] ?? null;
}

function colorClass(prefix, val) {
    const v = val.trim();
    const named = resolveColor(v);
    if (named === "white") return `${prefix}-white`;
    if (named === "black") return `${prefix}-black`;
    if (named === "transparent") return `${prefix}-transparent`;
    if (named === "current") return `${prefix}-current`;
    if (named) return `${prefix}-${named}`;
    return `${prefix}-[${esc(v)}]`;
}

// ─── CSS → Tailwind mapper ────────────────────────────────────────────────────

function cssToTw(prop, rawVal, isNum = false) {
    let v = String(rawVal).trim();

    // Numeric literals on length-expecting props → add px
    const needsUnit = new Set([
        "gap",
        "column-gap",
        "row-gap",
        "padding",
        "padding-top",
        "padding-right",
        "padding-bottom",
        "padding-left",
        "margin",
        "margin-top",
        "margin-right",
        "margin-bottom",
        "margin-left",
        "width",
        "height",
        "min-width",
        "max-width",
        "min-height",
        "max-height",
        "top",
        "right",
        "bottom",
        "left",
        "inset",
        "border-radius",
        "font-size",
        "letter-spacing",
    ]);
    if (isNum && needsUnit.has(prop) && /^\d+(\.\d+)?$/.test(v)) v = `${v}px`;

    switch (prop) {
        // ── Display ──────────────────────────────────────────────────────────────
        case "display": {
            const m = {
                flex: "flex",
                "inline-flex": "inline-flex",
                block: "block",
                "inline-block": "inline-block",
                inline: "inline",
                none: "hidden",
                grid: "grid",
                "inline-grid": "inline-grid",
            };
            return m[v] ? [m[v]] : null;
        }

        // ── Flex ─────────────────────────────────────────────────────────────────
        case "flex-direction": {
            const m = {
                row: "flex-row",
                "row-reverse": "flex-row-reverse",
                column: "flex-col",
                "column-reverse": "flex-col-reverse",
            };
            return m[v] ? [m[v]] : null;
        }
        case "align-items": {
            const m = {
                center: "items-center",
                "flex-start": "items-start",
                "flex-end": "items-end",
                stretch: "items-stretch",
                baseline: "items-baseline",
                start: "items-start",
                end: "items-end",
            };
            return m[v] ? [m[v]] : null;
        }
        case "align-self": {
            const m = {
                auto: "self-auto",
                center: "self-center",
                "flex-start": "self-start",
                "flex-end": "self-end",
                stretch: "self-stretch",
                start: "self-start",
                end: "self-end",
            };
            return m[v] ? [m[v]] : null;
        }
        case "justify-content": {
            const m = {
                center: "justify-center",
                "flex-start": "justify-start",
                "flex-end": "justify-end",
                "space-between": "justify-between",
                "space-around": "justify-around",
                "space-evenly": "justify-evenly",
                stretch: "justify-stretch",
                start: "justify-start",
                end: "justify-end",
            };
            return m[v] ? [m[v]] : null;
        }
        case "flex":
            if (v === "1") return ["flex-1"];
            if (v === "none") return ["flex-none"];
            if (v === "auto") return ["flex-auto"];
            return [`flex-[${esc(v)}]`];
        case "flex-grow":
            if (v === "1" || v === "1px") return ["grow"];
            if (v === "0") return ["grow-0"];
            return [`[flex-grow:${v}]`];
        case "flex-shrink":
            if (v === "0") return ["shrink-0"];
            if (v === "1" || v === "1px") return ["shrink"];
            return [`[flex-shrink:${v}]`];

        // ── Grid ──────────────────────────────────────────────────────────────────
        case "grid-template-columns": {
            const gridMap = {
                "1fr": "grid-cols-1",
                "1fr 1fr": "grid-cols-2",
                "1fr 1fr 1fr": "grid-cols-3",
                "1fr 1fr 1fr 1fr": "grid-cols-4",
                "repeat(2,1fr)": "grid-cols-2",
                "repeat(2, 1fr)": "grid-cols-2",
                "repeat(3,1fr)": "grid-cols-3",
                "repeat(3, 1fr)": "grid-cols-3",
                "repeat(4,1fr)": "grid-cols-4",
                "repeat(4, 1fr)": "grid-cols-4",
                "repeat(5,1fr)": "grid-cols-5",
                "repeat(6,1fr)": "grid-cols-6",
            };
            if (gridMap[v]) return [gridMap[v]];
            return [`[grid-template-columns:${esc(v)}]`];
        }
        case "grid-template-rows": {
            const m = {
                "1fr": "grid-rows-1",
                "1fr 1fr": "grid-rows-2",
                "1fr 1fr 1fr": "grid-rows-3",
            };
            if (m[v]) return [m[v]];
            return [`[grid-template-rows:${esc(v)}]`];
        }
        case "grid-column": {
            if (v === "1 / -1" || v === "1/-1") return ["col-span-full"];
            return [`col-[${esc(v)}]`];
        }
        case "grid-row": {
            return [`row-[${esc(v)}]`];
        }

        // ── Gap ───────────────────────────────────────────────────────────────────
        case "gap": {
            const parts = v.split(/\s+/);
            if (parts.length === 1) return [spacingClass("gap", v)];
            if (parts.length === 2)
                return [
                    spacingClass("gap-y", parts[0]),
                    spacingClass("gap-x", parts[1]),
                ];
            return [`gap-[${esc(v)}]`];
        }
        case "column-gap":
            return [spacingClass("gap-x", v)];
        case "row-gap":
            return [spacingClass("gap-y", v)];

        // ── Padding / Margin ─────────────────────────────────────────────────────
        case "padding": {
            const p = v.split(/\s+/);
            if (p.length === 1) return [spacingClass("p", p[0])];
            if (p.length === 2)
                return p[0] === p[1]
                    ? [spacingClass("p", p[0])]
                    : [spacingClass("py", p[0]), spacingClass("px", p[1])];
            if (p.length === 4)
                return [
                    spacingClass("pt", p[0]),
                    spacingClass("pr", p[1]),
                    spacingClass("pb", p[2]),
                    spacingClass("pl", p[3]),
                ];
            return [`p-[${esc(v)}]`];
        }
        case "padding-top":
            return [spacingClass("pt", v)];
        case "padding-right":
            return [spacingClass("pr", v)];
        case "padding-bottom":
            return [spacingClass("pb", v)];
        case "padding-left":
            return [spacingClass("pl", v)];
        case "margin": {
            if (v === "auto") return ["m-auto"];
            if (v === "0 auto" || v === "0px auto") return ["mx-auto"];
            const p = v.split(/\s+/);
            if (p.length === 1) return [spacingClass("m", p[0])];
            if (p.length === 2)
                return [
                    spacingClass("my", p[0]),
                    p[1] === "auto" ? "mx-auto" : spacingClass("mx", p[1]),
                ];
            return [`m-[${esc(v)}]`];
        }
        case "margin-top":
            return [v === "auto" ? "mt-auto" : spacingClass("mt", v)];
        case "margin-right":
            return [v === "auto" ? "mr-auto" : spacingClass("mr", v)];
        case "margin-bottom":
            return [v === "auto" ? "mb-auto" : spacingClass("mb", v)];
        case "margin-left":
            return [v === "auto" ? "ml-auto" : spacingClass("ml", v)];

        // ── Width / Height ────────────────────────────────────────────────────────
        case "width": {
            if (v === "100%") return ["w-full"];
            if (v === "auto") return ["w-auto"];
            if (v === "100vw") return ["w-screen"];
            if (v === "fit-content" || v === "max-content") return ["w-fit"];
            if (v === "min-content") return ["w-min"];
            return [`w-${toTwScale(v)}`];
        }
        case "height": {
            if (v === "100%") return ["h-full"];
            if (v === "auto") return ["h-auto"];
            if (v === "100vh") return ["h-screen"];
            if (v === "fit-content" || v === "max-content") return ["h-fit"];
            return [`h-${toTwScale(v)}`];
        }
        case "min-width": {
            if (v === "0" || v === "0px") return ["min-w-0"];
            if (v === "100%") return ["min-w-full"];
            return [`min-w-${toTwScale(v)}`];
        }
        case "max-width": {
            if (v === "none") return ["max-w-none"];
            if (v === "100%") return ["max-w-full"];
            return [`max-w-${toTwScale(v)}`];
        }
        case "min-height": {
            if (v === "100vh") return ["min-h-screen"];
            if (v === "100%") return ["min-h-full"];
            if (v === "0" || v === "0px") return ["min-h-0"];
            return [`min-h-${toTwScale(v)}`];
        }
        case "max-height": {
            if (v === "none") return ["max-h-none"];
            if (v === "100vh") return ["max-h-screen"];
            if (v === "100%") return ["max-h-full"];
            return [`max-h-${toTwScale(v)}`];
        }

        // ── Box model ─────────────────────────────────────────────────────────────
        case "box-sizing":
            if (v === "border-box") return ["box-border"];
            if (v === "content-box") return ["box-content"];
            return null;

        // ── Color / Background ───────────────────────────────────────────────────
        case "color": {
            if (v === "inherit") return ["text-inherit"];
            if (v === "currentColor" || v === "currentcolor")
                return ["text-current"];
            if (v === "transparent") return ["text-transparent"];
            return [colorClass("text", v)];
        }
        case "background":
        case "background-color": {
            if (v === "none" || v === "transparent") return ["bg-transparent"];
            if (v === "inherit") return ["bg-inherit"];
            if (
                v.startsWith("linear-gradient(") ||
                v.startsWith("radial-gradient(")
            )
                return [`bg-[${esc(v)}]`];
            if (v.startsWith("url(")) return [`bg-[${esc(v)}]`];
            return [colorClass("bg", v)];
        }

        // ── Typography ───────────────────────────────────────────────────────────
        case "font-size": {
            const map = {
                "0.75rem": "xs",
                "12px": "xs",
                "0.875rem": "sm",
                "14px": "sm",
                "1rem": "base",
                "16px": "base",
                "1.125rem": "lg",
                "18px": "lg",
                "1.25rem": "xl",
                "20px": "xl",
                "1.5rem": "2xl",
                "24px": "2xl",
                "1.875rem": "3xl",
                "30px": "3xl",
                "2.25rem": "4xl",
                "36px": "4xl",
                "3rem": "5xl",
                "48px": "5xl",
                "3.75rem": "6xl",
                "60px": "6xl",
            };
            if (/^\d+$/.test(v))
                return map[`${v}px`]
                    ? [`text-${map[`${v}px`]}`]
                    : [`text-[${v}px]`];
            return map[v] ? [`text-${map[v]}`] : [`text-[${esc(v)}]`];
        }
        case "font-weight": {
            const map = {
                100: "thin",
                200: "extralight",
                300: "light",
                400: "normal",
                500: "medium",
                600: "semibold",
                700: "bold",
                800: "extrabold",
                900: "black",
                bold: "bold",
                normal: "normal",
                medium: "medium",
                light: "light",
                semibold: "semibold",
            };
            return map[v] ? [`font-${map[v]}`] : [`font-[${v}]`];
        }
        case "text-align": {
            const m = {
                center: "text-center",
                left: "text-left",
                right: "text-right",
                justify: "text-justify",
            };
            return m[v] ? [m[v]] : null;
        }
        case "text-transform": {
            const m = {
                uppercase: "uppercase",
                lowercase: "lowercase",
                capitalize: "capitalize",
                none: "normal-case",
            };
            return m[v] ? [m[v]] : null;
        }
        case "text-decoration":
        case "text-decoration-line": {
            const m = {
                none: "no-underline",
                underline: "underline",
                "line-through": "line-through",
            };
            return m[v] ? [m[v]] : null;
        }
        case "text-underline-offset": {
            const m = {
                "1px": "1",
                "2px": "2",
                "4px": "4",
                "8px": "8",
                auto: "auto",
            };
            if (m[v]) return [`underline-offset-${m[v]}`];
            return [`[text-underline-offset:${v}]`];
        }
        case "white-space": {
            const m = {
                normal: "whitespace-normal",
                nowrap: "whitespace-nowrap",
                pre: "whitespace-pre",
                "pre-line": "whitespace-pre-line",
                "pre-wrap": "whitespace-pre-wrap",
            };
            return m[v] ? [m[v]] : null;
        }
        case "word-break": {
            const m = {
                normal: "break-normal",
                "break-word": "break-words",
                "break-all": "break-all",
            };
            return m[v] ? [m[v]] : null;
        }
        case "vertical-align": {
            const m = {
                baseline: "align-baseline",
                top: "align-top",
                middle: "align-middle",
                bottom: "align-bottom",
                "text-top": "align-text-top",
                "text-bottom": "align-text-bottom",
            };
            return m[v] ? [m[v]] : null;
        }
        case "line-height": {
            const m = {
                1: "none",
                1.25: "tight",
                1.375: "snug",
                1.5: "normal",
                1.625: "relaxed",
                2: "loose",
            };
            if (m[v]) return [`leading-${m[v]}`];
            return [`leading-${toTwScale(v)}`];
        }
        case "letter-spacing": {
            const m = {
                "-0.05em": "tighter",
                "-0.025em": "tight",
                "0em": "normal",
                0: "normal",
                "0.025em": "wide",
                "0.05em": "wider",
                "0.1em": "widest",
            };
            if (m[v]) return [`tracking-${m[v]}`];
            if (/[\d.]+px$/.test(v)) return [`tracking-[${v}]`];
            return [`tracking-[${esc(v)}]`];
        }
        case "text-shadow":
            return [`[text-shadow:${esc(v)}]`];

        // ── Border ───────────────────────────────────────────────────────────────
        case "border": {
            if (v === "none" || v === "0" || v === "0px") return ["border-0"];
            const m3 = v.match(/^([\d.]+)px\s+solid\s+(.+)$/);
            if (m3) {
                const w = m3[1];
                const wc =
                    w === "1"
                        ? "border"
                        : w === "2"
                          ? "border-2"
                          : `border-[${w}px]`;
                return [wc, colorClass("border", m3[2].trim())];
            }
            const m2 = v.match(/^([\d.]+)px\s+solid$/);
            if (m2) return [m2[1] === "1" ? "border" : `border-[${m2[1]}px]`];
            // dashed, dotted → arbitrary property
            return [`[border:${esc(v)}]`];
        }
        case "border-top":
        case "border-right":
        case "border-bottom":
        case "border-left": {
            const sideMap = {
                "border-top": "t",
                "border-right": "r",
                "border-bottom": "b",
                "border-left": "l",
            };
            const s = sideMap[prop];
            if (v === "none" || v === "0") return [`border-${s}-0`];
            const m3 = v.match(/^([\d.]+)px\s+solid\s+(.+)$/);
            if (m3) {
                const w = m3[1];
                const wc = w === "1" ? `border-${s}` : `border-${s}-[${w}px]`;
                return [wc, colorClass(`border-${s}`, m3[2].trim())];
            }
            // dashed, dotted, or other → arbitrary property
            const fullProp = {
                t: "border-top",
                r: "border-right",
                b: "border-bottom",
                l: "border-left",
            }[s];
            return [`[${fullProp}:${esc(v)}]`];
        }
        case "border-color":
            return [colorClass("border", v)];
        case "border-top-color":
            return [colorClass("border-t", v)];
        case "border-right-color":
            return [colorClass("border-r", v)];
        case "border-bottom-color":
            return [colorClass("border-b", v)];
        case "border-left-color":
            return [colorClass("border-l", v)];
        case "border-width": {
            if (v === "0" || v === "0px") return ["border-0"];
            if (v === "1px" || v === "1") return ["border"];
            if (v === "2px" || v === "2") return ["border-2"];
            if (v === "4px" || v === "4") return ["border-4"];
            return [`border-[${v}]`];
        }
        case "border-style": {
            const m = {
                solid: "border-solid",
                dashed: "border-dashed",
                dotted: "border-dotted",
                none: "border-none",
                double: "border-double",
            };
            return m[v] ? [m[v]] : null;
        }
        case "border-radius": {
            if (v === "0" || v === "0px") return ["rounded-none"];
            if (v === "9999px" || v === "50%" || v === "100%")
                return ["rounded-full"];
            const rrMap = {
                "2px": "rounded-sm",
                "4px": "rounded",
                "6px": "rounded-md",
                "8px": "rounded-lg",
                "12px": "rounded-xl",
                "16px": "rounded-2xl",
                "24px": "rounded-3xl",
                "0.125rem": "rounded-sm",
                "0.25rem": "rounded",
                "0.5rem": "rounded-lg",
                "0.75rem": "rounded-xl",
                "1rem": "rounded-2xl",
            };
            if (rrMap[v]) return [rrMap[v]];
            return [`rounded-[${esc(v)}]`];
        }
        case "border-color-left":
        case "border-left-color":
            return [colorClass("border-l", v)];
        case "border-color-right":
        case "border-right-color":
            return [colorClass("border-r", v)];
        case "border-collapse": {
            return v === "collapse"
                ? ["border-collapse"]
                : v === "separate"
                  ? ["border-separate"]
                  : null;
        }

        // ── Shadow ────────────────────────────────────────────────────────────────
        case "box-shadow": {
            if (v === "none") return ["shadow-none"];
            return [`shadow-[${esc(v)}]`];
        }

        // ── Position ──────────────────────────────────────────────────────────────
        case "position": {
            const m = {
                static: "static",
                relative: "relative",
                absolute: "absolute",
                fixed: "fixed",
                sticky: "sticky",
            };
            return m[v] ? [m[v]] : null;
        }
        case "top": {
            if (v === "auto") return ["top-auto"];
            if (v === "0" || v === "0px") return ["top-0"];
            if (v === "50%") return ["top-1/2"];
            if (v === "100%") return ["top-full"];
            return [`top-${toTwScale(v)}`];
        }
        case "right": {
            if (v === "auto") return ["right-auto"];
            if (v === "0" || v === "0px") return ["right-0"];
            return [`right-${toTwScale(v)}`];
        }
        case "bottom": {
            if (v === "auto") return ["bottom-auto"];
            if (v === "0" || v === "0px") return ["bottom-0"];
            return [`bottom-${toTwScale(v)}`];
        }
        case "left": {
            if (v === "auto") return ["left-auto"];
            if (v === "0" || v === "0px") return ["left-0"];
            return [`left-${toTwScale(v)}`];
        }
        case "z-index": {
            if (v === "auto") return ["z-auto"];
            const known = ["0", "10", "20", "30", "40", "50"];
            return known.includes(v) ? [`z-${v}`] : [`z-[${v}]`];
        }
        case "inset": {
            if (v === "0" || v === "0px") return ["inset-0"];
            return [`inset-${toTwScale(v)}`];
        }

        // ── Overflow / Visibility ─────────────────────────────────────────────────
        case "overflow": {
            const m = {
                hidden: "overflow-hidden",
                auto: "overflow-auto",
                scroll: "overflow-scroll",
                visible: "overflow-visible",
            };
            return m[v] ? [m[v]] : null;
        }
        case "overflow-x": {
            const m = {
                hidden: "overflow-x-hidden",
                auto: "overflow-x-auto",
                scroll: "overflow-x-scroll",
                visible: "overflow-x-visible",
            };
            return m[v] ? [m[v]] : null;
        }
        case "overflow-y": {
            const m = {
                hidden: "overflow-y-hidden",
                auto: "overflow-y-auto",
                scroll: "overflow-y-scroll",
                visible: "overflow-y-visible",
            };
            return m[v] ? [m[v]] : null;
        }
        case "visibility": {
            const m = { hidden: "invisible", visible: "visible" };
            return m[v] ? [m[v]] : null;
        }

        // ── Opacity / Cursor / Pointer ────────────────────────────────────────────
        case "opacity": {
            const n = parseFloat(v);
            if (!isNaN(n)) {
                const pct = Math.round(n <= 1 ? n * 100 : n);
                return [`opacity-${pct}`];
            }
            return null;
        }
        case "cursor": {
            const m = {
                auto: "cursor-auto",
                default: "cursor-default",
                pointer: "cursor-pointer",
                wait: "cursor-wait",
                text: "cursor-text",
                move: "cursor-move",
                "not-allowed": "cursor-not-allowed",
                none: "cursor-none",
                help: "cursor-help",
                grab: "cursor-grab",
                grabbing: "cursor-grabbing",
            };
            return m[v] ? [m[v]] : [`cursor-[${esc(v)}]`];
        }
        case "pointer-events": {
            const m = {
                none: "pointer-events-none",
                auto: "pointer-events-auto",
            };
            return m[v] ? [m[v]] : null;
        }
        case "user-select": {
            const m = {
                none: "select-none",
                text: "select-text",
                all: "select-all",
                auto: "select-auto",
            };
            return m[v] ? [m[v]] : null;
        }

        // ── Transition ────────────────────────────────────────────────────────────
        case "transition": {
            if (v === "none") return ["transition-none"];
            if (v === "all") return ["transition-all"];
            const propMap = {
                color: "transition-colors",
                background: "transition-colors",
                "background-color": "transition-colors",
                transform: "transition-transform",
                opacity: "transition-opacity",
                shadow: "transition-shadow",
                "box-shadow": "transition-shadow",
            };
            if (propMap[v]) return [propMap[v]];
            return [`transition-[${esc(v)}]`];
        }
        case "transition-duration": {
            const ms = v.endsWith("ms")
                ? parseInt(v)
                : Math.round(parseFloat(v) * 1000);
            const durs = [75, 100, 150, 200, 300, 500, 700, 1000];
            return durs.includes(ms)
                ? [`duration-${ms}`]
                : [`duration-[${ms}ms]`];
        }
        case "animation": {
            if (v === "none") return ["animate-none"];
            return [`[animation:${esc(v)}]`];
        }
        case "animation-delay": {
            const ms = v.endsWith("ms")
                ? parseInt(v)
                : Math.round(parseFloat(v) * 1000);
            return [`[animation-delay:${ms}ms]`];
        }

        // ── Transform ─────────────────────────────────────────────────────────────
        case "transform": {
            if (v === "none") return ["transform-none"];
            return [`[transform:${esc(v)}]`];
        }

        // ── Outline / Filter ──────────────────────────────────────────────────────
        case "outline": {
            if (v === "none" || v === "0") return ["outline-none"];
            return [`outline-[${esc(v)}]`];
        }
        case "filter": {
            if (v === "none") return ["filter-none"];
            return [`[filter:${esc(v)}]`];
        }

        // ── Misc ──────────────────────────────────────────────────────────────────
        case "object-fit": {
            const m = {
                contain: "object-contain",
                cover: "object-cover",
                fill: "object-fill",
                none: "object-none",
                "scale-down": "object-scale-down",
            };
            return m[v] ? [m[v]] : null;
        }
        case "aspect-ratio": {
            if (v === "1" || v === "1/1" || v === "1 / 1")
                return ["aspect-square"];
            if (v === "16/9" || v === "16 / 9") return ["aspect-video"];
            return [`aspect-[${esc(v)}]`];
        }
        case "float": {
            const m = {
                left: "float-left",
                right: "float-right",
                none: "float-none",
            };
            return m[v] ? [m[v]] : null;
        }
        case "resize": {
            const m = {
                none: "resize-none",
                both: "resize",
                vertical: "resize-y",
                horizontal: "resize-x",
            };
            return m[v] ? [m[v]] : null;
        }
        case "columns": {
            if (/^\d+$/.test(v)) return [`columns-${v}`];
            return [`columns-[${esc(v)}]`];
        }

        // Truly unmappable → arbitrary property syntax
        case "text-underline-offset":
            return [`[text-underline-offset:${v}]`];
        case "accent-color":
            return [`[accent-color:${esc(v)}]`];
        case "grid-column-gap":
            return [spacingClass("gap-x", v)];
        case "grid-row-gap":
            return [spacingClass("gap-y", v)];

        default:
            return null;
    }
}

// ─── Literal value extractor ─────────────────────────────────────────────────

function getLiteralValue(node) {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        return { value: node.text, isNum: false };
    }
    if (ts.isNumericLiteral(node)) {
        return { value: node.text, isNum: true };
    }
    if (node.kind === ts.SyntaxKind.TrueKeyword)
        return { value: "true", isNum: false };
    if (node.kind === ts.SyntaxKind.FalseKeyword)
        return { value: "false", isNum: false };
    if (
        ts.isPrefixUnaryExpression(node) &&
        node.operator === ts.SyntaxKind.MinusToken &&
        ts.isNumericLiteral(node.operand)
    ) {
        return { value: `-${node.operand.text}`, isNum: true };
    }
    return null;
}

// ─── Ternary handler ──────────────────────────────────────────────────────────

/**
 * If node is `cond ? staticA : staticB`, convert both to Tailwind and
 * return a cn-arg string like  `cond ? "tw-a" : "tw-b"`
 * or  `cond ? "tw-a" : ""`  when one side is empty/null.
 *
 * Returns null if the ternary can't be fully converted.
 */
function tryConvertTernary(cssProp, node, source) {
    if (!ts.isConditionalExpression(node)) return null;

    const trueVal = getLiteralValue(node.whenTrue);
    const falseVal = getLiteralValue(node.whenFalse);

    // Both branches must be static literals (or `undefined`/`null`/`false`)
    const trueIsNull =
        node.whenTrue.kind === ts.SyntaxKind.NullKeyword ||
        node.whenTrue.kind === ts.SyntaxKind.UndefinedKeyword ||
        node.whenTrue.kind === ts.SyntaxKind.FalseKeyword ||
        (ts.isIdentifier(node.whenTrue) && node.whenTrue.text === "undefined");
    const falseIsNull =
        node.whenFalse.kind === ts.SyntaxKind.NullKeyword ||
        node.whenFalse.kind === ts.SyntaxKind.UndefinedKeyword ||
        node.whenFalse.kind === ts.SyntaxKind.FalseKeyword ||
        (ts.isIdentifier(node.whenFalse) &&
            node.whenFalse.text === "undefined");

    const condText = node.condition.getText(source);

    if (trueVal && falseVal) {
        const trueTw = cssToTw(cssProp, trueVal.value, trueVal.isNum);
        const falseTw = cssToTw(cssProp, falseVal.value, falseVal.isNum);
        if (!trueTw || !falseTw) return null;
        const tStr = trueTw.join(" ");
        const fStr = falseTw.join(" ");
        if (tStr === fStr) return JSON.stringify(tStr); // same → just add unconditionally
        return `${condText} ? ${JSON.stringify(tStr)} : ${JSON.stringify(fStr)}`;
    }

    if (trueVal && falseIsNull) {
        const trueTw = cssToTw(cssProp, trueVal.value, trueVal.isNum);
        if (!trueTw) return null;
        return `${condText} ? ${JSON.stringify(trueTw.join(" "))} : ""`;
    }

    if (falseVal && trueIsNull) {
        const falseTw = cssToTw(cssProp, falseVal.value, falseVal.isNum);
        if (!falseTw) return null;
        return `${condText} ? "" : ${JSON.stringify(falseTw.join(" "))}`;
    }

    return null;
}

// ─── className building ───────────────────────────────────────────────────────

/**
 * Given the existing className attribute and lists of:
 *   - staticClasses: string[] (plain Tailwind classes)
 *   - cnArgs: string[] (cn() argument expressions like `isX ? "a" : "b"`)
 *
 * Returns the full new className attribute string, e.g.:
 *   className={cn("existing", isX ? "a" : "b")}
 *   className="existing new-static"          (when no cnArgs)
 */
function buildClassName(classAttr, staticClasses, cnArgs, source) {
    const hasCnArgs = cnArgs.length > 0;
    const hasStatic = staticClasses.length > 0;

    if (!hasCnArgs && !hasStatic) return null;

    // Build the new combined expression
    if (!hasCnArgs) {
        // Pure static additions — same as before, no cn needed
        if (!classAttr) return `className="${staticClasses.join(" ")}"`;
        const init = classAttr.initializer;
        if (!init) return `className="${staticClasses.join(" ")}"`;
        if (ts.isStringLiteral(init)) {
            const existing = init.text.trim();
            const merged = existing
                ? `${existing} ${staticClasses.join(" ")}`
                : staticClasses.join(" ");
            return `className="${merged.replace(/\s+/g, " ")}"`;
        }
        if (ts.isJsxExpression(init)) {
            const inner = init.expression
                ? init.expression.getText(source)
                : '""';
            return `className={\`\${${inner}} ${staticClasses.join(" ")}\`}`;
        }
        return null;
    }

    // Has cn() args
    const allParts = [];

    // Existing className
    if (classAttr) {
        const init = classAttr.initializer;
        if (init) {
            if (ts.isStringLiteral(init)) {
                const existing = init.text.trim();
                // merge static into existing string
                const merged = hasStatic
                    ? `${existing} ${staticClasses.join(" ")}`.trim()
                    : existing;
                allParts.push(JSON.stringify(merged.replace(/\s+/g, " ")));
            } else if (ts.isJsxExpression(init)) {
                const inner = init.expression
                    ? init.expression.getText(source)
                    : null;
                if (inner) {
                    // Check if inner is already a cn() call
                    if (inner.match(/^cn\s*\(/)) {
                        // Extract cn args and add to them
                        const innerArgs = inner.slice(
                            inner.indexOf("(") + 1,
                            inner.lastIndexOf(")"),
                        );
                        if (hasStatic) {
                            // We'll need to re-wrap — just push the existing cn call as first arg
                            // Actually, easier: pull the existing string out
                            allParts.push(inner);
                        } else {
                            allParts.push(inner);
                        }
                        // Return early with extended cn() call
                        const extra = cnArgs
                            .concat(
                                hasStatic
                                    ? [JSON.stringify(staticClasses.join(" "))]
                                    : [],
                            )
                            .join(", ");
                        // Replace last ) with , new args, )
                        const existing_str = inner;
                        const pos = existing_str.lastIndexOf(")");
                        const extended = `${existing_str.slice(0, pos)}, ${extra})`;
                        return `className={${extended}}`;
                    } else {
                        if (hasStatic) {
                            allParts.push(
                                `\`\${${inner}} ${staticClasses.join(" ")}\``,
                            );
                        } else {
                            allParts.push(inner);
                        }
                    }
                }
            }
        }
    } else {
        // No existing className — start fresh
        if (hasStatic) {
            allParts.push(JSON.stringify(staticClasses.join(" ")));
        }
    }

    allParts.push(...cnArgs);

    return `className={cn(${allParts.join(", ")})}`;
}

// ─── Fix border-[Xpx style color] → [border:Xpx_style_color] ─────────────────

function fixBorderShorthandClasses(code) {
    // Matches border-[1px_dashed_xxx] or border-[2px_solid_xxx] (full shorthand with style keyword)
    return code.replace(
        /\bborder-\[([\d.]+px)[_ ](solid|dashed|dotted)[_ ]([^\]]+)\]/g,
        (match, width, style, color) => {
            return `[border:${width}_${style}_${color}]`;
        },
    );
}

// ─── Main ────────────────────────────────────────────────────────────────────

const root = path.join(process.cwd(), "src");
const files = walk(root);

let totalStatic = 0;
let totalConditional = 0;
let totalFiles = 0;
let totalCnImports = 0;
let skipped = 0;

for (const file of files) {
    let code = fs.readFileSync(file, "utf8");

    // Phase 1: Fix malformed border-[Xpx_style_color] → [border:...]
    const fixedCode = fixBorderShorthandClasses(code);
    if (fixedCode !== code) {
        code = fixedCode;
    }

    const source = ts.createSourceFile(
        file,
        code,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
    );

    const edits = [];
    let needsCnImport = false;

    function visit(node) {
        if (
            (ts.isJsxOpeningElement(node) ||
                ts.isJsxSelfClosingElement(node)) &&
            node.attributes
        ) {
            const attrs = node.attributes.properties.filter(ts.isJsxAttribute);
            const styleAttr = attrs.find(
                (a) => a.name && a.name.getText(source) === "style",
            );

            if (!styleAttr) {
                ts.forEachChild(node, visit);
                return;
            }

            const init = styleAttr.initializer;
            if (!init || !ts.isJsxExpression(init) || !init.expression) {
                ts.forEachChild(node, visit);
                return;
            }

            const obj = init.expression;
            if (!ts.isObjectLiteralExpression(obj)) {
                ts.forEachChild(node, visit);
                return;
            }

            const staticClasses = []; // plain Tailwind strings
            const cnArgs = []; // cn() argument expressions (ternary strings)
            const remainingProps = []; // props that can't be converted

            for (const prop of obj.properties) {
                if (ts.isSpreadAssignment(prop)) {
                    remainingProps.push(prop);
                    continue;
                }
                if (!ts.isPropertyAssignment(prop)) {
                    remainingProps.push(prop);
                    continue;
                }

                // Get CSS property name (kebab-case)
                let cssProp;
                if (ts.isIdentifier(prop.name)) {
                    cssProp = camelToKebab(prop.name.text);
                } else if (ts.isStringLiteral(prop.name)) {
                    cssProp = prop.name.text;
                } else {
                    remainingProps.push(prop);
                    continue;
                }

                if (cssProp.startsWith("-")) {
                    remainingProps.push(prop);
                    continue;
                }

                const val = prop.initializer;

                // Try static literal
                const lit = getLiteralValue(val);
                if (lit) {
                    const classes = cssToTw(cssProp, lit.value, lit.isNum);
                    if (classes) {
                        staticClasses.push(...classes.filter(Boolean));
                        totalStatic++;
                        continue;
                    }
                    remainingProps.push(prop);
                    skipped++;
                    continue;
                }

                // Try ternary with static branches
                const ternaryStr = tryConvertTernary(cssProp, val, source);
                if (ternaryStr !== null) {
                    cnArgs.push(ternaryStr);
                    needsCnImport = true;
                    totalConditional++;
                    continue;
                }

                // Can't convert (dynamic, template literal with vars, variable reference, etc.)
                remainingProps.push(prop);
                skipped++;
            }

            if (staticClasses.length === 0 && cnArgs.length === 0) {
                ts.forEachChild(node, visit);
                return;
            }

            // Build new style prop (or remove it)
            const classAttr = attrs.find(
                (a) => a.name && a.name.getText(source) === "className",
            );

            const newClassStr = buildClassName(
                classAttr,
                staticClasses,
                cnArgs,
                source,
            );
            if (!newClassStr) {
                ts.forEachChild(node, visit);
                return;
            }

            if (remainingProps.length === 0) {
                edits.push({
                    start: styleAttr.getStart(source),
                    end: styleAttr.getEnd(),
                    text: "",
                });
            } else {
                const remaining = remainingProps
                    .map((p) => p.getText(source))
                    .join(", ");
                edits.push({
                    start: styleAttr.getStart(source),
                    end: styleAttr.getEnd(),
                    text: `style={{ ${remaining} }}`,
                });
            }

            if (classAttr) {
                edits.push({
                    start: classAttr.getStart(source),
                    end: classAttr.getEnd(),
                    text: newClassStr,
                });
            } else {
                // Insert before style attr position (which we're replacing)
                edits.push({
                    start: styleAttr.getStart(source),
                    end: styleAttr.getStart(source),
                    text: `${newClassStr} `,
                });
            }
        }

        ts.forEachChild(node, visit);
    }

    visit(source);

    // Apply edits in reverse order (after phase 1 fix)
    if (edits.length > 0 || fixedCode !== fs.readFileSync(file, "utf8")) {
        edits.sort((a, b) => b.start - a.start);
        let out = code;
        for (const e of edits) {
            out = out.slice(0, e.start) + e.text + out.slice(e.end);
        }

        // Add cn import if needed
        if (
            needsCnImport &&
            !out.includes('from "@/lib/utils"') &&
            !out.includes("from '@/lib/utils'")
        ) {
            // Add after the last import
            const lastImport = out.lastIndexOf("\nimport ");
            if (lastImport !== -1) {
                const lineEnd = out.indexOf("\n", lastImport + 1);
                out =
                    out.slice(0, lineEnd + 1) +
                    `import { cn } from "@/lib/utils";\n` +
                    out.slice(lineEnd + 1);
            } else {
                out = `import { cn } from "@/lib/utils";\n` + out;
            }
            totalCnImports++;
        }

        fs.writeFileSync(file, out, "utf8");
        totalFiles++;
    }
}

console.log(`\nDone!`);
console.log(`  Static props converted:      ${totalStatic}`);
console.log(`  Conditional (cn) converted:  ${totalConditional}`);
console.log(`  Skipped (truly dynamic):     ${skipped}`);
console.log(`  Files changed:               ${totalFiles}`);
console.log(`  cn imports added:            ${totalCnImports}`);
