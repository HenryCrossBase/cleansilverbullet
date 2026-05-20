#!/usr/bin/env node
/**
 * convert-to-proper-tailwind.cjs
 *
 * Converts every  style={{ ... }}  prop in .tsx/.jsx files to real Tailwind
 * utility classes and merges them into className.
 *
 * Rules:
 *  - Static literal values  → proper Tailwind utilities (flex, items-center, p-4 …)
 *  - CSS variables           → Tailwind arbitrary value  (text-[var(--x)])
 *  - Known hex colours       → named Tailwind colour     (bg-red-500)
 *  - Truly unmappable props  → Tailwind arbitrary prop   ([filter:…])
 *  - Dynamic values          → left in style={{}}
 *  - Spreads / CSS custom props → left in style={{}}
 *
 * Run from the frontend directory:
 *   node scripts/convert-to-proper-tailwind.cjs
 */

"use strict";

const fs = require("fs");
const path = require("path");
const ts = require("typescript");

// ─── Walk ────────────────────────────────────────────────────────────────────

function walk(dir, out = []) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const p = path.join(dir, e.name);
        if (e.isDirectory()) walk(p, out);
        else if (/\.(tsx|jsx)$/.test(e.name)) out.push(p);
    }
    return out;
}

// ─── Utilities ───────────────────────────────────────────────────────────────

function camelToKebab(s) {
    return s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

/** Escape a value for Tailwind arbitrary syntax: spaces → underscores */
function esc(v) {
    return v.trim().replace(/\s+/g, "_");
}

// ─── Spacing scale (rem & px → Tailwind number) ──────────────────────────────

const REM_SCALE = {
    0: "0",
    0.5: "0.5",
    1: "0.5",
    1.5: "1.5",
    0.125: "0.5",
    0.25: "1",
    0.375: "1.5",
    2: "0.5",
};

// Build a proper map: rem-value → tw-scale
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

/**
 * Convert a spacing/sizing value to a Tailwind scale number.
 * Returns  "4"  or  "[1.3rem]"  (arbitrary fallback).
 */
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

    // Bare number → treat as px
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
        if (p === 66 || p === 67) return "2/3";
        if (p === 25) return "1/4";
        if (p === 75) return "3/4";
        if (p === 20) return "1/5";
        if (p === 40) return "2/5";
        if (p === 60) return "3/5";
        if (p === 80) return "4/5";
        return `[${v}]`;
    }

    return `[${v}]`;
}

function spacingClass(prefix, val) {
    const tw = toTwScale(val);
    return `${prefix}-${tw}`;
}

// ─── Colour map ───────────────────────────────────────────────────────────────

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

    // Zinc
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

    // Slate
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

    // Red
    "#fca5a5": "red-300",
    "#f87171": "red-400",
    "#ef4444": "red-500",
    "#dc2626": "red-600",
    "#b91c1c": "red-700",
    "#991b1b": "red-800",
    "#7f1d1d": "red-900",

    // Orange
    "#fdba74": "orange-300",
    "#fb923c": "orange-400",
    "#f97316": "orange-500",
    "#ea580c": "orange-600",

    // Amber
    "#fcd34d": "amber-300",
    "#fbbf24": "amber-400",
    "#f59e0b": "amber-500",
    "#d97706": "amber-600",

    // Yellow
    "#fde047": "yellow-300",
    "#facc15": "yellow-400",
    "#eab308": "yellow-500",
    "#ca8a04": "yellow-600",

    // Green
    "#86efac": "green-300",
    "#4ade80": "green-400",
    "#22c55e": "green-500",
    "#16a34a": "green-600",
    "#15803d": "green-700",
    "#166534": "green-800",
    "#14532d": "green-900",

    // Emerald
    "#6ee7b7": "emerald-300",
    "#34d399": "emerald-400",
    "#10b981": "emerald-500",
    "#059669": "emerald-600",
    "#047857": "emerald-700",

    // Teal
    "#5eead4": "teal-300",
    "#2dd4bf": "teal-400",
    "#14b8a6": "teal-500",

    // Blue
    "#93c5fd": "blue-300",
    "#60a5fa": "blue-400",
    "#3b82f6": "blue-500",
    "#2563eb": "blue-600",
    "#1d4ed8": "blue-700",
    "#1e40af": "blue-800",
    "#1e3a8a": "blue-900",

    // Indigo
    "#a5b4fc": "indigo-300",
    "#818cf8": "indigo-400",
    "#6366f1": "indigo-500",
    "#4f46e5": "indigo-600",

    // Violet
    "#c4b5fd": "violet-300",
    "#a78bfa": "violet-400",
    "#8b5cf6": "violet-500",
    "#7c3aed": "violet-600",

    // Purple
    "#d8b4fe": "purple-300",
    "#c084fc": "purple-400",
    "#a855f7": "purple-500",
    "#9333ea": "purple-600",

    // Pink
    "#f9a8d4": "pink-300",
    "#f472b6": "pink-400",
    "#ec4899": "pink-500",
    "#db2777": "pink-600",

    // Neutral
    "#fafafa": "neutral-50",
    "#f5f5f5": "neutral-100",

    // White extras
    "#e4e4e4": "neutral-200",
    "#d4d4d4": "neutral-300",
    "#a3a3a3": "neutral-400",
    "#737373": "neutral-500",
    "#525252": "neutral-600",
    "#404040": "neutral-700",
    "#262626": "neutral-800",
    "#171717": "neutral-900",
    "#0a0a0a": "neutral-950",
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
    // CSS variable or complex value → arbitrary
    return `${prefix}-[${esc(v)}]`;
}

// ─── CSS → Tailwind mapper ────────────────────────────────────────────────────

/**
 * @param {string}  prop   kebab-case CSS property
 * @param {string}  rawVal already a string (numeric literals have been stringified)
 * @param {boolean} isNum  was the original token a JS numeric literal?
 * @returns {string[] | null}  Tailwind classes, or null (→ keep in style={})
 */
function cssToTw(prop, rawVal, isNum = false) {
    let v = rawVal.trim();

    // Numeric literals on length-expecting properties → add px
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
        "border-top-left-radius",
        "border-top-right-radius",
        "border-bottom-right-radius",
        "border-bottom-left-radius",
        "font-size",
        "letter-spacing",
    ]);
    if (isNum && needsUnit.has(prop) && /^\d+(\.\d+)?$/.test(v)) {
        v = `${v}px`;
    }

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
                table: "table",
                "table-cell": "table-cell",
                "table-row": "table-row",
                "table-column": "table-column",
                contents: "contents",
                "list-item": "list-item",
                "flow-root": "flow-root",
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
        case "flex-wrap": {
            const m = {
                wrap: "flex-wrap",
                nowrap: "flex-nowrap",
                "wrap-reverse": "flex-wrap-reverse",
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
                baseline: "self-baseline",
                start: "self-start",
                end: "self-end",
            };
            return m[v] ? [m[v]] : null;
        }
        case "align-content": {
            const m = {
                center: "content-center",
                "flex-start": "content-start",
                "flex-end": "content-end",
                "space-between": "content-between",
                "space-around": "content-around",
                "space-evenly": "content-evenly",
                stretch: "content-stretch",
                normal: "content-normal",
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
                normal: "justify-normal",
                start: "justify-start",
                end: "justify-end",
            };
            return m[v] ? [m[v]] : null;
        }
        case "justify-items": {
            const m = {
                center: "justify-items-center",
                start: "justify-items-start",
                end: "justify-items-end",
                stretch: "justify-items-stretch",
            };
            return m[v] ? [m[v]] : null;
        }
        case "justify-self": {
            const m = {
                auto: "justify-self-auto",
                center: "justify-self-center",
                start: "justify-self-start",
                end: "justify-self-end",
                stretch: "justify-self-stretch",
            };
            return m[v] ? [m[v]] : null;
        }
        case "flex": {
            if (v === "1") return ["flex-1"];
            if (v === "none") return ["flex-none"];
            if (v === "auto") return ["flex-auto"];
            if (v === "initial") return ["flex-initial"];
            return [`flex-[${esc(v)}]`];
        }
        case "flex-grow":
            if (v === "1" || v === "1px") return ["grow"];
            if (v === "0") return ["grow-0"];
            return [`[flex-grow:${v}]`];
        case "flex-shrink":
            if (v === "0") return ["shrink-0"];
            if (v === "1" || v === "1px") return ["shrink"];
            return [`[flex-shrink:${v}]`];
        case "flex-basis": {
            if (v === "auto") return ["basis-auto"];
            if (v === "0" || v === "0px") return ["basis-0"];
            if (v === "100%") return ["basis-full"];
            const tw = toTwScale(v);
            return [`basis-${tw}`];
        }
        case "order": {
            const m = {
                first: "order-first",
                last: "order-last",
                none: "order-none",
            };
            if (m[v]) return [m[v]];
            if (/^-?\d+$/.test(v)) return [`order-[${v}]`];
            return null;
        }

        // ── Gap ──────────────────────────────────────────────────────────────────
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

        // ── Padding ───────────────────────────────────────────────────────────────
        case "padding": {
            const p = v.split(/\s+/);
            if (p.length === 1) return [spacingClass("p", p[0])];
            if (p.length === 2) {
                if (p[0] === p[1]) return [spacingClass("p", p[0])];
                return [spacingClass("py", p[0]), spacingClass("px", p[1])];
            }
            if (p.length === 3)
                return [
                    spacingClass("pt", p[0]),
                    spacingClass("px", p[1]),
                    spacingClass("pb", p[2]),
                ];
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

        // ── Margin ────────────────────────────────────────────────────────────────
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
            if (p.length === 3)
                return [
                    spacingClass("mt", p[0]),
                    p[1] === "auto" ? "mx-auto" : spacingClass("mx", p[1]),
                    spacingClass("mb", p[2]),
                ];
            if (p.length === 4)
                return [
                    spacingClass("mt", p[0]),
                    spacingClass("mr", p[1]),
                    spacingClass("mb", p[2]),
                    spacingClass("pl", p[3]),
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
            const tw = toTwScale(v);
            return [`w-${tw}`];
        }
        case "height": {
            if (v === "100%") return ["h-full"];
            if (v === "auto") return ["h-auto"];
            if (v === "100vh") return ["h-screen"];
            if (v === "fit-content" || v === "max-content") return ["h-fit"];
            if (v === "min-content") return ["h-min"];
            const tw = toTwScale(v);
            return [`h-${tw}`];
        }
        case "min-width": {
            if (v === "0" || v === "0px") return ["min-w-0"];
            if (v === "100%") return ["min-w-full"];
            if (v === "min-content") return ["min-w-min"];
            if (v === "max-content") return ["min-w-max"];
            if (v === "fit-content") return ["min-w-fit"];
            const tw = toTwScale(v);
            return [`min-w-${tw}`];
        }
        case "max-width": {
            if (v === "none") return ["max-w-none"];
            if (v === "100%") return ["max-w-full"];
            if (v === "fit-content" || v === "max-content")
                return ["max-w-fit"];
            if (v === "min-content") return ["max-w-min"];
            const tw = toTwScale(v);
            return [`max-w-${tw}`];
        }
        case "min-height": {
            if (v === "100vh") return ["min-h-screen"];
            if (v === "100%") return ["min-h-full"];
            if (v === "0" || v === "0px") return ["min-h-0"];
            if (v === "fit-content") return ["min-h-fit"];
            const tw = toTwScale(v);
            return [`min-h-${tw}`];
        }
        case "max-height": {
            if (v === "none") return ["max-h-none"];
            if (v === "100vh") return ["max-h-screen"];
            if (v === "100%") return ["max-h-full"];
            const tw = toTwScale(v);
            return [`max-h-${tw}`];
        }

        // ── Color ─────────────────────────────────────────────────────────────────
        case "color": {
            if (v === "inherit") return ["text-inherit"];
            if (v === "currentColor" || v === "currentcolor")
                return ["text-current"];
            if (v === "transparent") return ["text-transparent"];
            return [colorClass("text", v)];
        }
        case "caret-color":
            return [colorClass("caret", v)];
        case "accent-color":
            return [colorClass("accent", v)];
        case "fill":
            return [colorClass("fill", v)];
        case "stroke": {
            if (/^\d/.test(v)) return [`stroke-${v}`]; // stroke-width integer
            return [colorClass("stroke", v)];
        }

        // ── Background ───────────────────────────────────────────────────────────
        case "background":
        case "background-color": {
            if (v === "none" || v === "transparent") return ["bg-transparent"];
            if (v === "inherit") return ["bg-inherit"];
            if (v === "current" || v === "currentColor") return ["bg-current"];
            if (v.startsWith("linear-gradient(")) return [`bg-[${esc(v)}]`];
            if (v.startsWith("radial-gradient(")) return [`bg-[${esc(v)}]`];
            if (v.startsWith("url(")) return [`bg-[${esc(v)}]`];
            return [colorClass("bg", v)];
        }
        case "background-image": {
            if (v === "none") return ["bg-none"];
            return [`bg-[${esc(v)}]`];
        }
        case "background-size": {
            const m = {
                cover: "bg-cover",
                contain: "bg-contain",
                auto: "bg-auto",
            };
            return m[v] ? [m[v]] : [`[background-size:${esc(v)}]`];
        }
        case "background-position": {
            const m = {
                center: "bg-center",
                top: "bg-top",
                bottom: "bg-bottom",
                left: "bg-left",
                right: "bg-right",
                "top left": "bg-left-top",
                "top right": "bg-right-top",
                "bottom left": "bg-left-bottom",
                "bottom right": "bg-right-bottom",
            };
            return m[v] ? [m[v]] : [`[background-position:${esc(v)}]`];
        }
        case "background-repeat": {
            const m = {
                "no-repeat": "bg-no-repeat",
                repeat: "bg-repeat",
                "repeat-x": "bg-repeat-x",
                "repeat-y": "bg-repeat-y",
            };
            return m[v] ? [m[v]] : null;
        }
        case "background-attachment": {
            const m = {
                fixed: "bg-fixed",
                local: "bg-local",
                scroll: "bg-scroll",
            };
            return m[v] ? [m[v]] : null;
        }
        case "background-clip": {
            const m = {
                "border-box": "bg-clip-border",
                "padding-box": "bg-clip-padding",
                "content-box": "bg-clip-content",
                text: "bg-clip-text",
            };
            return m[v] ? [m[v]] : null;
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
                "4.5rem": "7xl",
                "72px": "7xl",
                "6rem": "8xl",
                "96px": "8xl",
                "8rem": "9xl",
                "128px": "9xl",
            };
            // bare number → px
            if (/^\d+$/.test(v)) {
                const key = `${v}px`;
                return map[key] ? [`text-${map[key]}`] : [`text-[${v}px]`];
            }
            return map[v] ? [`text-${map[v]}`] : [`text-[${esc(v)}]`];
        }
        case "font-weight": {
            const map = {
                100: "thin",
                thin: "thin",
                200: "extralight",
                "extra-light": "extralight",
                300: "light",
                light: "light",
                400: "normal",
                normal: "normal",
                500: "medium",
                medium: "medium",
                600: "semibold",
                "semi-bold": "semibold",
                semibold: "semibold",
                700: "bold",
                bold: "bold",
                800: "extrabold",
                "extra-bold": "extrabold",
                extrabold: "extrabold",
                900: "black",
                black: "black",
            };
            return map[v] ? [`font-${map[v]}`] : [`font-[${v}]`];
        }
        case "font-style": {
            const m = { italic: "italic", normal: "not-italic" };
            return m[v] ? [m[v]] : null;
        }
        case "font-family": {
            if (v.includes("mono") || v === "var(--font-mono)")
                return ["font-mono"];
            if (v.includes("sans") || v === "var(--font-sans)")
                return ["font-sans"];
            if (v.includes("serif") || v === "var(--font-serif)")
                return ["font-serif"];
            return [`font-[${esc(v)}]`];
        }
        case "text-align": {
            const m = {
                center: "text-center",
                left: "text-left",
                right: "text-right",
                justify: "text-justify",
                start: "text-left",
                end: "text-right",
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
                overline: "overline",
            };
            return m[v] ? [m[v]] : null;
        }
        case "text-decoration-color":
            return [colorClass("decoration", v)];
        case "text-overflow": {
            if (v === "ellipsis") return ["overflow-hidden", "text-ellipsis"];
            if (v === "clip") return ["text-clip"];
            return null;
        }
        case "text-shadow":
            return [`[text-shadow:${esc(v)}]`];
        case "text-wrap": {
            const m = {
                nowrap: "text-nowrap",
                wrap: "text-wrap",
                balance: "text-balance",
                pretty: "text-pretty",
            };
            return m[v] ? [m[v]] : null;
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
            const tw = toTwScale(v);
            return [`leading-${tw}`];
        }
        case "white-space": {
            const m = {
                normal: "whitespace-normal",
                nowrap: "whitespace-nowrap",
                pre: "whitespace-pre",
                "pre-line": "whitespace-pre-line",
                "pre-wrap": "whitespace-pre-wrap",
                "break-spaces": "whitespace-break-spaces",
            };
            return m[v] ? [m[v]] : null;
        }
        case "word-break": {
            const m = {
                normal: "break-normal",
                "break-word": "break-words",
                "break-all": "break-all",
                "keep-all": "break-keep",
            };
            return m[v] ? [m[v]] : null;
        }
        case "overflow-wrap": {
            if (v === "break-word" || v === "anywhere") return ["break-words"];
            return null;
        }
        case "vertical-align": {
            const m = {
                baseline: "align-baseline",
                top: "align-top",
                middle: "align-middle",
                bottom: "align-bottom",
                "text-top": "align-text-top",
                "text-bottom": "align-text-bottom",
                sub: "align-sub",
                super: "align-super",
            };
            return m[v] ? [m[v]] : null;
        }

        // ── Border ───────────────────────────────────────────────────────────────
        case "border": {
            if (v === "none" || v === "0" || v === "0px") return ["border-0"];
            // "1px solid <color>"
            const m3 = v.match(/^([\d.]+)px\s+solid\s+(.+)$/);
            if (m3) {
                const w = m3[1];
                const wc =
                    w === "1"
                        ? "border"
                        : w === "2"
                          ? "border-2"
                          : w === "4"
                            ? "border-4"
                            : `border-[${w}px]`;
                return [wc, colorClass("border", m3[2].trim())];
            }
            // "1px solid" (no color)
            const m2 = v.match(/^([\d.]+)px\s+solid$/);
            if (m2) {
                const w = m2[1];
                return [
                    w === "1"
                        ? "border"
                        : w === "2"
                          ? "border-2"
                          : `border-[${w}px]`,
                ];
            }
            return [`border-[${esc(v)}]`];
        }
        case "border-top":
            return parseBorderSide("t", v);
        case "border-right":
            return parseBorderSide("r", v);
        case "border-bottom":
            return parseBorderSide("b", v);
        case "border-left":
            return parseBorderSide("l", v);
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
            if (v === "8px" || v === "8") return ["border-8"];
            return [`border-[${v}]`];
        }
        case "border-style": {
            const m = {
                solid: "border-solid",
                dashed: "border-dashed",
                dotted: "border-dotted",
                none: "border-none",
                double: "border-double",
                hidden: "border-hidden",
            };
            return m[v] ? [m[v]] : null;
        }
        case "border-radius": {
            if (v === "0" || v === "0px") return ["rounded-none"];
            if (v === "9999px" || v === "50%" || v === "100%")
                return ["rounded-full"];
            const rrMap = {
                "2px": "rounded-sm",
                "0.125rem": "rounded-sm",
                "4px": "rounded",
                "0.25rem": "rounded",
                "6px": "rounded-md",
                "0.375rem": "rounded-md",
                "8px": "rounded-lg",
                "0.5rem": "rounded-lg",
                "10px": "rounded-lg",
                "12px": "rounded-xl",
                "0.75rem": "rounded-xl",
                "14px": "rounded-xl",
                "16px": "rounded-2xl",
                "1rem": "rounded-2xl",
                "24px": "rounded-3xl",
                "1.5rem": "rounded-3xl",
            };
            if (rrMap[v]) return [rrMap[v]];
            // bare number → px
            if (/^\d+$/.test(v)) {
                const px = parseInt(v, 10);
                if (px === 0) return ["rounded-none"];
                if (px <= 2) return ["rounded-sm"];
                if (px <= 4) return ["rounded"];
                if (px <= 6) return ["rounded-md"];
                if (px <= 10) return ["rounded-lg"];
                if (px <= 14) return ["rounded-xl"];
                if (px <= 24) return ["rounded-2xl"];
                if (px >= 9999) return ["rounded-full"];
                return [`rounded-[${px}px]`];
            }
            return [`rounded-[${esc(v)}]`];
        }
        case "border-top-left-radius":
            return [`rounded-tl-[${esc(v)}]`];
        case "border-top-right-radius":
            return [`rounded-tr-[${esc(v)}]`];
        case "border-bottom-right-radius":
            return [`rounded-br-[${esc(v)}]`];
        case "border-bottom-left-radius":
            return [`rounded-bl-[${esc(v)}]`];
        case "border-collapse": {
            const m = {
                collapse: "border-collapse",
                separate: "border-separate",
            };
            return m[v] ? [m[v]] : null;
        }

        // ── Shadow ────────────────────────────────────────────────────────────────
        case "box-shadow": {
            if (v === "none") return ["shadow-none"];
            return [`shadow-[${esc(v)}]`];
        }

        // ── Position / Inset ─────────────────────────────────────────────────────
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
            if (v === "50%") return ["right-1/2"];
            if (v === "100%") return ["right-full"];
            return [`right-${toTwScale(v)}`];
        }
        case "bottom": {
            if (v === "auto") return ["bottom-auto"];
            if (v === "0" || v === "0px") return ["bottom-0"];
            if (v === "50%") return ["bottom-1/2"];
            if (v === "100%") return ["bottom-full"];
            return [`bottom-${toTwScale(v)}`];
        }
        case "left": {
            if (v === "auto") return ["left-auto"];
            if (v === "0" || v === "0px") return ["left-0"];
            if (v === "50%") return ["left-1/2"];
            if (v === "100%") return ["left-full"];
            return [`left-${toTwScale(v)}`];
        }
        case "inset": {
            if (v === "0" || v === "0px") return ["inset-0"];
            const p = v.split(/\s+/);
            if (p.length === 2)
                return [
                    spacingClass("inset-y", p[0]),
                    spacingClass("inset-x", p[1]),
                ];
            return [`inset-${toTwScale(v)}`];
        }
        case "z-index": {
            if (v === "auto") return ["z-auto"];
            const known = ["0", "10", "20", "30", "40", "50"];
            return known.includes(v) ? [`z-${v}`] : [`z-[${v}]`];
        }

        // ── Overflow / Visibility ─────────────────────────────────────────────────
        case "overflow": {
            const m = {
                hidden: "overflow-hidden",
                auto: "overflow-auto",
                scroll: "overflow-scroll",
                visible: "overflow-visible",
                clip: "overflow-clip",
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
            const m = {
                hidden: "invisible",
                visible: "visible",
                collapse: "collapse",
            };
            return m[v] ? [m[v]] : null;
        }

        // ── Opacity ───────────────────────────────────────────────────────────────
        case "opacity": {
            const n = parseFloat(v);
            if (!isNaN(n)) {
                const pct = Math.round(n <= 1 ? n * 100 : n);
                return [`opacity-${pct}`];
            }
            return null;
        }

        // ── Cursor / Pointer ──────────────────────────────────────────────────────
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
                progress: "cursor-progress",
                crosshair: "cursor-crosshair",
                grab: "cursor-grab",
                grabbing: "cursor-grabbing",
                "zoom-in": "cursor-zoom-in",
                "zoom-out": "cursor-zoom-out",
                copy: "cursor-copy",
                "no-drop": "cursor-no-drop",
                "context-menu": "cursor-context-menu",
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

        // ── Transition / Animation ────────────────────────────────────────────────
        case "transition": {
            if (v === "none") return ["transition-none"];
            if (v === "all") return ["transition-all"];
            if (v.startsWith("all ")) {
                const parts = v.split(/\s+/);
                const rawDur = parts[1] ?? "0s";
                const ms = rawDur.endsWith("ms")
                    ? parseInt(rawDur)
                    : Math.round(parseFloat(rawDur) * 1000);
                const durs = [75, 100, 150, 200, 300, 500, 700, 1000];
                const dc = durs.includes(ms)
                    ? `duration-${ms}`
                    : `duration-[${ms}ms]`;
                const easingMap = {
                    "ease-in": "ease-in",
                    "ease-out": "ease-out",
                    "ease-in-out": "ease-in-out",
                    ease: "ease-in-out",
                    linear: "ease-linear",
                };
                const ec = easingMap[parts[2]] ? [easingMap[parts[2]]] : [];
                return ["transition-all", dc, ...ec];
            }
            // common single-prop patterns
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
        case "transition-timing-function": {
            const m = {
                linear: "ease-linear",
                ease: "ease-in-out",
                "ease-in": "ease-in",
                "ease-out": "ease-out",
                "ease-in-out": "ease-in-out",
            };
            return m[v] ? [m[v]] : null;
        }
        case "transition-delay": {
            const ms = v.endsWith("ms")
                ? parseInt(v)
                : Math.round(parseFloat(v) * 1000);
            return [`delay-${ms}`];
        }
        case "animation": {
            if (v === "none") return ["animate-none"];
            if (v.includes("spin")) return ["animate-spin"];
            if (v.includes("ping")) return ["animate-ping"];
            if (v.includes("pulse")) return ["animate-pulse"];
            if (v.includes("bounce")) return ["animate-bounce"];
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
        case "transform-origin": {
            const m = {
                center: "origin-center",
                top: "origin-top",
                bottom: "origin-bottom",
                left: "origin-left",
                right: "origin-right",
            };
            return m[v] ? [m[v]] : [`origin-[${esc(v)}]`];
        }

        // ── Outline ───────────────────────────────────────────────────────────────
        case "outline": {
            if (v === "none" || v === "0" || v === "0px none transparent")
                return ["outline-none"];
            return [`outline-[${esc(v)}]`];
        }
        case "outline-offset":
            return [`outline-offset-[${esc(v)}]`];
        case "outline-color":
            return [colorClass("outline", v)];

        // ── Filter ────────────────────────────────────────────────────────────────
        case "filter": {
            if (v === "none") return ["filter-none"];
            return [`[filter:${esc(v)}]`];
        }
        case "backdrop-filter":
            return [`[backdrop-filter:${esc(v)}]`];

        // ── Misc ──────────────────────────────────────────────────────────────────
        case "resize": {
            const m = {
                none: "resize-none",
                both: "resize",
                vertical: "resize-y",
                horizontal: "resize-x",
            };
            return m[v] ? [m[v]] : null;
        }
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
        case "object-position": {
            const m = {
                center: "object-center",
                top: "object-top",
                bottom: "object-bottom",
                left: "object-left",
                right: "object-right",
            };
            return m[v] ? [m[v]] : [`object-[${esc(v)}]`];
        }
        case "aspect-ratio": {
            if (v === "1" || v === "1/1" || v === "1 / 1")
                return ["aspect-square"];
            if (v === "16/9" || v === "16 / 9") return ["aspect-video"];
            return [`aspect-[${esc(v)}]`];
        }
        case "list-style":
        case "list-style-type": {
            const m = {
                none: "list-none",
                disc: "list-disc",
                decimal: "list-decimal",
            };
            return m[v] ? [m[v]] : null;
        }
        case "list-style-position": {
            return v === "inside"
                ? ["list-inside"]
                : v === "outside"
                  ? ["list-outside"]
                  : null;
        }
        case "appearance":
        case "-webkit-appearance":
            return v === "none" ? ["appearance-none"] : null;
        case "float": {
            const m = {
                left: "float-left",
                right: "float-right",
                none: "float-none",
            };
            return m[v] ? [m[v]] : null;
        }
        case "clear": {
            const m = {
                left: "clear-left",
                right: "clear-right",
                both: "clear-both",
                none: "clear-none",
            };
            return m[v] ? [m[v]] : null;
        }
        case "isolation": {
            return v === "isolate"
                ? ["isolate"]
                : v === "auto"
                  ? ["isolation-auto"]
                  : null;
        }
        case "mix-blend-mode": {
            const m = {
                normal: "mix-blend-normal",
                multiply: "mix-blend-multiply",
                screen: "mix-blend-screen",
                overlay: "mix-blend-overlay",
                darken: "mix-blend-darken",
                lighten: "mix-blend-lighten",
                difference: "mix-blend-difference",
                exclusion: "mix-blend-exclusion",
                hue: "mix-blend-hue",
                saturation: "mix-blend-saturation",
                color: "mix-blend-color",
                luminosity: "mix-blend-luminosity",
            };
            return m[v] ? [m[v]] : null;
        }
        case "table-layout": {
            return v === "fixed"
                ? ["table-fixed"]
                : v === "auto"
                  ? ["table-auto"]
                  : null;
        }
        case "scroll-behavior": {
            return v === "smooth"
                ? ["scroll-smooth"]
                : v === "auto"
                  ? ["scroll-auto"]
                  : null;
        }
        case "will-change": {
            const m = {
                auto: "will-change-auto",
                scroll: "will-change-scroll",
                contents: "will-change-contents",
                transform: "will-change-transform",
            };
            return m[v] ? [m[v]] : null;
        }
        case "columns": {
            if (/^\d+$/.test(v)) return [`columns-${v}`];
            return [`columns-[${esc(v)}]`];
        }
        case "stroke-width":
            return [`stroke-${v}`];

        default:
            return null;
    }
}

function parseBorderSide(side, v) {
    if (v === "none" || v === "0") return [`border-${side}-0`];
    const m = v.match(/^([\d.]+)px\s+solid\s+(.+)$/);
    if (m) {
        const w = m[1];
        const wc = w === "1" ? `border-${side}` : `border-${side}-[${w}px]`;
        return [wc, colorClass(`border-${side}`, m[2].trim())];
    }
    const m2 = v.match(/^([\d.]+)px\s+solid$/);
    if (m2)
        return [
            m2[1] === "1" ? `border-${side}` : `border-${side}-[${m2[1]}px]`,
        ];
    return null;
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
    // Negative number: -1, -0.5 …
    if (
        ts.isPrefixUnaryExpression(node) &&
        node.operator === ts.SyntaxKind.MinusToken &&
        ts.isNumericLiteral(node.operand)
    ) {
        return { value: `-${node.operand.text}`, isNum: true };
    }
    return null;
}

// ─── className merging ───────────────────────────────────────────────────────

/**
 * Given the existing className JSX attribute and new classes to add,
 * return a replacement attribute string like  className="existing new"
 */
function mergedClassName(classAttr, newClasses, source) {
    const extra = newClasses.join(" ");

    if (!classAttr) {
        return `className="${extra}"`;
    }

    const init = classAttr.initializer;
    if (!init) {
        return `className="${extra}"`;
    }

    if (ts.isStringLiteral(init)) {
        const existing = init.text.trim();
        const merged = existing ? `${existing} ${extra}` : extra;
        return `className="${merged.replace(/\s+/g, " ")}"`;
    }

    if (ts.isJsxExpression(init)) {
        const inner = init.expression ? init.expression.getText(source) : '""';
        return `className={\`\${${inner}} ${extra}\`}`;
    }

    return null; // cannot merge → skip
}

// ─── Main conversion ─────────────────────────────────────────────────────────

const root = path.join(process.cwd(), "src");
const files = walk(root);

let totalStatic = 0;
let totalDynamic = 0;
let totalFiles = 0;
const stillHasStyle = [];

for (const file of files) {
    const original = fs.readFileSync(file, "utf8");
    const source = ts.createSourceFile(
        file,
        original,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX,
    );

    const edits = [];

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

            const staticClasses = [];
            const remainingProps = []; // props that can't be converted

            for (const prop of obj.properties) {
                // Spread: {...x} — always keep in style
                if (ts.isSpreadAssignment(prop)) {
                    remainingProps.push(prop);
                    totalDynamic++;
                    continue;
                }

                if (!ts.isPropertyAssignment(prop)) {
                    remainingProps.push(prop);
                    continue;
                }

                // Get CSS property name
                let cssProp;
                if (ts.isIdentifier(prop.name)) {
                    cssProp = camelToKebab(prop.name.text);
                } else if (ts.isStringLiteral(prop.name)) {
                    cssProp = prop.name.text;
                } else {
                    remainingProps.push(prop);
                    continue;
                }

                // CSS custom properties (--x) → always stay in style
                if (cssProp.startsWith("-")) {
                    remainingProps.push(prop);
                    totalDynamic++;
                    continue;
                }

                // Get value
                const lit = getLiteralValue(prop.initializer);
                if (!lit) {
                    // Dynamic value (conditional, identifier, template, etc.)
                    remainingProps.push(prop);
                    totalDynamic++;
                    continue;
                }

                const classes = cssToTw(cssProp, lit.value, lit.isNum);
                if (!classes) {
                    // Unmappable → keep in style
                    remainingProps.push(prop);
                    totalDynamic++;
                    continue;
                }

                staticClasses.push(...classes.filter(Boolean));
                totalStatic++;
            }

            if (staticClasses.length === 0) {
                ts.forEachChild(node, visit);
                return;
            }

            const classAttr = attrs.find(
                (a) => a.name && a.name.getText(source) === "className",
            );
            const newClassAttrStr = mergedClassName(
                classAttr,
                staticClasses,
                source,
            );

            if (!newClassAttrStr) {
                // Can't merge, skip
                ts.forEachChild(node, visit);
                return;
            }

            if (remainingProps.length === 0) {
                // All converted — remove style prop
                edits.push({
                    start: styleAttr.getStart(source),
                    end: styleAttr.getEnd(),
                    text: "",
                });
            } else {
                // Partial — rebuild style with remaining props only
                const remaining = remainingProps
                    .map((p) => p.getText(source))
                    .join(", ");
                const newStyleStr = `style={{ ${remaining} }}`;
                edits.push({
                    start: styleAttr.getStart(source),
                    end: styleAttr.getEnd(),
                    text: newStyleStr,
                });
                stillHasStyle.push(path.relative(process.cwd(), file));
            }

            // Update / insert className
            if (classAttr) {
                edits.push({
                    start: classAttr.getStart(source),
                    end: classAttr.getEnd(),
                    text: newClassAttrStr,
                });
            } else {
                // Insert className where style was (style will be removed or replaced,
                // so we insert className at the style position before the style edit)
                edits.push({
                    start: styleAttr.getStart(source),
                    end: styleAttr.getStart(source),
                    text: `${newClassAttrStr} `,
                });
            }
        }

        ts.forEachChild(node, visit);
    }

    visit(source);

    if (edits.length > 0) {
        edits.sort((a, b) => b.start - a.start);
        let out = original;
        for (const e of edits) {
            out = out.slice(0, e.start) + e.text + out.slice(e.end);
        }
        if (out !== original) {
            fs.writeFileSync(file, out, "utf8");
            totalFiles++;
        }
    }
}

console.log(`\nDone!`);
console.log(`  Static props converted: ${totalStatic}`);
console.log(`  Dynamic props kept in style={{}}: ${totalDynamic}`);
console.log(`  Files changed: ${totalFiles}`);

// De-dupe stillHasStyle
const remaining = [...new Set(stillHasStyle)];
console.log(`  Files still with dynamic style={{}}: ${remaining.length}`);
if (remaining.length) {
    console.log("\nFiles with remaining dynamic styles (expected):");
    remaining.slice(0, 50).forEach((f) => console.log("  " + f));
}
